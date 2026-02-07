import React, { useEffect } from "react";

import Navbar from "./components/layout/Navbar";
import Toolbox from "./components/toolbox/Toolbox";
import Canvas from "./components/canvas/Canvas";
import PropertiesPanel from "./components/properties/PropertiesPanel";
import EditorsPanel from "./components/layout/EditorsPanel";
import { useBuilderStore } from "./store/builderStore";

import "./index.css";

const STORAGE_KEY = "uibuilder:session";

export default function App() {
  const initPages = useBuilderStore(state => state.initPages);
  const previewMode = useBuilderStore(state => state.previewMode);
  const splitEditors = useBuilderStore(state => state.splitEditors);
  const showCssEditor = useBuilderStore(state => state.showCssEditor);
  const showJsEditor = useBuilderStore(state => state.showJsEditor);

  useEffect(() => {
    initPages();
  }, [initPages]);

  useEffect(() => {
    const unsubscribe = useBuilderStore.subscribe((state) => {
      try {
        const snapshot = {
          pages: state.pages,
          currentPageId: state.currentPageId,
          viewportPreset: state.viewportPreset,
          viewportKey: state.viewportKey,
          globalCssFiles: state.globalCssFiles,
          globalJsFiles: state.globalJsFiles,
          showCssEditor: state.showCssEditor,
          showJsEditor: state.showJsEditor,
          splitEditors: state.splitEditors
        };
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
      } catch (err) {
        console.error("Session save error:", err);
      }
    });
    return unsubscribe;
  }, []);

  return (
    <div className="app-container">

      {/* ===== Navbar ===== */}
      <Navbar />

      {/* ===== Main Layout ===== */}
      <div className="builder-layout">

        {/* Left - Tools */}
        {!previewMode && (
          <aside className="sidebar">
            <Toolbox />
          </aside>
        )}

        {/* Center - Canvas */}
        <main className={`main-canvas${previewMode ? " is-preview" : ""}`}>
          {previewMode && <Canvas previewMode />}
          {!previewMode && !splitEditors && (
            <div className="canvas-inline">
              {(showCssEditor || showJsEditor) && (
                <div className="canvas-inline__editors">
                  <EditorsPanel />
                </div>
              )}
              <Canvas />
            </div>
          )}
          {!previewMode && splitEditors && (
            <div className="canvas-split">
              <div className="canvas-split__canvas">
                <Canvas />
              </div>
              <div className="canvas-split__editors">
                <EditorsPanel />
              </div>
            </div>
          )}
        </main>

        {/* Right - Properties */}
        {!previewMode && (
          <aside className="properties-bar">
            <PropertiesPanel />
          </aside>
        )}

      </div>

    </div>
  );
}
