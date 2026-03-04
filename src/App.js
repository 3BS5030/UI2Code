import React, { useEffect, useRef } from "react";

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

  const undoStackRef = useRef([]);
  const redoStackRef = useRef([]);
  const prevSnapshotRef = useRef(null);
  const prevHashRef = useRef("");
  const isApplyingHistoryRef = useRef(false);

  useEffect(() => {
    initPages();
  }, [initPages]);

  useEffect(() => {
    const getSnapshot = (state) => (
      typeof state.getSessionSnapshot === "function"
        ? state.getSessionSnapshot()
        : {
            pages: state.pages,
            customComponents: state.customComponents,
            currentPageId: state.currentPageId,
            viewportPreset: state.viewportPreset,
            viewportKey: state.viewportKey,
            previewMode: state.previewMode,
            autoExpandBody: state.autoExpandBody,
            globalCssFiles: state.globalCssFiles,
            globalJsFiles: state.globalJsFiles,
            showCssEditor: state.showCssEditor,
            showJsEditor: state.showJsEditor,
            splitEditors: state.splitEditors
          }
    );

    const syncBaseline = () => {
      try {
        const base = getSnapshot(useBuilderStore.getState());
        prevSnapshotRef.current = base;
        prevHashRef.current = JSON.stringify(base);
      } catch (err) {
        prevSnapshotRef.current = null;
        prevHashRef.current = "";
      }
    };

    const applySnapshot = (snapshot) => {
      if (!snapshot) return;
      isApplyingHistoryRef.current = true;
      try {
        const restore = useBuilderStore.getState().restoreSessionFromSnapshot;
        if (typeof restore === "function") {
          restore(snapshot);
        }
        prevSnapshotRef.current = snapshot;
        prevHashRef.current = JSON.stringify(snapshot);
      } finally {
        isApplyingHistoryRef.current = false;
      }
    };

    const requestUndo = () => {
      if (!undoStackRef.current.length) return;
      const current = getSnapshot(useBuilderStore.getState());
      if (current) {
        redoStackRef.current.push(current);
        if (redoStackRef.current.length > 100) redoStackRef.current.shift();
      }
      const previous = undoStackRef.current.pop();
      applySnapshot(previous);
    };

    const onUndoHotkey = (event) => {
      const key = String(event.key || "").toLowerCase();
      const isUndo = (event.ctrlKey || event.metaKey) && !event.shiftKey && key === "z";
      if (!isUndo) return;

      const target = event.target;
      const tag = String(target?.tagName || "").toLowerCase();
      const isEditable =
        Boolean(target?.isContentEditable) ||
        tag === "input" ||
        tag === "textarea" ||
        tag === "select";
      if (isEditable) return;

      event.preventDefault();
      requestUndo();
    };

    const onUndoRequest = () => {
      requestUndo();
    };

    syncBaseline();

    const unsubscribe = useBuilderStore.subscribe((state) => {
      try {
        const snapshot = getSnapshot(state);
        const hash = JSON.stringify(snapshot);

        if (hash !== prevHashRef.current) {
          if (!isApplyingHistoryRef.current && prevSnapshotRef.current) {
            undoStackRef.current.push(prevSnapshotRef.current);
            if (undoStackRef.current.length > 100) undoStackRef.current.shift();
            redoStackRef.current = [];
          }
          prevSnapshotRef.current = snapshot;
          prevHashRef.current = hash;
        }

        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
      } catch (err) {
        console.error("Session save error:", err);
      }
    });

    window.addEventListener("keydown", onUndoHotkey);
    window.addEventListener("ui2code:undo-request", onUndoRequest);

    return () => {
      window.removeEventListener("keydown", onUndoHotkey);
      window.removeEventListener("ui2code:undo-request", onUndoRequest);
      unsubscribe();
    };
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
              <Canvas
                belowToolbar={(showCssEditor || showJsEditor) ? (
                  <div className="canvas-inline__editors">
                    <EditorsPanel />
                  </div>
                ) : null}
              />
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
