import { RESPONSIVE_BREAKPOINTS } from "./viewports";
import { normalizePositionStyles, shouldKeepManualPosition } from "../utils/styleParser";
import { getEffectivePageElements } from "../utils/pageLayout";
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

const sanitizeRichHtml = (value = "") => {
  if (typeof document === "undefined") return String(value || "");
  const holder = document.createElement("div");
  holder.innerHTML = String(value || "");
  holder.querySelectorAll("script,style,iframe,object,embed").forEach((node) => node.remove());
  holder.querySelectorAll("*").forEach((node) => {
    Array.from(node.attributes || []).forEach((attr) => {
      const key = attr.name.toLowerCase();
      if (key.startsWith("on")) node.removeAttribute(attr.name);
    });
  });
  return holder.innerHTML;
};

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
    "margin",
    "marginTop",
    "marginRight",
    "marginBottom",
    "marginLeft",
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

const normalizeBorderValue = (value = "") =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");

const HELPER_DASHED_BORDERS = new Set([
  normalizeBorderValue("1px dashed #93c5fd"),
  normalizeBorderValue("1px dashed #86efac")
]);

const isHelperDashedBorder = (value) =>
  HELPER_DASHED_BORDERS.has(normalizeBorderValue(value));

export const buildSliderRuntimeScript = (elements = []) => {
  const hasSlider = (elements || []).some((el) => {
    const attrs = el?.attrs || {};
    return attrs["data-ui2-slider"] === "1" || attrs["data-slider-loop"] !== undefined;
  });
  if (!hasSlider) return "";

  return `
const __ui2SliderRoot = pageRoot || document;
const __ui2SliderRoots = Array.from(__ui2SliderRoot.querySelectorAll('[data-ui2-slider],[data-slider-loop]'));

const __ui2AsBool = (value, fallback) => {
  if (value === null || value === undefined || value === "") return fallback;
  const text = String(value).trim().toLowerCase();
  if (text === "true" || text === "1" || text === "yes" || text === "on") return true;
  if (text === "false" || text === "0" || text === "no" || text === "off") return false;
  return fallback;
};

const __ui2DirectChildren = (node) => Array.from(node?.children || []).filter((child) => child && child.nodeType === 1);
const __ui2Descendants = (node) => {
  if (!node || typeof node.querySelectorAll !== "function") return [];
  return Array.from(node.querySelectorAll("*")).filter((child) => child && child.nodeType === 1);
};
const __ui2OwnsNode = (slider, node) => {
  if (!slider || !node) return false;
  const owner = node.closest('[data-ui2-slider],[data-slider-loop]');
  return owner === slider;
};

const __ui2FindTrack = (slider) => {
  const explicit = __ui2Descendants(slider).find((node) => node.hasAttribute("data-ui2-slider-track") && __ui2OwnsNode(slider, node));
  if (explicit) return explicit;
  const descendants = __ui2Descendants(slider).filter((node) => __ui2OwnsNode(slider, node));
  const byTransform = descendants.find((child) => {
    const style = child.getAttribute("style") || "";
    const inlineTransform = child.style ? child.style.transform : "";
    return /translateX\\s*\\(/i.test(style) || /translateX\\s*\\(/i.test(inlineTransform || "");
  });
  if (byTransform) return byTransform;
  const byFlex = descendants.find((child) => {
    const style = window.getComputedStyle(child);
    return style.display.includes("flex") && child.children.length > 1;
  });
  return byFlex || null;
};

const __ui2FindSlides = (track) => {
  if (!track) return [];
  const marked = Array.from(track.querySelectorAll('[data-ui2-slider-slide]'));
  if (marked.length) return marked;
  return __ui2DirectChildren(track);
};

const __ui2FindArrow = (slider, key) => {
  const dataKey = key === "prev" ? "data-ui2-slider-prev" : "data-ui2-slider-next";
  const explicit = __ui2Descendants(slider).find((node) => node.hasAttribute(dataKey) && __ui2OwnsNode(slider, node));
  if (explicit) return explicit;
  const allButtons = __ui2Descendants(slider)
    .filter((node) => String(node.tagName || "").toLowerCase() === "button" && __ui2OwnsNode(slider, node));
  if (!allButtons.length) return null;
  const bySide = allButtons.find((btn) => {
    const style = window.getComputedStyle(btn);
    if (key === "prev") return style.left !== "auto";
    return style.right !== "auto";
  });
  if (bySide) return bySide;
  return key === "prev" ? allButtons[0] : allButtons[allButtons.length - 1];
};

const __ui2FindDots = (slider) => {
  const dotsWrap = __ui2Descendants(slider).find((node) => node.hasAttribute("data-ui2-slider-dots") && __ui2OwnsNode(slider, node));
  if (dotsWrap) {
    const explicitDots = Array.from(dotsWrap.querySelectorAll('[data-ui2-slider-dot]'));
    return explicitDots.length ? explicitDots : Array.from(dotsWrap.querySelectorAll('span'));
  }
  const descendants = __ui2Descendants(slider).filter((node) => __ui2OwnsNode(slider, node));
  const fallbackWrap = descendants.find((child) => child.querySelectorAll('span').length > 1);
  if (!fallbackWrap) return [];
  return Array.from(fallbackWrap.querySelectorAll('span'));
};

const __ui2InitSlider = (slider) => {
  if (!slider || slider.dataset.ui2SliderReady === "1") return;
  const track = __ui2FindTrack(slider);
  const slides = __ui2FindSlides(track);
  if (!track || slides.length <= 1) return;

  const prevBtn = __ui2FindArrow(slider, "prev");
  const nextBtn = __ui2FindArrow(slider, "next");
  const dots = __ui2FindDots(slider);
  const loop = __ui2AsBool(slider.getAttribute("data-slider-loop"), true);

  let index = 0;
  const total = slides.length;

  const setIndex = (nextIndex) => {
    if (loop) {
      index = (nextIndex + total) % total;
    } else {
      index = Math.max(0, Math.min(total - 1, nextIndex));
    }

    const shift = (index * 100) / total;
    track.style.transform = 'translateX(-' + shift + '%)';

    dots.forEach((dot, dotIndex) => {
      dot.style.backgroundColor = dotIndex === index ? "#2563eb" : "#94a3b8";
      dot.style.opacity = dotIndex === index ? "1" : "0.9";
      dot.style.cursor = "pointer";
    });

    if (!loop) {
      if (prevBtn) prevBtn.disabled = index === 0;
      if (nextBtn) nextBtn.disabled = index === total - 1;
    }
  };

  if (prevBtn) {
    prevBtn.style.cursor = "pointer";
    prevBtn.addEventListener("click", (event) => {
      event.preventDefault();
      setIndex(index - 1);
    });
  }

  if (nextBtn) {
    nextBtn.style.cursor = "pointer";
    nextBtn.addEventListener("click", (event) => {
      event.preventDefault();
      setIndex(index + 1);
    });
  }

  dots.forEach((dot, dotIndex) => {
    dot.addEventListener("click", (event) => {
      event.preventDefault();
      setIndex(dotIndex);
    });
  });

  slider.dataset.ui2SliderReady = "1";
  setIndex(0);
};

__ui2SliderRoots.forEach(__ui2InitSlider);
`;
};

const stripClassToken = (className = "", token = "") =>
  String(className || "")
    .split(/\s+/)
    .filter((part) => part && part !== token)
    .join(" ");

const promoteContainerDisplayToVisual = (layout, visual, styles, tag) => {
  if (!CONTAINER_TYPES.has(tag)) return;
  const hasDisplayOverride = Object.prototype.hasOwnProperty.call(styles || {}, "display");
  if (!hasDisplayOverride || !styles?.display) return;
  visual.display = styles.display;
  if (layout.display === styles.display) {
    delete layout.display;
  }
};

export const generatePageParts = (page, pages = []) => {
  if (!page) return { html: "", styleTag: "" };

  const sourcePages = Array.isArray(pages) && pages.length ? pages : [page];
  const elements = getEffectivePageElements(sourcePages, page);
  const byId = new Map(elements.map((item) => [item.id, item]));
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
    if ((tag === "a" || tag === "link") && attrs.className) {
      const cleaned = stripClassToken(attrs.className, "link-primary");
      if (cleaned) attrs.className = cleaned;
      else delete attrs.className;
    }

    const normalizedBaseStyles = normalizePositionStyles(
      element.styles || {},
      shouldKeepManualPosition(element)
    );
    const { layout, visual } = splitStyles(normalizedBaseStyles, element.type || "div");
    promoteContainerDisplayToVisual(layout, visual, normalizedBaseStyles, tag);
    if (isHelperDashedBorder(visual.border)) {
      delete visual.border;
    }

    const children = (byParent.get(element.id) || []).map(renderElement);
    const hasMultipleChildren = children.length > 1;
    const hasDisplayOverride = Object.prototype.hasOwnProperty.call(normalizedBaseStyles || {}, "display");

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
      if (!elementStyles.textDecoration && linkClass.includes("text-decoration-none")) {
        elementStyles.textDecoration = "none";
      }
      const parentType = byId.get(element.parentId)?.type || "";
      const normalizedColor = String(elementStyles.color || "").trim().toLowerCase();
      if (
        parentType === "nav" &&
        (!elementStyles.color || normalizedColor === "#2563eb" || normalizedColor === "#0f172a")
      ) {
        elementStyles.color = "inherit";
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
      const normalizedOverride = normalizePositionStyles(
        override,
        shouldKeepManualPosition(element)
      );
      const { layout: rLayout, visual: rVisual } = splitStyles(normalizedOverride, element.type || "div");
      promoteContainerDisplayToVisual(rLayout, rVisual, normalizedOverride, tag);
      if (isHelperDashedBorder(rVisual.border)) {
        delete rVisual.border;
      }
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
    const richHtml = typeof element.props?.html === "string"
      ? sanitizeRichHtml(element.props.html)
      : "";
    const contentHtml = (richHtml && tag !== "textarea")
      ? richHtml
      : escapeHtml(textContent).replace(/\n/g, "<br>");
    return `<div ${wrapperAttrs}><${tag}${elementAttrs ? " " + elementAttrs : ""}>${contentHtml}${children.join("")}</${tag}></div>`;
  };

  const htmlInner = (byParent.get("__root__") || []).map(renderElement).join("\n");
  const baseCss = "body{margin:0;padding:0;} .page-root{position:relative;min-height:100vh;} .page-root *{box-sizing:border-box;}";
  const styleTag = cssBlocks.length || responsiveBlocks.length || baseCss
    ? `<style>${baseCss}${cssBlocks.join("")}${responsiveBlocks.join("")}</style>`
    : "";
  const html = `<div class="page-root">${htmlInner}</div>`;

  return { html, styleTag };
};

export const generatePageHtml = (page, pages = []) => {
  if (!page) return "";

  const customCss = page.customCss || "";
  const customJs = page.customJs || "";
  const pageCssFiles = page.cssFiles || [];
  const pageJsFiles = page.jsFiles || [];
  const sourcePages = Array.isArray(pages) && pages.length ? pages : [page];
  const effectiveElements = getEffectivePageElements(sourcePages, page);
  const { html, styleTag } = generatePageParts(page, sourcePages);
  const sliderRuntimeJs = buildSliderRuntimeScript(effectiveElements);

  const bodyStyles = { ...(page.bodyStyles || {}) };
  const bodyResponsive = page.bodyResponsive || {};
  const hasAbsolute = effectiveElements.some((el) => {
    const normalized = normalizePositionStyles(el.styles || {}, shouldKeepManualPosition(el));
    return normalized.position === "absolute";
  });
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
  const scriptBody = [sliderRuntimeJs, fileJs, customJs].filter(Boolean).join("\n");
  const scriptTag = scriptBody
    ? `<script>(function(){const pageRoot=document.querySelector(".page-root");try{\n${scriptBody}\n}catch(err){console.error("Custom JS error:",err);}})();</script>`
    : "";

  return `${allStyles}\n<body${bodyStyle || bodyAttrs ? " " : ""}${bodyAttrs}${bodyStyle ? `${bodyAttrs ? " " : ""}style=\"${bodyStyle}\"` : ""}>\n${html}\n${scriptTag}</body>`;
};
