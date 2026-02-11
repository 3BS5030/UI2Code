import React, { useRef, useState } from "react";
import { useBuilderStore } from "../../store/builderStore";

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

const SIZE_ON_CONTENT = new Set([
  "img",
  "image",
  "iframe",
  "video",
  "audio",
  "canvas",
  "svg"
]);

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

export default function CanvasItem({ element, elements, onSelect, previewMode = false }) {
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
  const dragRef = useRef({
    dragging: false,
    startX: 0,
    startY: 0,
    startLeft: 0,
    startTop: 0
  });
  const resizeRef = useRef({
    resizing: false,
    startX: 0,
    startY: 0,
    startWidth: 0,
    startHeight: 0
  });

  const [showMenu, setShowMenu] = useState(false);

  const handleClick = (e) => {
    if (previewMode) return;
    if (e.target.closest(".canvas-item") !== e.currentTarget) return;
    if (element.type === "link" || element.type === "a") {
      e.preventDefault();
      e.stopPropagation();
    }
    onSelect(element.id);
  };

  const handleMouseDown = (e) => {
    if (previewMode) return;
    if (e.button !== 0) return;
    if (e.target.closest(".canvas-item") !== e.currentTarget) return;
    if (e.target?.closest?.(".element-attach")) return;
    if (e.target?.closest?.(".element-lock")) return;
    e.preventDefault();
    e.stopPropagation();

    onSelect(element.id);

    const node = itemRef.current;
    if (!node) return;

    const parent = node.offsetParent;
    const parentRect = parent?.getBoundingClientRect();
    const rect = node.getBoundingClientRect();

    const currentLeft = typeof element.styles?.left === "string"
      ? parseFloat(element.styles.left)
      : (parentRect ? rect.left - parentRect.left : 0);
    const currentTop = typeof element.styles?.top === "string"
      ? parseFloat(element.styles.top)
      : (parentRect ? rect.top - parentRect.top : 0);

    dragRef.current = {
      dragging: true,
      startX: e.clientX,
      startY: e.clientY,
      startLeft: currentLeft,
      startTop: currentTop
    };

    const onMove = (moveEvent) => {
      if (!dragRef.current.dragging) return;

      const dx = moveEvent.clientX - dragRef.current.startX;
      const dy = moveEvent.clientY - dragRef.current.startY;

      const nextLeft = dragRef.current.startLeft + dx;
      const nextTop = dragRef.current.startTop + dy;

      let clampedLeft = nextLeft;
      let clampedTop = nextTop;

      const parentNow = node.offsetParent || document.body;
      const parentNowRect = parentNow?.getBoundingClientRect();
      const nodeRect = node.getBoundingClientRect();

      if (parentNowRect) {
        const maxLeft = Math.max(0, parentNowRect.width - nodeRect.width);
        const maxTop = Math.max(0, parentNowRect.height - nodeRect.height);
        clampedLeft = Math.min(Math.max(0, nextLeft), maxLeft);
        clampedTop = Math.min(Math.max(0, nextTop), maxTop);
      }

      const nextStyles = {
        position: "absolute",
        left: `${clampedLeft}px`,
        top: `${clampedTop}px`
      };

      if (viewportKey === "base") {
        updateStyles(element.id, nextStyles);
      } else {
        updateResponsiveStyles(element.id, viewportKey, nextStyles);
      }

      if (!element.parentId && autoExpandBody) {
        const neededHeight = Math.ceil(clampedTop + nodeRect.height + 40);
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

  const handleResizeDown = (e) => {
    if (previewMode) return;
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

      const nextWidth = Math.max(20, resizeRef.current.startWidth + dx);
      const nextHeight = Math.max(20, resizeRef.current.startHeight + dy);

      const parentRect = node.offsetParent?.getBoundingClientRect();
      const isSmallScreen = window.innerWidth < 768;

      if (parentRect && parentRect.width > 0 && parentRect.height > 0 && !isSmallScreen) {
        const widthPct = Math.max(1, Math.round((nextWidth / parentRect.width) * 100));
        const heightPct = Math.max(1, Math.round((nextHeight / parentRect.height) * 100));
        const nextStyles = {
          width: `${widthPct}%`,
          height: `${heightPct}%`
        };
        if (viewportKey === "base") {
          updateStyles(element.id, nextStyles);
        } else {
          updateResponsiveStyles(element.id, viewportKey, nextStyles);
        }
      } else {
        const nextStyles = {
          width: `${Math.round(nextWidth)}px`,
          height: `${Math.round(nextHeight)}px`
        };
        if (viewportKey === "base") {
          updateStyles(element.id, nextStyles);
        } else {
          updateResponsiveStyles(element.id, viewportKey, nextStyles);
        }
      }

      if (!element.parentId && node?.offsetParent && autoExpandBody) {
        const parentRect = node.offsetParent.getBoundingClientRect();
        const nodeRect = node.getBoundingClientRect();
        const bottom = nodeRect.bottom - parentRect.top;
        const needed = Math.ceil(bottom + 40);
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
    e.preventDefault();
    e.stopPropagation();
    setElementLock(element.id, !element.lockedToParent);
  };

  const handleDetach = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setElementParent(element.id, null);
    setElementLock(element.id, false);
    setShowMenu(false);
  };

  const handleAttachTo = (targetId) => (e) => {
    e.preventDefault();
    e.stopPropagation();
    setElementParent(element.id, targetId);
    setElementLock(element.id, true);
    setShowMenu(false);
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
      />
    ));

  const elementType = element.type || "div";
  const responsiveStyles = element.responsiveStyles?.[viewportKey] || {};
  const mergedStyles = viewportKey === "base"
    ? (element.styles || {})
    : { ...(element.styles || {}), ...responsiveStyles };
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
    cursor: "move",
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

  const containerOptions = elements.filter(el =>
    CONTAINER_TYPES.has(el.type) &&
    el.id !== element.id &&
    !isDescendant(elements, element.id, el.id)
  );

  const renderContent = () => {
    if (element.type === "text") {
      return <p style={visual} {...attrs}>{element.props.text}</p>;
    }

    if (element.type === "button") {
      return (
        <button style={visual} {...attrs}>
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
      if (!visual.textDecoration && className.includes("link-primary")) {
        visual.textDecoration = "none";
      }
      return (
        <a
          href={element.props.href}
          target={element.props.target}
          rel="noreferrer"
          style={visual}
          {...attrs}
          onClick={handleLinkClick}
        >
          {element.props.text}
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
    const props = { ...element.props, ...attrs, style: visual };

    if (VOID_TAGS.has(tag)) {
      return React.createElement(tag, props);
    }

    const content = element.props?.text ?? tag;
    return React.createElement(tag, props, [content, ...children]);
  };

  return (
    <div
      className={`${className}${isContainer ? " container-frame" : ""}${isHighlighted ? " container-highlight" : ""}`}
      ref={itemRef}
      style={wrapperStyle}
      onMouseDown={handleMouseDown}
      onClick={handleClick}
      tabIndex={0}
    >
      <style>{styleTag}</style>
      {!previewMode && (
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
      {renderContent()}
      {!previewMode && <div className="resize-handle" onMouseDown={handleResizeDown} />}
    </div>
  );
}
