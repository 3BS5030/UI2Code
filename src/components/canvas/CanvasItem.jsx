import React, { useRef, useState } from "react";
import { useBuilderStore } from "../../store/builderStore";
import { useEffect } from "react";
import { normalizePositionStyles, shouldKeepManualPosition } from "../../utils/styleParser";

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

const DEFAULT_DISPLAY = {
  block: new Set([
    "div",
    "section",
    "article",
    "header",
    "footer",
    "main",
    "nav",
    "ul",
    "ol",
    "li",
    "p",
    "h1",
    "h2",
    "h3",
    "table",
    "form",
    "figure",
    "figcaption",
    "blockquote"
  ]),
  inline: new Set([
    "span",
    "a",
    "small",
    "strong",
    "em",
    "mark",
    "u",
    "s",
    "code"
  ]),
  inlineBlock: new Set([
    "img",
    "input",
    "button",
    "textarea",
    "select",
    "iframe",
    "label"
  ])
};

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

const toKebab = (value) =>
  value.replace(/[A-Z]/g, match => `-${match.toLowerCase()}`);

const styleObjToCss = (styles = {}) => {
  return Object.entries(styles)
    .filter(([, v]) => v !== undefined && v !== null && v !== "")
    .map(([key, val]) => `${toKebab(key)}:${val};`)
    .join("");
};

const escapeHtml = (value = "") =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

const textToRichHtml = (value = "") =>
  escapeHtml(String(value)).replace(/\n/g, "<br>");

const richHtmlToPlainText = (html = "") => {
  if (typeof document === "undefined") return String(html).replace(/<br\s*\/?>/gi, "\n");
  const holder = document.createElement("div");
  holder.innerHTML = String(html || "");
  return holder.innerText || holder.textContent || "";
};

const sanitizeRichHtml = (html = "") => {
  if (typeof document === "undefined") return String(html || "");
  const holder = document.createElement("div");
  holder.innerHTML = String(html || "");

  holder.querySelectorAll("script,style,iframe,object,embed").forEach((node) => node.remove());
  holder.querySelectorAll("*").forEach((node) => {
    const attrs = Array.from(node.attributes || []);
    attrs.forEach((attr) => {
      const name = attr.name.toLowerCase();
      if (name.startsWith("on")) {
        node.removeAttribute(attr.name);
        return;
      }
      if (name === "style") {
        const safeValue = String(attr.value || "")
          .replace(/expression\s*\([^)]*\)/gi, "")
          .replace(/url\s*\(\s*['"]?\s*javascript:[^)]+\)/gi, "");
        node.setAttribute("style", safeValue);
      }
    });
  });

  return holder.innerHTML;
};

const SIZE_ON_CONTENT = new Set([
  "img",
  "image",
  "iframe",
  "video",
  "audio",
  "canvas",
  "svg"
]);

const parseLengthValue = (value) => {
  if (value === undefined || value === null || value === "") return null;
  const parsed = typeof value === "number" ? value : parseFloat(String(value));
  return Number.isFinite(parsed) ? parsed : null;
};

const parseNumericWithUnit = (value, fallbackValue = "", fallbackUnit = "px") => {
  if (value === undefined || value === null || value === "") {
    return { value: fallbackValue, unit: fallbackUnit };
  }
  if (typeof value === "number") {
    return { value: String(value), unit: fallbackUnit };
  }
  const text = String(value).trim();
  const match = text.match(/^(-?\d*\.?\d+)\s*([a-z%]*)$/i);
  if (!match) return { value: fallbackValue, unit: fallbackUnit };
  return {
    value: match[1],
    unit: match[2] || fallbackUnit
  };
};

const normalizeHexColor = (value, fallback = "#111827") => {
  const text = String(value || "").trim();
  const hex3 = /^#([0-9a-f]{3})$/i;
  const hex6 = /^#([0-9a-f]{6})$/i;
  const asHex3 = text.match(hex3);
  if (asHex3) {
    const [r, g, b] = asHex3[1].split("");
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
  }
  if (hex6.test(text)) return text.toLowerCase();
  return fallback;
};

const stripClassToken = (className = "", token = "") =>
  String(className || "")
    .split(/\s+/)
    .filter((part) => part && part !== token)
    .join(" ");

const parseMarginShorthand = (value, side) => {
  if (typeof value !== "string") return null;
  const parts = value.trim().split(/\s+/);
  if (parts.length === 0) return null;
  const [top, right = top, bottom = top, left = right] = parts;
  const bySide = { top, right, bottom, left };
  return parseLengthValue(bySide[side]);
};

const readMarginSide = (styles = {}, side) => {
  const sideKey = `margin${side[0].toUpperCase()}${side.slice(1)}`;
  const sideVal = parseLengthValue(styles[sideKey]);
  if (sideVal !== null) return sideVal;
  const shorthandVal = parseMarginShorthand(styles.margin, side);
  if (shorthandVal !== null) return shorthandVal;
  return 0;
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

  if (!layout.display) {
    if (DEFAULT_DISPLAY.block.has(elementType)) {
      layout.display = "block";
    } else if (DEFAULT_DISPLAY.inline.has(elementType)) {
      layout.display = "inline";
    } else if (DEFAULT_DISPLAY.inlineBlock.has(elementType)) {
      layout.display = "inline-block";
    } else {
      layout.display = "inline-block";
    }
  }

  if (!layout.position && (layout.zIndex !== undefined && layout.zIndex !== "")) {
    layout.position = "relative";
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

const isInternalRoute = (href) => {
  if (!href) return false;
  if (href.startsWith("http://") || href.startsWith("https://")) return false;
  if (href.startsWith("mailto:") || href.startsWith("tel:")) return false;
  return href.startsWith("/");
};

const isDescendant = (elements, parentId, childId) => {
  let current = elements.find(e => e.id === childId);
  while (current && current.parentId) {
    if (current.parentId === parentId) return true;
    current = elements.find(e => e.id === current.parentId);
  }
  return false;
};

const isConnectedToRoot = (byId, id) => {
  let current = byId.get(id);
  const visited = new Set();
  while (current) {
    if (visited.has(current.id)) return false;
    visited.add(current.id);
    if (current.parentId === null || current.parentId === undefined) return true;
    current = byId.get(current.parentId);
  }
  return false;
};

export default function CanvasItem({ element, elements, onSelect, previewMode = false, readOnly = false }) {
  const selectedElementId = useBuilderStore(state => state.selectedElementId);
  const updateProps = useBuilderStore(state => state.updateProps);
  const updateStyles = useBuilderStore(state => state.updateStyles);
  const updateResponsiveStyles = useBuilderStore(state => state.updateResponsiveStyles);
  const updateBodyStyles = useBuilderStore(state => state.updateBodyStyles);
  const updateBodyResponsiveStyles = useBuilderStore(state => state.updateBodyResponsiveStyles);
  const pages = useBuilderStore(state => state.pages);
  const currentPageId = useBuilderStore(state => state.currentPageId);
  const viewportKey = useBuilderStore(state => state.viewportKey);
  const autoExpandBody = useBuilderStore(state => state.autoExpandBody);
  const selectPage = useBuilderStore(state => state.selectPage);
  const highlightContainerId = useBuilderStore(state => state.highlightContainerId);
  const setElementParent = useBuilderStore(state => state.setElementParent);
  const setElementLock = useBuilderStore(state => state.setElementLock);
  const itemRef = useRef(null);
  const inlineEditorRef = useRef(null);
  const savedRangeRef = useRef(null);
  const quickMenuRef = useRef(null);
  const dragRef = useRef({
    dragging: false,
    startX: 0,
    startY: 0,
    startMarginLeft: 0,
    startMarginTop: 0
  });
  const resizeRef = useRef({
    resizing: false,
    startX: 0,
    startY: 0,
    startWidth: 0,
    startHeight: 0
  });

  const [showMenu, setShowMenu] = useState(false);
  const [isEditingInline, setIsEditingInline] = useState(false);
  const [inlineHtml, setInlineHtml] = useState(
    sanitizeRichHtml(String(element.props?.html ?? textToRichHtml(element.props?.text ?? "")))
  );
  const [toolbarTextColor, setToolbarTextColor] = useState("#111827");
  const [toolbarBgColor, setToolbarBgColor] = useState("#fef08a");
  const [toolbarFontFamily, setToolbarFontFamily] = useState("inherit");
  const [toolbarFontSize, setToolbarFontSize] = useState("16");
  const [toolbarBlock, setToolbarBlock] = useState("p");
  const [toolbarInlineTag, setToolbarInlineTag] = useState("span");
  const [quickStyleMenu, setQuickStyleMenu] = useState({ open: false, x: 0, y: 0 });
  const [quickDraft, setQuickDraft] = useState({
    textColor: "#111827",
    bgColor: "#ffffff",
    fontWeight: "normal",
    textAlign: "left",
    display: "",
    fontSizeValue: "16",
    fontSizeUnit: "px",
    paddingValue: "",
    paddingUnit: "px",
    marginValue: "",
    marginUnit: "px",
    radiusValue: "",
    radiusUnit: "px",
    gapValue: "",
    gapUnit: "px"
  });
  const currentElementHtml = sanitizeRichHtml(
    String(element.props?.html ?? textToRichHtml(element.props?.text ?? ""))
  );

  const makeQuickDraftFromStyles = (styles = {}) => {
    const fontSize = parseNumericWithUnit(styles.fontSize, "16", "px");
    const padding = parseNumericWithUnit(styles.padding, "", "px");
    const margin = parseNumericWithUnit(styles.margin, "", "px");
    const radius = parseNumericWithUnit(styles.borderRadius, "", "px");
    const gap = parseNumericWithUnit(styles.gap, "", "px");

    return {
      textColor: normalizeHexColor(styles.color, "#111827"),
      bgColor: normalizeHexColor(styles.backgroundColor, "#ffffff"),
      fontWeight: String(styles.fontWeight || "normal"),
      textAlign: String(styles.textAlign || "left"),
      display: String(styles.display || ""),
      fontSizeValue: fontSize.value,
      fontSizeUnit: fontSize.unit,
      paddingValue: padding.value,
      paddingUnit: padding.unit,
      marginValue: margin.value,
      marginUnit: margin.unit,
      radiusValue: radius.value,
      radiusUnit: radius.unit,
      gapValue: gap.value,
      gapUnit: gap.unit
    };
  };

  const elementType = element.type || "div";
  const isSelected = selectedElementId === element.id;
  const hasTextProp = Object.prototype.hasOwnProperty.call(element.props || {}, "text");
  const canInlineEdit = !previewMode
    && !readOnly
    && hasTextProp
    && elementType !== "input"
    && elementType !== "textarea";

  useEffect(() => {
    setInlineHtml(currentElementHtml);
    setIsEditingInline(false);
  }, [element.id, currentElementHtml]);

  useEffect(() => {
    if (!isEditingInline) {
      setInlineHtml(currentElementHtml);
    }
  }, [currentElementHtml, isEditingInline]);

  useEffect(() => {
    if (!isEditingInline || !inlineEditorRef.current) return;
    inlineEditorRef.current.innerHTML = inlineHtml;
    inlineEditorRef.current.focus();
    const range = document.createRange();
    range.selectNodeContents(inlineEditorRef.current);
    range.collapse(false);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
    try {
      savedRangeRef.current = range.cloneRange();
    } catch {
      savedRangeRef.current = null;
    }
  }, [isEditingInline, inlineHtml]);

  useEffect(() => {
    if (!isSelected) {
      setQuickStyleMenu((prev) => (prev.open ? { ...prev, open: false } : prev));
    }
  }, [isSelected]);

  useEffect(() => {
    if (!quickStyleMenu.open) return;

    const isEventInsideMenu = (event) => {
      const menuNode = quickMenuRef.current;
      if (!menuNode) return false;
      if (typeof event.composedPath === "function") {
        return event.composedPath().includes(menuNode);
      }
      return menuNode.contains(event.target);
    };

    const handleGlobalClick = (event) => {
      if (isEventInsideMenu(event)) return;
      setQuickStyleMenu((prev) => (prev.open ? { ...prev, open: false } : prev));
    };

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setQuickStyleMenu((prev) => (prev.open ? { ...prev, open: false } : prev));
      }
    };

    window.addEventListener("click", handleGlobalClick);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("click", handleGlobalClick);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [quickStyleMenu.open]);

  const applyStylePatch = (patch = {}) => {
    if (!patch || typeof patch !== "object") return;
    if (viewportKey === "base") {
      updateStyles(element.id, patch);
    } else {
      updateResponsiveStyles(element.id, viewportKey, patch);
    }
  };

  const toUnitValue = (value, unit = "px") => {
    if (value === undefined || value === null || value === "") return "";
    const num = parseFloat(String(value));
    if (!Number.isFinite(num)) return null;
    return `${num}${unit || "px"}`;
  };

  const updateQuickDraftField = (field, value, patchFactory = null) => {
    setQuickDraft((prev) => {
      const next = { ...prev, [field]: value };
      if (typeof patchFactory === "function") {
        const patch = patchFactory(next);
        if (patch) applyStylePatch(patch);
      }
      return next;
    });
  };

  const closeQuickStyleMenu = () => {
    setQuickStyleMenu((prev) => (prev.open ? { ...prev, open: false } : prev));
  };

  const handleClick = (e) => {
    if (previewMode || readOnly) return;
    if (isEditingInline) return;
    if (e.target.closest(".canvas-item") !== e.currentTarget) return;
    if (element.type === "link" || element.type === "a") {
      e.preventDefault();
      e.stopPropagation();
    }
    onSelect(element.id);
  };

  const handleContextMenu = (e) => {
    if (previewMode || readOnly || isEditingInline) return;
    e.preventDefault();
    e.stopPropagation();
    onSelect(element.id);
    setShowMenu(false);

    const activeResponsiveStyles = element.responsiveStyles?.[viewportKey] || {};
    const activeRawStyles = viewportKey === "base"
      ? (element.styles || {})
      : { ...(element.styles || {}), ...activeResponsiveStyles };
    const normalized = normalizePositionStyles(
      activeRawStyles,
      shouldKeepManualPosition(element)
    );
    setQuickDraft(makeQuickDraftFromStyles(normalized));

    const estimatedWidth = 320;
    const estimatedHeight = 410;
    const maxX = Math.max(12, window.innerWidth - estimatedWidth - 12);
    const maxY = Math.max(12, window.innerHeight - estimatedHeight - 12);
    const nextX = Math.min(Math.max(12, e.clientX), maxX);
    const nextY = Math.min(Math.max(12, e.clientY), maxY);
    setQuickStyleMenu({ open: true, x: nextX, y: nextY });
  };

  const handleMouseDown = (e) => {
    if (previewMode || readOnly) return;
    if (isEditingInline) return;
    if (e.button !== 0) return;
    if (e.target.closest(".canvas-item") !== e.currentTarget) return;
    if (e.target?.closest?.(".element-attach")) return;
    if (e.target?.closest?.(".element-lock")) return;
    e.preventDefault();
    e.stopPropagation();

    closeQuickStyleMenu();
    onSelect(element.id);

    const node = itemRef.current;
    if (!node) return;

    const responsiveStyles = element.responsiveStyles?.[viewportKey] || {};
    const activeStyles = viewportKey === "base"
      ? (element.styles || {})
      : { ...(element.styles || {}), ...responsiveStyles };
    const normalizedActiveStyles = normalizePositionStyles(
      activeStyles,
      shouldKeepManualPosition(element)
    );
    const currentMarginLeft = readMarginSide(normalizedActiveStyles, "left");
    const currentMarginTop = readMarginSide(normalizedActiveStyles, "top");

    dragRef.current = {
      dragging: true,
      startX: e.clientX,
      startY: e.clientY,
      startMarginLeft: currentMarginLeft,
      startMarginTop: currentMarginTop
    };

    const onMove = (moveEvent) => {
      if (!dragRef.current.dragging) return;

      const dx = moveEvent.clientX - dragRef.current.startX;
      const dy = moveEvent.clientY - dragRef.current.startY;

      const nextLeft = dragRef.current.startMarginLeft + dx;
      const nextTop = dragRef.current.startMarginTop + dy;

      const clampedLeft = Math.max(0, nextLeft);
      const clampedTop = Math.max(0, nextTop);

      const nextStyles = {
        position: "",
        left: "",
        top: "",
        right: "",
        bottom: "",
        marginLeft: `${Math.round(clampedLeft)}px`,
        marginTop: `${Math.round(clampedTop)}px`
      };

      if (viewportKey === "base") {
        updateStyles(element.id, nextStyles);
      } else {
        updateResponsiveStyles(element.id, viewportKey, nextStyles);
      }

      if (!element.parentId && autoExpandBody) {
        const parentNow = node.offsetParent || document.body;
        const parentNowRect = parentNow?.getBoundingClientRect();
        const nodeRect = node.getBoundingClientRect();
        const neededHeight = parentNowRect
          ? Math.ceil((nodeRect.bottom - parentNowRect.top) + 40)
          : Math.ceil(nodeRect.bottom + 40);
        const nextBody = {};
        if (Number.isFinite(neededHeight)) nextBody.minHeight = `max(100vh, ${neededHeight}px)`;

        if (Object.keys(nextBody).length) {
          if (viewportKey === "base") updateBodyStyles(nextBody);
          else updateBodyResponsiveStyles(viewportKey, nextBody);
        }
      }
    };

    const onUp = () => {
      dragRef.current.dragging = false;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  const handleResizeDown = (axis = "both") => (e) => {
    if (previewMode || readOnly) return;
    if (isEditingInline) return;
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();

    const node = itemRef.current;
    if (!node) return;

    const rect = node.getBoundingClientRect();

    resizeRef.current = {
      resizing: true,
      startX: e.clientX,
      startY: e.clientY,
      startWidth: rect.width,
      startHeight: rect.height
    };

    const onMove = (moveEvent) => {
      if (!resizeRef.current.resizing) return;

      const dx = moveEvent.clientX - resizeRef.current.startX;
      const dy = moveEvent.clientY - resizeRef.current.startY;

      const widthDelta = axis === "y" ? 0 : dx;
      const heightDelta = axis === "x" ? 0 : dy;

      const nextWidth = Math.max(20, resizeRef.current.startWidth + widthDelta);
      const nextHeight = Math.max(20, resizeRef.current.startHeight + heightDelta);

      const parentNode = node.offsetParent || node.parentElement;
      const parentRect = parentNode?.getBoundingClientRect();

      if (parentRect && parentRect.width > 0 && parentRect.height > 0) {
        const widthPct = Math.max(1, Number(((nextWidth / parentRect.width) * 100).toFixed(2)));
        const heightPct = Math.max(1, Number(((nextHeight / parentRect.height) * 100).toFixed(2)));
        const nextStyles = {};

        if (axis !== "y") {
          nextStyles.width = `${widthPct}%`;
        }
        if (axis !== "x") {
          nextStyles.height = `${heightPct}%`;
          nextStyles.minHeight = `${Math.round(nextHeight)}px`;
        }

        if (Object.keys(nextStyles).length) {
          if (viewportKey === "base") {
            updateStyles(element.id, nextStyles);
          } else {
            updateResponsiveStyles(element.id, viewportKey, nextStyles);
          }
        }
      }

      if (axis !== "x" && !element.parentId && node?.offsetParent && autoExpandBody) {
        const parentRectNow = node.offsetParent.getBoundingClientRect();
        const nodeRect = node.getBoundingClientRect();
        const bottom = nodeRect.bottom - parentRectNow.top;
        const scrollHeight = node.offsetParent.scrollHeight || 0;
        const needed = Math.ceil(Math.max(bottom, scrollHeight) + 40);
        const nextBody = {};
        if (Number.isFinite(needed)) nextBody.minHeight = `max(100vh, ${needed}px)`;
        if (Object.keys(nextBody).length) {
          if (viewportKey === "base") {
            updateBodyStyles(nextBody);
          } else {
            updateBodyResponsiveStyles(viewportKey, nextBody);
          }
        }
      }
    };

    const onUp = () => {
      resizeRef.current.resizing = false;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  const handleLinkClick = (e) => {
    const href = element.props?.href || "";
    if (!isInternalRoute(href)) return;

    const targetPage = pages.find(p => p.route === href);
    if (!targetPage) return;

    e.preventDefault();
    e.stopPropagation();
    if (previewMode) {
      selectPage(targetPage.id);
    }
  };

  const handleToggleLock = (e) => {
    if (readOnly) return;
    e.preventDefault();
    e.stopPropagation();
    setElementLock(element.id, !element.lockedToParent);
  };

  const handleDetach = (e) => {
    if (readOnly) return;
    e.preventDefault();
    e.stopPropagation();
    setElementParent(element.id, null);
    setElementLock(element.id, false);
    setShowMenu(false);
  };

  const handleAttachTo = (targetId) => (e) => {
    if (readOnly) return;
    e.preventDefault();
    e.stopPropagation();
    setElementParent(element.id, targetId);
    setElementLock(element.id, true);
    setShowMenu(false);
  };

  const startInlineEdit = (e) => {
    if (!canInlineEdit) return;
    e.preventDefault();
    e.stopPropagation();
    onSelect(element.id);
    setShowMenu(false);
    closeQuickStyleMenu();
    setInlineHtml(currentElementHtml);
    setIsEditingInline(true);
  };

  const getSelectionRangeInEditor = () => {
    const editor = inlineEditorRef.current;
    if (!editor) return null;
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return null;
    const range = selection.getRangeAt(0);
    if (!editor.contains(range.commonAncestorContainer)) return null;
    return range;
  };

  const saveEditorSelection = () => {
    const range = getSelectionRangeInEditor();
    if (!range) return;
    try {
      savedRangeRef.current = range.cloneRange();
    } catch {
      savedRangeRef.current = null;
    }
  };

  const restoreEditorSelection = () => {
    const editor = inlineEditorRef.current;
    const saved = savedRangeRef.current;
    if (!editor || !saved) return false;
    const container = saved.commonAncestorContainer;
    if (!editor.contains(container)) return false;
    try {
      editor.focus();
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(saved);
      return true;
    } catch {
      return false;
    }
  };

  const execEditorCommand = (command, value = null) => {
    const editor = inlineEditorRef.current;
    if (!editor) return;
    try {
      if (!restoreEditorSelection()) editor.focus();
      document.execCommand("styleWithCSS", false, true);
      if (command === "hiliteColor") {
        const ok = document.execCommand("hiliteColor", false, value);
        if (!ok) document.execCommand("backColor", false, value);
        saveEditorSelection();
        return;
      }
      document.execCommand(command, false, value);
      saveEditorSelection();
    } catch {
      // no-op
    }
  };

  const applyInlineStyle = (stylePatch = {}) => {
    const editor = inlineEditorRef.current;
    restoreEditorSelection();
    const range = getSelectionRangeInEditor();
    if (!editor || !range) return;

    const setStyle = (node) => {
      Object.entries(stylePatch).forEach(([k, v]) => {
        if (v === undefined || v === null || v === "") node.style[k] = "";
        else node.style[k] = v;
      });
    };

    if (range.collapsed) {
      const anchor = window.getSelection()?.anchorNode;
      const baseNode = anchor?.nodeType === Node.ELEMENT_NODE ? anchor : anchor?.parentElement;
      const target = baseNode && editor.contains(baseNode) ? baseNode : editor;
      if (target && target !== editor) setStyle(target);
      saveEditorSelection();
      return;
    }

    const span = document.createElement("span");
    setStyle(span);
    try {
      range.surroundContents(span);
    } catch {
      const extracted = range.extractContents();
      span.appendChild(extracted);
      range.insertNode(span);
    }
    saveEditorSelection();
  };

  const applyInlineTag = (tagName) => {
    setToolbarInlineTag(tagName);
    const editor = inlineEditorRef.current;
    restoreEditorSelection();
    const range = getSelectionRangeInEditor();
    if (!editor || !range || range.collapsed) return;
    const node = document.createElement(tagName);
    try {
      range.surroundContents(node);
    } catch {
      const extracted = range.extractContents();
      node.appendChild(extracted);
      range.insertNode(node);
    }
    saveEditorSelection();
  };

  const applyFontFamily = (family) => {
    setToolbarFontFamily(family);
    if (!family || family === "inherit") return;
    execEditorCommand("fontName", family);
  };

  const applyFontSize = (sizePx) => {
    const safe = String(sizePx || "").replace(/[^\d.]/g, "");
    setToolbarFontSize(safe || "16");
    if (!safe) return;
    applyInlineStyle({ fontSize: `${safe}px` });
  };

  const applyBlockType = (blockTag) => {
    setToolbarBlock(blockTag);
    execEditorCommand("formatBlock", `<${blockTag}>`);
  };

  const applyTextColor = (color) => {
    setToolbarTextColor(color);
    execEditorCommand("foreColor", color);
  };

  const applyBgColor = (color) => {
    setToolbarBgColor(color);
    if (!color || color === "transparent") {
      applyInlineStyle({ backgroundColor: "transparent" });
      return;
    }
    execEditorCommand("hiliteColor", color);
  };

  const createLinkFromSelection = () => {
    const url = window.prompt("Enter URL", "https://");
    if (!url) return;
    execEditorCommand("createLink", url.trim());
  };

  const keepToolbarButtonMouseDown = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const commitInlineEdit = () => {
    if (!canInlineEdit) return;
    const editorHtml = inlineEditorRef.current?.innerHTML ?? inlineHtml;
    const cleanedHtml = sanitizeRichHtml(editorHtml);
    const plainText = richHtmlToPlainText(cleanedHtml);
    const currentText = String(element.props?.text ?? "");
    const currentHtml = sanitizeRichHtml(String(element.props?.html ?? textToRichHtml(currentText)));
    if (plainText !== currentText || cleanedHtml !== currentHtml) {
      updateProps(element.id, { text: plainText, html: cleanedHtml });
    }
    setIsEditingInline(false);
  };

  const cancelInlineEdit = () => {
    setInlineHtml(currentElementHtml);
    setIsEditingInline(false);
  };

  const children = elements
    .filter(child => child.parentId === element.id)
    .map(child => (
      <CanvasItem
        key={child.id}
        element={child}
        elements={elements}
        onSelect={onSelect}
        previewMode={previewMode}
        readOnly={readOnly || Boolean(child.layoutReadOnly)}
      />
    ));

  const responsiveStyles = element.responsiveStyles?.[viewportKey] || {};
  const rawMergedStyles = viewportKey === "base"
    ? (element.styles || {})
    : { ...(element.styles || {}), ...responsiveStyles };
  const mergedStyles = normalizePositionStyles(
    rawMergedStyles,
    shouldKeepManualPosition(element)
  );
  const { layout, visual } = splitStyles(mergedStyles, elementType);
  const animation = element.animation || {};

  const isContainer = CONTAINER_TYPES.has(elementType);
  const isHighlighted = highlightContainerId === element.id;
  const hasMultipleChildren = children.length > 1;
  const hasDisplayOverride = Object.prototype.hasOwnProperty.call(mergedStyles || {}, "display");

  if (isContainer && !layout.position) {
    layout.position = "relative";
  }

  if (isContainer && hasMultipleChildren && !hasDisplayOverride) {
    if (!visual.display) visual.display = "grid";
    if (!visual.gridTemplateColumns) {
      visual.gridTemplateColumns = "repeat(auto-fit, minmax(160px, 1fr))";
    }
    if (!visual.gap) visual.gap = "12px";
  }

  // For containers, apply explicit display (flex/grid/...) to the rendered element
  // that actually contains children, not to the outer canvas wrapper.
  if (isContainer && hasDisplayOverride && mergedStyles.display) {
    visual.display = mergedStyles.display;
    if (layout.display === mergedStyles.display) {
      delete layout.display;
    }
  }

  if (!SIZE_ON_CONTENT.has(elementType)) {
    const sizeKeys = [
      "width",
      "height",
      "minWidth",
      "minHeight",
      "maxWidth",
      "maxHeight"
    ];
    sizeKeys.forEach((key) => {
      if (layout[key] && !visual[key]) {
        visual[key] = layout[key];
      }
    });
    if (layout.width) visual.width = "100%";
    if (layout.height) visual.height = "100%";
    if ((layout.width || layout.height) && DEFAULT_DISPLAY.inline.has(elementType)) {
      visual.display = "inline-block";
    }
  }
  if (SIZE_ON_CONTENT.has(elementType)) {
    const percentLike = (value) => typeof value === "string" && (value.includes("%") || value.includes("vw") || value.includes("vh"));
    if (visual.width && percentLike(visual.width)) {
      layout.width = visual.width;
      visual.width = "100%";
      layout.display = layout.display || "block";
    }
    if (visual.height && percentLike(visual.height)) {
      layout.height = visual.height;
      visual.height = "100%";
      layout.display = layout.display || "block";
    }
  }

  const wrapperStyle = {
    ...layout,
    cursor: readOnly ? "default" : (isEditingInline ? "text" : "move"),
    animationName: animation.name && animation.name !== "none" ? animation.name : undefined,
    animationDuration: animation.duration,
    animationTimingFunction: animation.timing,
    animationDelay: animation.delay,
    animationIterationCount: animation.iteration,
    animationDirection: animation.direction,
    animationFillMode: animation.fillMode
  };

  const attrs = { ...(element.attrs || {}) };
  if ("style" in attrs) delete attrs.style;
  if ("class" in attrs && !attrs.className) {
    attrs.className = attrs.class;
    delete attrs.class;
  }
  if ((elementType === "a" || elementType === "link") && attrs.className) {
    const cleaned = stripClassToken(attrs.className, "link-primary");
    if (cleaned) attrs.className = cleaned;
    else delete attrs.className;
  }

  // Hide helper borders in preview/export-like view; keep them only in edit mode.
  if (previewMode && isHelperDashedBorder(visual.border)) {
    delete visual.border;
  }
  const textVisual = hasTextProp && !visual.whiteSpace
    ? { ...visual, whiteSpace: "pre-wrap" }
    : visual;
  const richHtml = typeof element.props?.html === "string"
    ? sanitizeRichHtml(element.props.html)
    : "";
  const hasRichHtml = Boolean(richHtml && richHtml.trim());

  const pseudo = element.pseudoStyles || {};
  const isMedia = SIZE_ON_CONTENT.has(elementType);
  const className = `canvas-item element-${element.id}${isMedia ? " is-media" : ""}`;
  const hoverCss = styleObjToCss(pseudo.hover);
  const activeCss = styleObjToCss(pseudo.active);
  const focusCss = styleObjToCss(pseudo.focus);
  const styleTag = `
    .element-${element.id}:hover{${hoverCss}}
    .element-${element.id}:active{${activeCss}}
    .element-${element.id}:focus{${focusCss}}
  `;

  const byIdForConnectivity = new Map(elements.map((item) => [item.id, item]));
  const parentElement = byIdForConnectivity.get(element.parentId);
  const parentType = parentElement?.type || "";
  const containerOptions = elements.filter((el) =>
    CONTAINER_TYPES.has(el.type) &&
    isConnectedToRoot(byIdForConnectivity, el.id) &&
    !el.layoutReadOnly &&
    el.id !== element.id &&
    !isDescendant(elements, element.id, el.id)
  );

  const renderContent = () => {
    if (element.type === "text") {
      if (hasRichHtml) {
        return <p style={textVisual} {...attrs} dangerouslySetInnerHTML={{ __html: richHtml }} />;
      }
      return <p style={textVisual} {...attrs}>{element.props.text}</p>;
    }

    if (element.type === "button") {
      if (hasRichHtml) {
        return (
          <button style={textVisual} {...attrs} dangerouslySetInnerHTML={{ __html: richHtml }} />
        );
      }
      return (
        <button style={textVisual} {...attrs}>
          {element.props.text}
        </button>
      );
    }

    if (element.type === "image") {
      return (
        <img
          src={element.props.src}
          alt={element.props.alt}
          style={visual}
          {...attrs}
        />
      );
    }

    if (element.type === "link" || element.type === "a") {
      const className = attrs.className || "";
      if (!visual.textDecoration && className.includes("text-decoration-none")) {
        visual.textDecoration = "none";
      }
      const normalizedColor = String(visual.color || "").trim().toLowerCase();
      if (
        parentType === "nav" &&
        (!visual.color || normalizedColor === "#2563eb" || normalizedColor === "#0f172a")
      ) {
        visual.color = "inherit";
      }
      return (
        <a
          href={element.props.href}
          target={element.props.target}
          rel="noreferrer"
          style={textVisual}
          {...attrs}
          onClick={handleLinkClick}
        >
          {hasRichHtml ? <span dangerouslySetInnerHTML={{ __html: richHtml }} /> : element.props.text}
          {children}
        </a>
      );
    }

    if (element.type === "iframe") {
      return (
        <iframe
          src={element.props.src}
          title={element.props.title}
          style={visual}
          {...attrs}
        />
      );
    }

    const tag = elementType;
    const props = { ...element.props, ...attrs, style: hasTextProp ? textVisual : visual };
    if ("text" in props) delete props.text;
    if ("html" in props) delete props.html;

    if (VOID_TAGS.has(tag)) {
      return React.createElement(tag, props);
    }

    if (tag === "textarea") {
      const nextProps = { ...props };
      if (nextProps.value === undefined && nextProps.defaultValue === undefined && element.props?.text !== undefined) {
        nextProps.defaultValue = element.props.text;
      }
      return React.createElement(tag, nextProps);
    }

    if (hasRichHtml) {
      const richChild = React.createElement("span", {
        key: `rich-${element.id}`,
        dangerouslySetInnerHTML: { __html: richHtml }
      });
      return React.createElement(tag, props, [richChild, ...children]);
    }

    const content = element.props?.text ?? tag;
    return React.createElement(tag, props, [content, ...children]);
  };

  return (
    <div
      className={`${className}${isContainer && !previewMode && !readOnly ? " container-frame" : ""}${isHighlighted ? " container-highlight" : ""}${readOnly ? " is-layout-readonly" : ""}${isEditingInline ? " is-inline-editing" : ""}${isSelected ? " is-selected" : ""}`}
      ref={itemRef}
      style={wrapperStyle}
      onMouseDown={handleMouseDown}
      onClick={handleClick}
      onContextMenu={handleContextMenu}
      onFocus={() => {
        if (!previewMode && !readOnly) onSelect(element.id);
      }}
      onDoubleClick={startInlineEdit}
      tabIndex={0}
    >
      <style>{styleTag}</style>
      {!previewMode && !readOnly && !isEditingInline && (
        <div className="element-attach">
          <button
            type="button"
            className="element-attach__btn"
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setShowMenu(v => !v);
            }}
            title="Move to container"
          >
            📦 Move to...
          </button>
          {showMenu && (
            <div className="element-attach__menu">
              <button
                type="button"
                className="element-attach__item"
                onClick={handleDetach}
              >
                Root (no container)
              </button>
              {containerOptions.length === 0 && (
                <div className="element-attach__empty">No containers</div>
              )}
              {containerOptions.map(opt => (
                <button
                  key={opt.id}
                  type="button"
                  className="element-attach__item"
                  onClick={handleAttachTo(opt.id)}
                >
                  {opt.type} #{opt.id}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
      {!previewMode && !readOnly && !isEditingInline && isSelected && quickStyleMenu.open && (
        <div
          ref={quickMenuRef}
          className="quick-style-menu"
          style={{ left: quickStyleMenu.x, top: quickStyleMenu.y }}
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          onContextMenu={(e) => e.preventDefault()}
        >
          <div className="quick-style-menu__header">
            <strong>Quick Styles</strong>
            <button
              type="button"
              className="quick-style-menu__close"
              onClick={closeQuickStyleMenu}
              title="Close"
            >
              ×
            </button>
          </div>

          <div className="quick-style-menu__section">
            <label className="quick-style-menu__field quick-style-menu__field--color">
              Text
              <input
                type="color"
                value={quickDraft.textColor}
                onChange={(e) =>
                  updateQuickDraftField("textColor", e.target.value, (next) => ({ color: next.textColor }))
                }
              />
            </label>
            <label className="quick-style-menu__field quick-style-menu__field--color">
              Background
              <input
                type="color"
                value={quickDraft.bgColor}
                onChange={(e) =>
                  updateQuickDraftField("bgColor", e.target.value, (next) => ({ backgroundColor: next.bgColor }))
                }
              />
            </label>
          </div>

          <div className="quick-style-menu__section">
            <label className="quick-style-menu__field">
              Font size
              <div className="quick-style-menu__inline">
                <input
                  type="number"
                  min={1}
                  step={0.1}
                  value={quickDraft.fontSizeValue}
                  onChange={(e) =>
                    updateQuickDraftField("fontSizeValue", e.target.value, (next) => {
                      const nextValue = toUnitValue(next.fontSizeValue, next.fontSizeUnit);
                      if (nextValue === null) return null;
                      return { fontSize: nextValue };
                    })
                  }
                />
                <select
                  value={quickDraft.fontSizeUnit}
                  onChange={(e) =>
                    updateQuickDraftField("fontSizeUnit", e.target.value, (next) => {
                      const nextValue = toUnitValue(next.fontSizeValue, next.fontSizeUnit);
                      if (nextValue === null) return null;
                      return { fontSize: nextValue };
                    })
                  }
                >
                  <option value="px">px</option>
                  <option value="rem">rem</option>
                  <option value="em">em</option>
                  <option value="%">%</option>
                </select>
              </div>
            </label>

            <label className="quick-style-menu__field">
              Weight
              <select
                value={quickDraft.fontWeight}
                onChange={(e) =>
                  updateQuickDraftField("fontWeight", e.target.value, (next) => ({ fontWeight: next.fontWeight }))
                }
              >
                <option value="normal">normal</option>
                <option value="500">500</option>
                <option value="600">600</option>
                <option value="700">700</option>
                <option value="bold">bold</option>
              </select>
            </label>
          </div>

          <div className="quick-style-menu__section">
            <label className="quick-style-menu__field">
              Align
              <select
                value={quickDraft.textAlign}
                onChange={(e) =>
                  updateQuickDraftField("textAlign", e.target.value, (next) => ({ textAlign: next.textAlign }))
                }
              >
                <option value="left">left</option>
                <option value="center">center</option>
                <option value="right">right</option>
                <option value="justify">justify</option>
                <option value="start">start</option>
                <option value="end">end</option>
              </select>
            </label>

            <label className="quick-style-menu__field">
              Display
              <select
                value={quickDraft.display}
                onChange={(e) =>
                  updateQuickDraftField("display", e.target.value, (next) => ({ display: next.display }))
                }
              >
                <option value="">(default)</option>
                <option value="block">block</option>
                <option value="inline">inline</option>
                <option value="inline-block">inline-block</option>
                <option value="flex">flex</option>
                <option value="grid">grid</option>
              </select>
            </label>
          </div>

          <div className="quick-style-menu__section quick-style-menu__section--triple">
            <label className="quick-style-menu__field">
              Padding
              <div className="quick-style-menu__inline">
                <input
                  type="number"
                  step={0.1}
                  value={quickDraft.paddingValue}
                  onChange={(e) =>
                    updateQuickDraftField("paddingValue", e.target.value, (next) => {
                      const nextValue = toUnitValue(next.paddingValue, next.paddingUnit);
                      if (nextValue === null) return null;
                      return { padding: nextValue };
                    })
                  }
                />
                <select
                  value={quickDraft.paddingUnit}
                  onChange={(e) =>
                    updateQuickDraftField("paddingUnit", e.target.value, (next) => {
                      const nextValue = toUnitValue(next.paddingValue, next.paddingUnit);
                      if (nextValue === null) return null;
                      return { padding: nextValue };
                    })
                  }
                >
                  <option value="px">px</option>
                  <option value="rem">rem</option>
                  <option value="em">em</option>
                  <option value="%">%</option>
                </select>
              </div>
            </label>

            <label className="quick-style-menu__field">
              Margin
              <div className="quick-style-menu__inline">
                <input
                  type="number"
                  step={0.1}
                  value={quickDraft.marginValue}
                  onChange={(e) =>
                    updateQuickDraftField("marginValue", e.target.value, (next) => {
                      const nextValue = toUnitValue(next.marginValue, next.marginUnit);
                      if (nextValue === null) return null;
                      return { margin: nextValue };
                    })
                  }
                />
                <select
                  value={quickDraft.marginUnit}
                  onChange={(e) =>
                    updateQuickDraftField("marginUnit", e.target.value, (next) => {
                      const nextValue = toUnitValue(next.marginValue, next.marginUnit);
                      if (nextValue === null) return null;
                      return { margin: nextValue };
                    })
                  }
                >
                  <option value="px">px</option>
                  <option value="rem">rem</option>
                  <option value="em">em</option>
                  <option value="%">%</option>
                </select>
              </div>
            </label>

            <label className="quick-style-menu__field">
              Radius
              <div className="quick-style-menu__inline">
                <input
                  type="number"
                  step={0.1}
                  value={quickDraft.radiusValue}
                  onChange={(e) =>
                    updateQuickDraftField("radiusValue", e.target.value, (next) => {
                      const nextValue = toUnitValue(next.radiusValue, next.radiusUnit);
                      if (nextValue === null) return null;
                      return { borderRadius: nextValue };
                    })
                  }
                />
                <select
                  value={quickDraft.radiusUnit}
                  onChange={(e) =>
                    updateQuickDraftField("radiusUnit", e.target.value, (next) => {
                      const nextValue = toUnitValue(next.radiusValue, next.radiusUnit);
                      if (nextValue === null) return null;
                      return { borderRadius: nextValue };
                    })
                  }
                >
                  <option value="px">px</option>
                  <option value="rem">rem</option>
                  <option value="%">%</option>
                </select>
              </div>
            </label>
          </div>

          <div className="quick-style-menu__section">
            <label className="quick-style-menu__field">
              Gap
              <div className="quick-style-menu__inline">
                <input
                  type="number"
                  step={0.1}
                  value={quickDraft.gapValue}
                  onChange={(e) =>
                    updateQuickDraftField("gapValue", e.target.value, (next) => {
                      const nextValue = toUnitValue(next.gapValue, next.gapUnit);
                      if (nextValue === null) return null;
                      return { gap: nextValue };
                    })
                  }
                />
                <select
                  value={quickDraft.gapUnit}
                  onChange={(e) =>
                    updateQuickDraftField("gapUnit", e.target.value, (next) => {
                      const nextValue = toUnitValue(next.gapValue, next.gapUnit);
                      if (nextValue === null) return null;
                      return { gap: nextValue };
                    })
                  }
                >
                  <option value="px">px</option>
                  <option value="rem">rem</option>
                  <option value="em">em</option>
                  <option value="%">%</option>
                </select>
              </div>
            </label>
          </div>

          <div className="quick-style-menu__actions">
            <button
              type="button"
              className="quick-style-menu__btn"
              onClick={() => {
                applyStylePatch({ color: "", backgroundColor: "" });
                setQuickDraft((prev) => ({
                  ...prev,
                  textColor: "#111827",
                  bgColor: "#ffffff"
                }));
              }}
            >
              Clear colors
            </button>
            <button
              type="button"
              className="quick-style-menu__btn"
              onClick={() => {
                applyStylePatch({ margin: "", padding: "", borderRadius: "", gap: "" });
                setQuickDraft((prev) => ({
                  ...prev,
                  marginValue: "",
                  paddingValue: "",
                  radiusValue: "",
                  gapValue: ""
                }));
              }}
            >
              Clear spacing
            </button>
          </div>
        </div>
      )}
      {renderContent()}
      {isEditingInline && (
        <div
          className="inline-rich-editor"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
          <div
            className="inline-rich-toolbar"
            onMouseDown={(e) => {
              e.stopPropagation();
            }}
          >
            <div className="inline-rich-group">
              <button type="button" className="inline-rich-btn" onMouseDown={keepToolbarButtonMouseDown} onClick={() => execEditorCommand("undo")} title="Undo">↶</button>
              <button type="button" className="inline-rich-btn" onMouseDown={keepToolbarButtonMouseDown} onClick={() => execEditorCommand("redo")} title="Redo">↷</button>
            </div>

            <div className="inline-rich-group">
              <button type="button" className="inline-rich-btn" onMouseDown={keepToolbarButtonMouseDown} onClick={() => execEditorCommand("bold")} title="Bold"><strong>B</strong></button>
              <button type="button" className="inline-rich-btn" onMouseDown={keepToolbarButtonMouseDown} onClick={() => execEditorCommand("italic")} title="Italic"><em>I</em></button>
              <button type="button" className="inline-rich-btn" onMouseDown={keepToolbarButtonMouseDown} onClick={() => execEditorCommand("underline")} title="Underline"><u>U</u></button>
              <button type="button" className="inline-rich-btn" onMouseDown={keepToolbarButtonMouseDown} onClick={() => execEditorCommand("strikeThrough")} title="Strike">S</button>
            </div>

            <div className="inline-rich-group">
              <select
                className="inline-rich-select"
                value={toolbarBlock}
                onChange={(e) => applyBlockType(e.target.value)}
              >
                <option value="p">Paragraph</option>
                <option value="div">Div</option>
                <option value="h1">Heading 1</option>
                <option value="h2">Heading 2</option>
                <option value="h3">Heading 3</option>
                <option value="h4">Heading 4</option>
                <option value="h5">Heading 5</option>
                <option value="h6">Heading 6</option>
                <option value="blockquote">Quote</option>
                <option value="pre">Pre</option>
                <option value="address">Address</option>
              </select>
              <select
                className="inline-rich-select"
                value={toolbarFontFamily}
                onChange={(e) => applyFontFamily(e.target.value)}
              >
                <option value="inherit">Default Font</option>
                <option value="Arial, sans-serif">Arial</option>
                <option value="'Segoe UI', sans-serif">Segoe UI</option>
                <option value="'Trebuchet MS', sans-serif">Trebuchet</option>
                <option value="'Verdana', sans-serif">Verdana</option>
                <option value="'Tahoma', sans-serif">Tahoma</option>
                <option value="'Times New Roman', serif">Times New Roman</option>
                <option value="Georgia, serif">Georgia</option>
                <option value="'Courier New', monospace">Courier New</option>
                <option value="'Lucida Console', monospace">Lucida Console</option>
              </select>
              <input
                className="inline-rich-size"
                type="number"
                min={8}
                max={96}
                value={toolbarFontSize}
                onChange={(e) => setToolbarFontSize(e.target.value)}
                onBlur={() => applyFontSize(toolbarFontSize)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") applyFontSize(toolbarFontSize);
                }}
                title="Font size (px)"
              />
              <select
                className="inline-rich-select"
                value={toolbarInlineTag}
                onChange={(e) => applyInlineTag(e.target.value)}
              >
                <option value="span">Span</option>
                <option value="small">Small</option>
                <option value="strong">Strong</option>
                <option value="em">Emphasis</option>
                <option value="mark">Mark</option>
                <option value="u">Underline Tag</option>
                <option value="s">Strike Tag</option>
                <option value="code">Code</option>
                <option value="label">Label</option>
              </select>
            </div>

            <div className="inline-rich-group">
              <label className="inline-rich-label">
                Text
                <input
                  type="color"
                  value={toolbarTextColor}
                  onChange={(e) => applyTextColor(e.target.value)}
                />
              </label>
              <label className="inline-rich-label">
                Bg
                <input
                  type="color"
                  value={toolbarBgColor}
                  onChange={(e) => applyBgColor(e.target.value)}
                />
              </label>
              <button type="button" className="inline-rich-btn" onMouseDown={keepToolbarButtonMouseDown} onClick={() => applyBgColor("transparent")} title="Clear background">No Bg</button>
            </div>

            <div className="inline-rich-group">
              <button type="button" className="inline-rich-btn" onMouseDown={keepToolbarButtonMouseDown} onClick={() => execEditorCommand("justifyLeft")} title="Align Left">L</button>
              <button type="button" className="inline-rich-btn" onMouseDown={keepToolbarButtonMouseDown} onClick={() => execEditorCommand("justifyCenter")} title="Align Center">C</button>
              <button type="button" className="inline-rich-btn" onMouseDown={keepToolbarButtonMouseDown} onClick={() => execEditorCommand("justifyRight")} title="Align Right">R</button>
              <button type="button" className="inline-rich-btn" onMouseDown={keepToolbarButtonMouseDown} onClick={() => execEditorCommand("justifyFull")} title="Justify">J</button>
            </div>

            <div className="inline-rich-group">
              <button type="button" className="inline-rich-btn" onMouseDown={keepToolbarButtonMouseDown} onClick={() => execEditorCommand("insertUnorderedList")} title="Bullets">• List</button>
              <button type="button" className="inline-rich-btn" onMouseDown={keepToolbarButtonMouseDown} onClick={() => execEditorCommand("insertOrderedList")} title="Numbered">1. List</button>
              <button type="button" className="inline-rich-btn" onMouseDown={keepToolbarButtonMouseDown} onClick={() => execEditorCommand("outdent")} title="Outdent">⟵</button>
              <button type="button" className="inline-rich-btn" onMouseDown={keepToolbarButtonMouseDown} onClick={() => execEditorCommand("indent")} title="Indent">⟶</button>
            </div>

            <div className="inline-rich-group">
              <button type="button" className="inline-rich-btn" onMouseDown={keepToolbarButtonMouseDown} onClick={createLinkFromSelection}>Link</button>
              <button type="button" className="inline-rich-btn" onMouseDown={keepToolbarButtonMouseDown} onClick={() => execEditorCommand("unlink")}>Unlink</button>
              <button type="button" className="inline-rich-btn" onMouseDown={keepToolbarButtonMouseDown} onClick={() => execEditorCommand("removeFormat")}>Clear</button>
            </div>

            <button type="button" className="inline-rich-btn is-save" onMouseDown={keepToolbarButtonMouseDown} onClick={commitInlineEdit}>
              Save
            </button>
          </div>
          <div
            ref={inlineEditorRef}
            className="inline-text-editor"
            contentEditable
            dir="auto"
            suppressContentEditableWarning
            onInput={saveEditorSelection}
            onMouseUp={saveEditorSelection}
            onKeyUp={saveEditorSelection}
            onBlur={(e) => {
              const nextTarget = e.relatedTarget;
              if (nextTarget && e.currentTarget.parentElement?.contains(nextTarget)) return;
              commitInlineEdit();
            }}
            onPaste={(e) => {
              e.preventDefault();
              const pasted = e.clipboardData?.getData("text/plain") || "";
              document.execCommand("insertText", false, pasted);
              setTimeout(saveEditorSelection, 0);
            }}
            onKeyDown={(e) => {
              e.stopPropagation();
              if (e.key === "Escape") {
                e.preventDefault();
                cancelInlineEdit();
              }
              if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
                e.preventDefault();
                commitInlineEdit();
              }
              if (e.key === "Enter" && !e.ctrlKey && !e.metaKey) {
                e.preventDefault();
                document.execCommand("insertLineBreak");
                setTimeout(saveEditorSelection, 0);
              }
            }}
          />
        </div>
      )}
      {!previewMode && !readOnly && !isEditingInline && isSelected && (
        <>
          <div
            className="resize-handle resize-handle-both"
            onMouseDown={handleResizeDown("both")}
            title="Resize width & height"
          />
          <div
            className="resize-handle resize-handle-x"
            onMouseDown={handleResizeDown("x")}
            title="Resize width"
          />
          <div
            className="resize-handle resize-handle-y"
            onMouseDown={handleResizeDown("y")}
            title="Resize height"
          />
        </>
      )}
      {!previewMode && readOnly && <span className="layout-badge">Layout</span>}
    </div>
  );
}
