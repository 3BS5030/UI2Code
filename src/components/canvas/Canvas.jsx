import React, { useEffect, useMemo, useRef } from "react";
import { Container, Form } from "react-bootstrap";
import { useBuilderStore } from "../../store/builderStore";
import CanvasItem from "./CanvasItem";
import { VIEWPORTS } from "../../core/viewports";

export default function Canvas({ previewMode = false }) {
  const currentPageId = useBuilderStore(state => state.currentPageId);
  const pages = useBuilderStore(state => state.pages);
  const selectElement = useBuilderStore(state => state.selectElement);
  const selectPage = useBuilderStore(state => state.selectPage);
  const viewportPreset = useBuilderStore(state => state.viewportPreset);
  const viewportKey = useBuilderStore(state => state.viewportKey);
  const setViewport = useBuilderStore(state => state.setViewport);
  const autoExpandBody = useBuilderStore(state => state.autoExpandBody);
  const toggleAutoExpandBody = useBuilderStore(state => state.toggleAutoExpandBody);
  const globalCssFiles = useBuilderStore(state => state.globalCssFiles);
  const globalJsFiles = useBuilderStore(state => state.globalJsFiles);

  const currentPage = pages.find(p => p.id === currentPageId);
  const elements = currentPage?.elements || [];
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
  const mergedBodyStyles = viewportKey === "base"
    ? { ...bodyStyles }
    : { ...bodyStyles, ...responsiveOverride };
  if (viewportKey !== "base" && !Object.prototype.hasOwnProperty.call(responsiveOverride, "minWidth")) {
    delete mergedBodyStyles.minWidth;
  }
  if (!mergedBodyStyles.minHeight) mergedBodyStyles.minHeight = "100vh";

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

  const combinedJs = useMemo(() => {
    return [fileJs, customJs].filter(Boolean).join("\n");
  }, [fileJs, customJs]);

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

  return (
    <div className="canvas-shell">
      {!previewMode && (
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
          <div className="canvas-toolbar__meta">
            Editing: {viewportKey === "base" ? "Base" : viewportKey}
          </div>
        </div>
      )}

      <div className="canvas-viewport" style={{ width: viewportWidth }}>
        <Container
          className="bg-white border rounded shadow-sm p-4 position-relative page-root"
          style={{ ...(mergedBodyStyles || {}) }}
          minHeight={"160vh"}
          {...safeBodyAttrs}
          ref={pageRootRef}
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
              key={element.id}
              element={element}
              elements={elements}
              onSelect={previewMode ? undefined : selectElement}
              previewMode={previewMode}
            />
          ))}
        </Container>
      </div>
    </div>
  );
}
