import React, { useEffect, useMemo, useRef } from "react";
import { Form } from "react-bootstrap";
import { useBuilderStore } from "../../store/builderStore";
import CanvasItem from "./CanvasItem";
import { buildSliderRuntimeScript } from "../../core/generator";
import { VIEWPORTS } from "../../core/viewports";
import { getEffectivePageElements } from "../../utils/pageLayout";

const toCamel = (key) =>
  key.replace(/-([a-z])/g, (_, char) => char.toUpperCase());

const normalizeInlineStyles = (styles = {}) => {
  return Object.entries(styles).reduce((acc, [rawKey, rawValue]) => {
    if (rawValue === undefined || rawValue === null || rawValue === "") return acc;
    const key = rawKey.startsWith("--") ? rawKey : toCamel(rawKey);
    const value = typeof rawValue === "string"
      ? rawValue.replace(/\s*!important\s*$/i, "").trim()
      : rawValue;
    acc[key] = value;
    return acc;
  }, {});
};

const sliderDescendants = (node) => {
  if (!node || typeof node.querySelectorAll !== "function") return [];
  return Array.from(node.querySelectorAll("*")).filter((child) => child && child.nodeType === 1);
};

const sliderOwnsNode = (slider, node) => {
  if (!slider || !node) return false;
  const owner = node.closest('[data-ui2-slider],[data-slider-loop]');
  return owner === slider;
};

const findSliderTrack = (slider) => {
  const descendants = sliderDescendants(slider).filter((node) => sliderOwnsNode(slider, node));
  const explicit = descendants.find((node) => node.hasAttribute("data-ui2-slider-track"));
  if (explicit) return explicit;
  const byTransform = descendants.find((node) => {
    const inlineStyle = node.getAttribute("style") || "";
    const inlineTransform = node.style ? node.style.transform : "";
    return /translateX\s*\(/i.test(inlineStyle) || /translateX\s*\(/i.test(inlineTransform || "");
  });
  if (byTransform) return byTransform;
  return descendants.find((node) => {
    const computed = window.getComputedStyle(node);
    return computed.display.includes("flex") && node.children.length > 1;
  }) || null;
};

const findSliderSlides = (track) => {
  if (!track) return [];
  const marked = Array.from(track.querySelectorAll('[data-ui2-slider-slide]'));
  if (marked.length) return marked;
  return Array.from(track.children || []).filter((child) => child && child.nodeType === 1);
};

const findSliderArrow = (slider, key) => {
  const dataKey = key === "prev" ? "data-ui2-slider-prev" : "data-ui2-slider-next";
  const descendants = sliderDescendants(slider).filter((node) => sliderOwnsNode(slider, node));
  const explicit = descendants.find((node) => node.hasAttribute(dataKey));
  if (explicit) return explicit;
  const allButtons = descendants.filter((node) => String(node.tagName || "").toLowerCase() === "button");
  if (!allButtons.length) return null;
  const bySide = allButtons.find((btn) => {
    const style = window.getComputedStyle(btn);
    if (key === "prev") return style.left !== "auto";
    return style.right !== "auto";
  });
  if (bySide) return bySide;
  return key === "prev" ? allButtons[0] : allButtons[allButtons.length - 1];
};

const findSliderDots = (slider) => {
  const descendants = sliderDescendants(slider).filter((node) => sliderOwnsNode(slider, node));
  const wrap = descendants.find((node) => node.hasAttribute("data-ui2-slider-dots"));
  if (wrap) {
    const explicitDots = Array.from(wrap.querySelectorAll('[data-ui2-slider-dot]'));
    if (explicitDots.length) return explicitDots;
    return Array.from(wrap.querySelectorAll("span"));
  }
  const fallbackWrap = descendants.find((node) => node.querySelectorAll("span").length > 1);
  if (!fallbackWrap) return [];
  return Array.from(fallbackWrap.querySelectorAll("span"));
};

const initPreviewSlider = (slider) => {
  if (!slider || slider.dataset.ui2PreviewSliderReady === "1") return;
  const track = findSliderTrack(slider);
  const slides = findSliderSlides(track);
  if (!track || slides.length <= 1) return;

  const prevBtn = findSliderArrow(slider, "prev");
  const nextBtn = findSliderArrow(slider, "next");
  const dots = findSliderDots(slider);
  const loop = String(slider.getAttribute("data-slider-loop") || "true").toLowerCase() !== "false";

  let index = 0;
  const total = slides.length;

  const setIndex = (nextIndex) => {
    if (loop) index = (nextIndex + total) % total;
    else index = Math.max(0, Math.min(total - 1, nextIndex));

    const shift = (index * 100) / total;
    track.style.transform = `translateX(-${shift}%)`;

    dots.forEach((dot, dotIndex) => {
      dot.style.backgroundColor = dotIndex === index ? "#2563eb" : "#94a3b8";
      dot.style.cursor = "pointer";
      dot.style.opacity = dotIndex === index ? "1" : "0.9";
    });

    if (!loop) {
      if (prevBtn) prevBtn.disabled = index === 0;
      if (nextBtn) nextBtn.disabled = index === total - 1;
    }
  };

  if (prevBtn) {
    prevBtn.style.cursor = "pointer";
    prevBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      setIndex(index - 1);
    });
  }

  if (nextBtn) {
    nextBtn.style.cursor = "pointer";
    nextBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      setIndex(index + 1);
    });
  }

  dots.forEach((dot, dotIndex) => {
    dot.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      setIndex(dotIndex);
    });
  });

  slider.dataset.ui2PreviewSliderReady = "1";
  setIndex(0);
};

export default function Canvas({ previewMode = false, belowToolbar = null }) {
  const currentPageId = useBuilderStore(state => state.currentPageId);
  const pages = useBuilderStore(state => state.pages);
  const selectElement = useBuilderStore(state => state.selectElement);
  const selectPage = useBuilderStore(state => state.selectPage);
  const viewportPreset = useBuilderStore(state => state.viewportPreset);
  const viewportKey = useBuilderStore(state => state.viewportKey);
  const setViewport = useBuilderStore(state => state.setViewport);
  const autoExpandBody = useBuilderStore(state => state.autoExpandBody);
  const toggleAutoExpandBody = useBuilderStore(state => state.toggleAutoExpandBody);
  const showCssEditor = useBuilderStore(state => state.showCssEditor);
  const showJsEditor = useBuilderStore(state => state.showJsEditor);
  const splitEditors = useBuilderStore(state => state.splitEditors);
  const isPreviewMode = useBuilderStore(state => state.previewMode);
  const toggleShowCssEditor = useBuilderStore(state => state.toggleShowCssEditor);
  const toggleShowJsEditor = useBuilderStore(state => state.toggleShowJsEditor);
  const toggleSplitEditors = useBuilderStore(state => state.toggleSplitEditors);
  const togglePreviewMode = useBuilderStore(state => state.togglePreviewMode);
  const globalCssFiles = useBuilderStore(state => state.globalCssFiles);
  const globalJsFiles = useBuilderStore(state => state.globalJsFiles);

  const currentPage = pages.find(p => p.id === currentPageId);
  const elements = useMemo(
    () => getEffectivePageElements(pages, currentPage),
    [pages, currentPage]
  );
  const bodyStyles = currentPage?.bodyStyles || {};
  const bodyResponsive = currentPage?.bodyResponsive || {};
  const bodyAttrs = currentPage?.bodyAttrs || {};
  const customCss = currentPage?.customCss || "";
  const customJs = currentPage?.customJs || "";
  const pageCssFiles = currentPage?.cssFiles || [];
  const pageJsFiles = currentPage?.jsFiles || [];

  const pageRootRef = useRef(null);

  const safeBodyAttrs = { ...(bodyAttrs || {}) };
  if ("style" in safeBodyAttrs) delete safeBodyAttrs.style;
  if ("class" in safeBodyAttrs && !safeBodyAttrs.className) {
    safeBodyAttrs.className = safeBodyAttrs.class;
    delete safeBodyAttrs.class;
  }

  const rootElements = elements.filter(el => !el.parentId);

  const viewportConfig = VIEWPORTS.find(v => v.id === viewportPreset) || VIEWPORTS[0];
  const responsiveOverride = bodyResponsive[viewportKey] || {};
  const rawBodyStyles = viewportKey === "base"
    ? { ...bodyStyles }
    : { ...bodyStyles, ...responsiveOverride };
  if (viewportKey !== "base" && !Object.prototype.hasOwnProperty.call(responsiveOverride, "minWidth")) {
    delete rawBodyStyles.minWidth;
  }
  const mergedBodyStyles = normalizeInlineStyles(rawBodyStyles);
  if (!mergedBodyStyles.minHeight) mergedBodyStyles.minHeight = "100vh";
  if (!mergedBodyStyles.background && !mergedBodyStyles.backgroundColor) {
    mergedBodyStyles.backgroundColor = "#ffffff";
  }

  const viewportWidth = viewportConfig.width === "auto"
    ? "100%"
    : `${viewportConfig.width}px`;

  const builderApi = useMemo(() => ({
    navigate: (route) => {
      const match = pages.find(p => p.route === route);
      if (match) selectPage(match.id);
    }
  }), [pages, selectPage]);

  const fileCss = useMemo(
    () => [...globalCssFiles, ...pageCssFiles].map(f => f.content || "").join("\n"),
    [globalCssFiles, pageCssFiles]
  );
  const fileJs = useMemo(
    () => [...globalJsFiles, ...pageJsFiles].map(f => f.content || "").join("\n"),
    [globalJsFiles, pageJsFiles]
  );

  const sliderRuntimeJs = useMemo(
    () => buildSliderRuntimeScript(elements),
    [elements]
  );

  const combinedJs = useMemo(() => {
    return [sliderRuntimeJs, fileJs, customJs].filter(Boolean).join("\n");
  }, [sliderRuntimeJs, fileJs, customJs]);

  const handleOpenAddPageModal = () => {
    if (typeof window === "undefined") return;
    window.dispatchEvent(new Event("ui2code:open-add-page-modal"));
  };

  useEffect(() => {
    if (!combinedJs) return undefined;
    try {
      const pageRoot = pageRootRef.current;
      const fn = new Function("pageRoot", "document", "window", "builder", combinedJs);
      const cleanup = fn(pageRoot, document, window, builderApi);
      if (typeof cleanup === "function") return cleanup;
    } catch (err) {
      console.error("Custom JS error:", err);
    }
    return undefined;
  }, [combinedJs, currentPageId, builderApi]);

  useEffect(() => {
    if (!previewMode) return;
    const root = pageRootRef.current;
    if (!root) return;
    const sliders = Array.from(root.querySelectorAll('[data-ui2-slider],[data-slider-loop]'));
    sliders.forEach(initPreviewSlider);
  }, [previewMode, elements, viewportKey]);

  return (
    <div className="canvas-shell">
      <div className="canvas-toolbar">
        <div className="canvas-toolbar__label">Viewport</div>
        <Form.Select
          size="sm"
          className="canvas-toolbar__select"
          value={viewportPreset}
          onChange={(e) => {
            const next = VIEWPORTS.find(v => v.id === e.target.value) || VIEWPORTS[0];
            setViewport(next.id, next.key);
          }}
        >
          {VIEWPORTS.map(v => (
            <option key={v.id} value={v.id}>{v.label}</option>
          ))}
        </Form.Select>
        <button
          type="button"
          className={`btn btn-sm canvas-toolbar__toggle ${autoExpandBody ? "is-on" : "is-off"}`}
          onClick={toggleAutoExpandBody}
        >
          Auto Expand: {autoExpandBody ? "On" : "Off"}
        </button>

        <div className="canvas-toolbar__actions">
          <button
            type="button"
            className="btn btn-sm nav-btn nav-btn-css"
            onClick={toggleShowCssEditor}
          >
            {showCssEditor ? "Hide CSS" : "Edit CSS"}
          </button>
          <button
            type="button"
            className="btn btn-sm nav-btn nav-btn-js"
            onClick={toggleShowJsEditor}
          >
            {showJsEditor ? "Hide JS" : "JS Actions"}
          </button>
          <button
            type="button"
            className="btn btn-sm nav-btn nav-btn-split"
            onClick={toggleSplitEditors}
          >
            {splitEditors ? "Inline Editors" : "Split Editors"}
          </button>
          <button
            type="button"
            className="btn btn-sm nav-btn nav-btn-preview"
            onClick={togglePreviewMode}
          >
            {isPreviewMode ? "Exit Preview" : "Preview"}
          </button>
          <button
            type="button"
            className="btn btn-sm nav-btn nav-btn-addpage"
            onClick={handleOpenAddPageModal}
          >
            Add Page
          </button>
        </div>

        <div className="canvas-toolbar__meta">
          Editing: {viewportKey === "base" ? "Base" : viewportKey}
        </div>
      </div>

      {!previewMode && belowToolbar ? (
        <div className="canvas-toolbar-below">
          {belowToolbar}
        </div>
      ) : null}

      <div className="canvas-viewport" style={{ width: viewportWidth }}>
        <div
          className="border rounded shadow-sm position-relative page-root"
          style={{ ...(mergedBodyStyles || {}) }}
          {...safeBodyAttrs}
          ref={pageRootRef}
          onClick={(e) => {
            if (previewMode) return;
            if (e.target !== e.currentTarget) return;
            selectElement(null);
          }}
        >
          {(fileCss || customCss) && <style>{`${fileCss}\n${customCss}`}</style>}

      {elements.length === 0 && (
        <div 
          className="d-flex justify-content-center align-items-center text-muted border border-2 border-dashed rounded" 
          style={{ height: "100%", minHeight: "300px", backgroundColor: "#f8f9fa" }}
        >
          <div className="text-center">
            <i className="bi bi-plus-square-dotted fs-1 mb-2"></i>
            <h5>Drop elements here</h5>
            <small>Select a tool from the left to begin</small>
          </div>
        </div>
      )}

          {rootElements.map((element) => (
            <CanvasItem
              key={`${element.layoutSourcePageId}-${element.id}`}
              element={element}
              elements={elements}
              onSelect={previewMode ? undefined : selectElement}
              previewMode={previewMode}
              readOnly={Boolean(element.layoutReadOnly)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
