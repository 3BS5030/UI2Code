import JSZip from "jszip";
import { generatePageHtml, generatePageParts } from "./generator";
import { RESPONSIVE_BREAKPOINTS } from "./viewports";

const sanitizeRouteToFile = (route, fallback) => {
  if (!route || route === "/") return fallback;
  const clean = route.replace(/^\//, "").replace(/\/$/, "");
  return clean ? `${clean}.html` : fallback;
};

const downloadBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

const normalizePath = (p) => p.replace(/\\/g, "/");
const dirname = (p) => normalizePath(p).split("/").slice(0, -1).join("/");
const join = (...parts) => normalizePath(parts.join("/")).replace(/\/+/, "/");

const resolvePath = (baseDir, rel) => {
  if (rel.startsWith("/")) return rel.slice(1);
  const parts = join(baseDir, rel).split("/");
  const stack = [];
  parts.forEach(part => {
    if (!part || part === ".") return;
    if (part === "..") stack.pop();
    else stack.push(part);
  });
  return stack.join("/");
};

const relativePath = (fromFile, toFile) => {
  const fromDir = dirname(fromFile);
  const fromParts = fromDir ? fromDir.split("/") : [];
  const toParts = toFile.split("/");
  while (fromParts.length && toParts.length && fromParts[0] === toParts[0]) {
    fromParts.shift();
    toParts.shift();
  }
  const up = fromParts.map(() => "..");
  const rel = up.concat(toParts).join("/") || "./";
  return rel.startsWith(".") ? rel : `./${rel}`;
};

const withExt = (p, ext) => p.endsWith(ext) ? p : `${p}${ext}`;

const rewriteImports = (originalMap, newMap, pathMap) => {
  const updated = new Map();
  const pathMapReverse = new Map();
  pathMap.forEach((newPath, oldPath) => {
    pathMapReverse.set(oldPath, newPath);
  });

  newMap.forEach((content, newPath) => {
    if (!newPath.endsWith(".js") && !newPath.endsWith(".jsx")) {
      updated.set(newPath, content);
      return;
    }

    const oldPath = Array.from(pathMap.entries()).find(([, np]) => np === newPath)?.[0] || newPath;

    const next = content.replace(/from\s+["']([^"']+)["']/g, (m, spec) => {
      if (!spec.startsWith(".") && !spec.startsWith("/")) return m;

      const oldAbs = resolvePath(dirname(oldPath), spec);
      const candidates = [
        oldAbs,
        withExt(oldAbs, ".js"),
        withExt(oldAbs, ".jsx"),
        join(oldAbs, "index.js"),
        join(oldAbs, "index.jsx")
      ];

      const oldTarget = candidates.find(c => originalMap.has(c));
      if (!oldTarget) return m;

      const newTarget = pathMapReverse.get(oldTarget) || oldTarget;
      const rel = relativePath(newPath, newTarget);

      const hasExt = /\.(jsx?|tsx?)$/.test(spec);
      const relNoExt = rel.replace(/\.(jsx?|tsx?)$/, "");

      const finalSpec = hasExt ? rel : relNoExt;
      return `from "${finalSpec}"`;
    });

    updated.set(newPath, next);
  });

  return updated;
};

const sanitizeFileName = (name, fallback, ext) => {
  const raw = (name || fallback || "file").toString().trim();
  const safe = raw.replace(/[^a-z0-9-_]+/gi, "-").replace(/^-+|-+$/g, "").toLowerCase();
  const base = safe || fallback || "file";
  return base.endsWith(ext) ? base : `${base}${ext}`;
};

const escapeXml = (value = "") =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

const toKebab = (key = "") => key.replace(/[A-Z]/g, match => `-${match.toLowerCase()}`);

const styleObjToString = (styles = {}) => Object.entries(styles)
  .filter(([, v]) => v !== undefined && v !== null && v !== "")
  .map(([key, val]) => `${toKebab(key)}:${val}`)
  .join(";");

const styleObjToStringImportant = (styles = {}) => Object.entries(styles)
  .filter(([, v]) => v !== undefined && v !== null && v !== "")
  .map(([key, val]) => `${toKebab(key)}:${val} !important`)
  .join(";");

const attrsToString = (attrs = {}) => {
  const normalized = { ...(attrs || {}) };
  if ("class" in normalized && !normalized.className) {
    normalized.className = normalized.class;
    delete normalized.class;
  }
  if ("style" in normalized) delete normalized.style;

  return Object.entries(normalized)
    .filter(([, v]) => v !== undefined && v !== null && v !== "")
    .map(([key, val]) => {
      const attr = key === "className" ? "class" : key;
      return `${attr}="${escapeXml(String(val))}"`;
    })
    .join(" ");
};

const toSvgDataUrl = (svgString) => {
  const encoded = encodeURIComponent(svgString)
    .replace(/%0A/g, "")
    .replace(/%20/g, " ");
  return `data:image/svg+xml;charset=utf-8,${encoded}`;
};

const buildBodyResponsiveCss = (page = {}) => {
  const bodyResponsive = page.bodyResponsive || {};
  return Object.keys(RESPONSIVE_BREAKPOINTS).map((key) => {
    const override = bodyResponsive[key];
    if (!override || Object.keys(override).length === 0) return "";
    const bp = RESPONSIVE_BREAKPOINTS[key];
    const css = styleObjToStringImportant(override);
    return css ? `@media ${bp.media}{.image-export-body{${css}}}` : "";
  }).join("");
};

const buildPageImageMarkup = (page, globalCssText = "") => {
  const { html, styleTag } = generatePageParts(page);
  const pageCss = (page.cssFiles || []).map(f => f.content || "").join("\n");
  const customCss = page.customCss || "";

  const hasAbsolute = (page.elements || []).some(el => (el.styles || {}).position === "absolute");
  const bodyStyles = { ...(page.bodyStyles || {}) };
  if (hasAbsolute && !bodyStyles.position) bodyStyles.position = "relative";
  if (!bodyStyles.minHeight) bodyStyles.minHeight = "100vh";

  const responsiveBodyCss = buildBodyResponsiveCss(page);
  const scopedStyleTag = (styleTag || "").replace(/body\s*\{/g, ".image-export-body{");
  const extraStyle = [globalCssText, pageCss, customCss].filter(Boolean).join("\n");
  const bodyAttrsRaw = { ...(page.bodyAttrs || {}) };
  const extraClass = bodyAttrsRaw.className || bodyAttrsRaw.class || "";
  if ("className" in bodyAttrsRaw) delete bodyAttrsRaw.className;
  if ("class" in bodyAttrsRaw) delete bodyAttrsRaw.class;

  const bodyAttrs = attrsToString(bodyAttrsRaw);
  const bodyStyle = styleObjToString(bodyStyles);
  const finalAttrs = [
    `class="${escapeXml(["image-export-body", extraClass].filter(Boolean).join(" "))}"`,
    bodyStyle ? `style="${escapeXml(bodyStyle)}"` : "",
    bodyAttrs
  ].filter(Boolean).join(" ");

  return `
    ${scopedStyleTag}
    ${responsiveBodyCss ? `<style>${responsiveBodyCss}</style>` : ""}
    ${extraStyle ? `<style>${extraStyle}</style>` : ""}
    <div ${finalAttrs}>
      ${html}
    </div>
  `;
};

const measureExportHeight = (markup, width) => {
  const host = document.createElement("div");
  host.style.position = "fixed";
  host.style.left = "-99999px";
  host.style.top = "0";
  host.style.width = `${Math.max(1, Math.round(width))}px`;
  host.style.visibility = "hidden";
  host.style.pointerEvents = "none";
  host.style.zIndex = "-1";
  host.innerHTML = markup;
  document.body.appendChild(host);

  const node = host.querySelector(".image-export-body");
  const measured = node
    ? Math.max(node.scrollHeight, node.offsetHeight, Math.ceil(node.getBoundingClientRect().height))
    : host.scrollHeight;

  host.remove();
  return Math.max(1, Math.ceil(measured || 1));
};

const buildSvgFromMarkup = (markup, width, height) => {
  const safeWidth = Math.max(1, Math.round(width));
  const safeHeight = Math.max(1, Math.round(height));
  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${safeWidth}" height="${safeHeight}" viewBox="0 0 ${safeWidth} ${safeHeight}">
  <foreignObject width="100%" height="100%">
    <div xmlns="http://www.w3.org/1999/xhtml" style="width:${safeWidth}px;height:${safeHeight}px;overflow:hidden;">
      ${markup}
    </div>
  </foreignObject>
</svg>`;
};

const renderSvgToPngBlob = (svgString, width, height, pixelRatio = 2) => new Promise((resolve, reject) => {
  const canvas = document.createElement("canvas");
  const ratio = Math.max(1, Math.min(4, Number(pixelRatio) || 2));
  canvas.width = Math.max(1, Math.round(width * ratio));
  canvas.height = Math.max(1, Math.round(height * ratio));

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    reject(new Error("Canvas rendering is not available."));
    return;
  }

  const image = new Image();
  image.onload = () => {
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.drawImage(image, 0, 0, width, height);
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("Failed to generate PNG blob."));
        return;
      }
      resolve(blob);
    }, "image/png");
  };
  image.onerror = () => reject(new Error("Failed to render SVG to PNG."));
  image.src = toSvgDataUrl(svgString);
});

export const exportPageZip = async (page) => {
  const zip = new JSZip();
  const html = generatePageHtml(page);
  const fileName = sanitizeRouteToFile(page.route, "index.html");
  zip.file(fileName, html);

  const blob = await zip.generateAsync({ type: "blob" });
  downloadBlob(blob, `page-${fileName.replace(/\.html$/, "")}.zip`);
};

export const exportPageImage = async (
  page,
  {
    format = "png",
    width = 1200,
    pixelRatio = 2,
    globalCssText = ""
  } = {}
) => {
  if (!page) throw new Error("No page selected.");

  const safeFormat = String(format).toLowerCase() === "svg" ? "svg" : "png";
  const safeWidth = Math.max(1, Math.round(Number(width) || 1200));
  const markup = buildPageImageMarkup(page, globalCssText);
  const height = measureExportHeight(markup, safeWidth);
  const svgString = buildSvgFromMarkup(markup, safeWidth, height);
  const base = sanitizeRouteToFile(page.route, "page").replace(/\.html$/, "");

  if (safeFormat === "svg") {
    const svgBlob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
    downloadBlob(svgBlob, `${base}.svg`);
    return;
  }

  const pngBlob = await renderSvgToPngBlob(svgString, safeWidth, height, pixelRatio);
  downloadBlob(pngBlob, `${base}.png`);
};

const buildReactProjectFiles = (pages, globalCssFiles = [], globalJsFiles = []) => {
  const files = new Map();
  const pageImports = [];
  const pageRoutes = [];
  const globalCssImports = [];
  const globalJsImports = [];

  globalCssFiles.forEach((file, index) => {
    const filename = sanitizeFileName(file.name, `global-${index + 1}`, ".css");
    const path = `src/styles/${filename}`;
    files.set(path, file.content || "");
    globalCssImports.push(`import "./styles/${filename}";`);
  });

  globalJsFiles.forEach((file, index) => {
    const filename = sanitizeFileName(file.name, `global-${index + 1}`, ".js");
    const path = `src/scripts/${filename}`;
    files.set(path, file.content || "");
    globalJsImports.push(`import "./scripts/${filename}";`);
  });

  pages.forEach((page, index) => {
    const safeName = `Page${index + 1}`;
    const { html, styleTag } = generatePageParts(page);
    const customJs = page.customJs || "";
    const pageCssFiles = page.cssFiles || [];
    const pageJsFiles = page.jsFiles || [];

    const pageCssImports = [];
    pageCssFiles.forEach((file, fIndex) => {
      const filename = sanitizeFileName(file.name, `${safeName}-${fIndex + 1}`, ".css");
      const path = `src/pages/${filename}`;
      files.set(path, file.content || "");
      pageCssImports.push(`import "./${filename}";`);
    });

    const pageJsImports = [];
    pageJsFiles.forEach((file, fIndex) => {
      const filename = sanitizeFileName(file.name, `${safeName}-${fIndex + 1}`, ".js");
      const path = `src/pages/${filename}`;
      files.set(path, file.content || "");
      pageJsImports.push(`import "./${filename}";`);
    });

    const component = `import React, { useEffect, useRef } from "react";\n${pageCssImports.join("\n")}\n${pageJsImports.join("\n")}\n\nexport default function ${safeName}() {\n  const rootRef = useRef(null);\n  const customJs = ${JSON.stringify(customJs)};\n\n  useEffect(() => {\n    if (!customJs) return;\n    const pageRoot = rootRef.current?.querySelector(\".page-root\") || rootRef.current;\n    try {\n      const fn = new Function(\"pageRoot\", \"document\", \"window\", customJs);\n      const cleanup = fn(pageRoot, document, window);\n      if (typeof cleanup === \"function\") return cleanup;\n    } catch (err) {\n      console.error(\"Custom JS error:\", err);\n    }\n  }, [customJs]);\n\n  return (\n    <div ref={rootRef}>\n      ${styleTag ? styleTag : ""}\n      <div dangerouslySetInnerHTML={{ __html: ${JSON.stringify(html)} }} />\n    </div>\n  );\n}\n`;

    files.set(`src/pages/${safeName}.jsx`, component);
    pageImports.push(`import ${safeName} from "./pages/${safeName}";`);
    pageRoutes.push(`{ path: "${page.route}", element: <${safeName} /> }`);
  });

  const appJs = `import React from "react";\nimport { BrowserRouter, Routes, Route } from "react-router-dom";\n${globalCssImports.join("\n")}\n${globalJsImports.join("\n")}\n${pageImports.join("\n")}\n\nexport default function App() {\n  return (\n    <BrowserRouter>\n      <Routes>\n        ${pageRoutes.map(r => `<Route ${r} />`).join("\\n        ")}\n        <Route path=\"*\" element={<div>Not Found</div>} />\n      </Routes>\n    </BrowserRouter>\n  );\n}\n`;

  files.set("src/App.js", appJs);

  const indexJs = `import React from "react";\nimport ReactDOM from "react-dom/client";\nimport App from "./App";\n\nconst root = ReactDOM.createRoot(document.getElementById("root"));\nroot.render(<App />);\n`;
  files.set("src/index.js", indexJs);

  const publicIndex = `<!doctype html>\n<html lang=\"en\">\n  <head>\n    <meta charset=\"utf-8\" />\n    <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\" />\n    <title>Exported Project</title>\n  </head>\n  <body>\n    <div id=\"root\"></div>\n  </body>\n</html>\n`;
  files.set("public/index.html", publicIndex);

  const packageJson = {
    name: "exported-ui",
    private: true,
    version: "0.1.0",
    dependencies: {
      react: "^18.2.0",
      "react-dom": "^18.2.0",
      "react-router-dom": "^6.23.1"
    },
    scripts: {
      start: "react-scripts start",
      build: "react-scripts build"
    }
  };
  files.set("package.json", JSON.stringify(packageJson, null, 2));

  return files;
};

export const exportProjectZip = async (pages, globalCssFiles = [], globalJsFiles = []) => {
  const files = buildReactProjectFiles(pages, globalCssFiles, globalJsFiles);
  const pathMap = new Map();
  files.forEach((_, path) => pathMap.set(path, path));
  await exportProjectZipFromFiles(files, files, pathMap, "react-project.zip");
};

export const exportProjectZipFromFiles = async (newFiles, originalFiles, pathMap, filename = "react-project.zip") => {
  const zip = new JSZip();

  const rewritten = rewriteImports(originalFiles, newFiles, pathMap);

  rewritten.forEach((content, path) => {
    zip.file(path, content);
  });

  const blob = await zip.generateAsync({ type: "blob" });
  downloadBlob(blob, filename);
};

export { buildReactProjectFiles };
