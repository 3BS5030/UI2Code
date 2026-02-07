import { RESPONSIVE_BREAKPOINTS } from "./viewports";
const VOID_TAGS = new Set([
  "area",
  "base",
  "br",
  "col",
  "embed",
  "hr",
  "img",
  "input",
  "link",
  "meta",
  "param",
  "source",
  "track",
  "wbr"
]);

const CONTAINER_TYPES = new Set([
  "div",
  "section",
  "article",
  "main",
  "nav",
  "header",
  "footer",
  "aside",
  "form",
  "ul",
  "ol",
  "li",
  "table",
  "thead",
  "tbody",
  "tfoot",
  "tr",
  "td",
  "th",
  "figure",
  "figcaption",
  "fieldset",
  "details"
]);

const SIZE_ON_CONTENT = new Set([
  "img",
  "image",
  "iframe",
  "video",
  "audio",
  "canvas",
  "svg"
]);

const toKebab = (value) =>
  value.replace(/[A-Z]/g, match => `-${match.toLowerCase()}`);

const styleObjToString = (styles = {}) => {
  return Object.entries(styles)
    .filter(([, v]) => v !== undefined && v !== null && v !== "")
    .map(([key, val]) => `${toKebab(key)}:${val}`)
    .join(";");
};

const styleObjToStringImportant = (styles = {}) => {
  return Object.entries(styles)
    .filter(([, v]) => v !== undefined && v !== null && v !== "")
    .map(([key, val]) => `${toKebab(key)}:${val} !important`)
    .join(";");
};

const attrsToString = (attrs = {}) => {
  return Object.entries(attrs)
    .filter(([, v]) => v !== undefined && v !== null && v !== "")
    .map(([key, val]) => {
      if (key === "className") return `class="${val}"`;
      return `${key}="${String(val)}"`;
    })
    .join(" ");
};

const escapeHtml = (value = "") =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

const normalizeTag = (tag) => {
  if (tag === "image") return "img";
  if (tag === "link") return "a";
  return tag || "div";
};

const buildAnimationStyle = (animation = {}) => {
  if (!animation || animation.name === "none") return {};
  return {
    animationName: animation.name,
    animationDuration: animation.duration || "1s",
    animationTimingFunction: animation.timing || "ease",
    animationDelay: animation.delay || "0s",
    animationIterationCount: animation.iteration || "1",
    animationDirection: animation.direction || "normal",
    animationFillMode: animation.fillMode || "both"
  };
};

const splitStyles = (styles = {}, elementType) => {
  const layoutKeys = new Set([
    "position",
    "left",
    "top",
    "right",
    "bottom",
    "display",
    "zIndex"
  ]);

  const sizeKeys = [
    "width",
    "height",
    "minWidth",
    "minHeight",
    "maxWidth",
    "maxHeight"
  ];

  const layout = {};
  const visual = {};

  Object.entries(styles).forEach(([key, value]) => {
    if (layoutKeys.has(key)) {
      layout[key] = value;
    } else if (sizeKeys.includes(key)) {
      if (SIZE_ON_CONTENT.has(elementType)) {
        visual[key] = value;
      } else {
        layout[key] = value;
      }
    } else {
      visual[key] = value;
    }
  });

  if (!layout.position && (layout.zIndex !== undefined && layout.zIndex !== "")) {
    layout.position = "relative";
  }

    if (!SIZE_ON_CONTENT.has(elementType)) {
      sizeKeys.forEach((key) => {
        if (layout[key] && !visual[key]) {
          visual[key] = layout[key];
        }
      });
      if (layout.width) visual.width = "100%";
      if (layout.height) visual.height = "100%";
      if ((layout.width || layout.height) && ["span","a","small","strong","em","mark","u","s","code"].includes(elementType)) {
        visual.display = "inline-block";
      }
    }
  if (SIZE_ON_CONTENT.has(elementType)) {
    const percentLike = (value) => typeof value === "string" && (value.includes("%") || value.includes("vw") || value.includes("vh"));
    if (visual.width && percentLike(visual.width)) {
      layout.width = visual.width;
      visual.width = "100%";
      if (!layout.display) layout.display = "block";
    }
    if (visual.height && percentLike(visual.height)) {
      layout.height = visual.height;
      visual.height = "100%";
      if (!layout.display) layout.display = "block";
    }
  }

  return { layout, visual };
};

export const generatePageParts = (page) => {
  if (!page) return { html: "", styleTag: "" };

  const elements = page.elements || [];
  const byParent = new Map();
  elements.forEach(el => {
    const key = el.parentId || "__root__";
    if (!byParent.has(key)) byParent.set(key, []);
    byParent.get(key).push(el);
  });

  const cssBlocks = [];
  const responsiveBlocks = [];

  const renderElement = (element) => {
    const tag = normalizeTag(element.type);
    const wrapperClass = `element-${element.id}`;

    const attrs = { ...(element.attrs || {}) };
    if (attrs.class) {
      attrs.className = attrs.className ? `${attrs.className} ${attrs.class}` : attrs.class;
      delete attrs.class;
    }

    const { layout, visual } = splitStyles(element.styles || {}, element.type || "div");

    const children = (byParent.get(element.id) || []).map(renderElement);
    const hasMultipleChildren = children.length > 1;
    const hasDisplayOverride = Object.prototype.hasOwnProperty.call(element.styles || {}, "display");

    if (CONTAINER_TYPES.has(tag) && hasMultipleChildren && !hasDisplayOverride) {
      if (!visual.display) visual.display = "grid";
      if (!visual.gridTemplateColumns) {
        visual.gridTemplateColumns = "repeat(auto-fit, minmax(160px, 1fr))";
      }
      if (!visual.gap) visual.gap = "12px";
    }

    if (CONTAINER_TYPES.has(tag) && !layout.position) {
      layout.position = "relative";
    }

    const wrapperStyles = {
      ...layout,
      ...buildAnimationStyle(element.animation)
    };

    const elementStyles = { ...visual };

    if (tag === "a") {
      const linkClass = attrs.className || "";
      if (!elementStyles.textDecoration && linkClass.includes("link-primary")) {
        elementStyles.textDecoration = "none";
      }
      if (element.props?.href) attrs.href = element.props.href;
      if (element.props?.target) attrs.target = element.props.target;
    }

    if (tag === "img") {
      if (element.props?.src) attrs.src = element.props.src;
      if (element.props?.alt) attrs.alt = element.props.alt;
    }

    if (tag === "iframe") {
      if (element.props?.src) attrs.src = element.props.src;
      if (element.props?.title) attrs.title = element.props.title;
    }

    const elementStyleString = styleObjToString(elementStyles);
    if (elementStyleString) attrs.style = elementStyleString;

    const elementAttrs = attrsToString(attrs);

    const pseudo = element.pseudoStyles || {};
    const hoverCss = styleObjToString(pseudo.hover || {});
    const activeCss = styleObjToString(pseudo.active || {});
    const focusCss = styleObjToString(pseudo.focus || {});

    if (hoverCss) cssBlocks.push(`.${wrapperClass}:hover{${hoverCss}}`);
    if (activeCss) cssBlocks.push(`.${wrapperClass}:active{${activeCss}}`);
    if (focusCss) cssBlocks.push(`.${wrapperClass}:focus{${focusCss}}`);

    const responsive = element.responsiveStyles || {};
    Object.keys(RESPONSIVE_BREAKPOINTS).forEach((key) => {
      const override = responsive[key];
      if (!override || Object.keys(override).length === 0) return;

      const bp = RESPONSIVE_BREAKPOINTS[key];
      const { layout: rLayout, visual: rVisual } = splitStyles(override, element.type || "div");
      const wrapperCss = styleObjToStringImportant(rLayout);
      const visualCss = styleObjToStringImportant(rVisual);

      if (wrapperCss) {
        responsiveBlocks.push(`@media ${bp.media}{.${wrapperClass}{${wrapperCss}}}`);
      }
      if (visualCss) {
        responsiveBlocks.push(`@media ${bp.media}{.${wrapperClass} > ${tag}{${visualCss}}}`);
      }
    });

    const wrapperStyleString = styleObjToString(wrapperStyles);
    const wrapperAttrs = wrapperStyleString
      ? `class="${wrapperClass}" style="${wrapperStyleString}"`
      : `class="${wrapperClass}"`;

    if (VOID_TAGS.has(tag)) {
      return `<div ${wrapperAttrs}><${tag}${elementAttrs ? " " + elementAttrs : ""} /></div>`;
    }

    const textContent = element.props?.text ?? "";
    return `<div ${wrapperAttrs}><${tag}${elementAttrs ? " " + elementAttrs : ""}>${escapeHtml(textContent)}${children.join("")}</${tag}></div>`;
  };

  const htmlInner = (byParent.get("__root__") || []).map(renderElement).join("\n");
  const baseCss = "body{margin:0;padding:0;} .page-root{position:relative;min-height:100vh;padding:24px;} .page-root *{box-sizing:border-box;}";
  const styleTag = cssBlocks.length || responsiveBlocks.length || baseCss
    ? `<style>${baseCss}${cssBlocks.join("")}${responsiveBlocks.join("")}</style>`
    : "";
  const html = `<div class="page-root">${htmlInner}</div>`;

  return { html, styleTag };
};

export const generatePageHtml = (page) => {
  if (!page) return "";

  const customCss = page.customCss || "";
  const customJs = page.customJs || "";
  const pageCssFiles = page.cssFiles || [];
  const pageJsFiles = page.jsFiles || [];
  const { html, styleTag } = generatePageParts(page);

  const bodyStyles = { ...(page.bodyStyles || {}) };
  const bodyResponsive = page.bodyResponsive || {};
  const hasAbsolute = (page.elements || []).some(el => (el.styles || {}).position === "absolute");
  if (hasAbsolute && !bodyStyles.position) {
    bodyStyles.position = "relative";
  }

  const bodyStyle = styleObjToString(bodyStyles);
  const bodyAttrs = attrsToString(page.bodyAttrs || {});
  const bodyResponsiveCss = Object.keys(RESPONSIVE_BREAKPOINTS).map((key) => {
    const override = bodyResponsive[key];
    if (!override || Object.keys(override).length === 0) return "";
    const bp = RESPONSIVE_BREAKPOINTS[key];
    const css = styleObjToStringImportant(override);
    return css ? `@media ${bp.media}{body{${css}}}` : "";
  }).join("");
  const fileCss = pageCssFiles.map(f => f.content || "").join("\n");
  const fileJs = pageJsFiles.map(f => f.content || "").join("\n");
  const allStyles = `${styleTag}${bodyResponsiveCss ? `<style>${bodyResponsiveCss}</style>` : ""}${fileCss ? `<style>${fileCss}</style>` : ""}${customCss ? `<style>${customCss}</style>` : ""}`;
  const scriptBody = [fileJs, customJs].filter(Boolean).join("\n");
  const scriptTag = scriptBody
    ? `<script>(function(){const pageRoot=document.querySelector(".page-root");try{\n${scriptBody}\n}catch(err){console.error("Custom JS error:",err);}})();</script>`
    : "";

  return `${allStyles}\n<body${bodyStyle || bodyAttrs ? " " : ""}${bodyAttrs}${bodyStyle ? `${bodyAttrs ? " " : ""}style=\"${bodyStyle}\"` : ""}>\n${html}\n${scriptTag}</body>`;
};
