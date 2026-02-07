import { create } from "zustand";
import {
  addElement,
  updateProps,
  updateStyles,
  setStyles,
  updateResponsiveStyles,
  setResponsiveStyles,
  updatePseudoStyles,
  setPseudoStyles,
  updateAnimation,
  setAttributes,
  updateParent,
  updateLock,
  deleteElement,
  selectElement
} from "./builderFunctions.js";

const STORAGE_KEY = "uibuilder:session";

const createPage = (overrides = {}) => {
  const id = Math.floor(Math.random() * 99999999);
  return {
    id,
    title: overrides.title || "Home",
    route: overrides.route || "/",
    parentId: overrides.parentId || null,
    description: overrides.description || "",
    elements: overrides.elements || [],
    bodyStyles: overrides.bodyStyles || {},
    bodyResponsive: overrides.bodyResponsive || {},
    bodyAttrs: overrides.bodyAttrs || {},
    customCss: overrides.customCss || "",
    customJs: overrides.customJs || "",
    cssFiles: overrides.cssFiles || [],
    jsFiles: overrides.jsFiles || []
  };
};

const loadSessionSnapshot = () => {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.pages) || parsed.pages.length === 0) return null;
    return parsed;
  } catch (err) {
    console.error("Session restore error:", err);
    return null;
  }
};

const createFile = (name = "new") => ({
  id: Math.floor(Math.random() * 99999999),
  name,
  content: ""
});

export const useBuilderStore = create((set, get) => ({

  pages: [createPage()],
  currentPageId: null,
  viewportPreset: "auto",
  viewportKey: "base",
  previewMode: false,
  showCssEditor: false,
  showJsEditor: false,
  splitEditors: false,
  autoExpandBody: true,

  globalCssFiles: [],
  globalJsFiles: [],

  selectedElementId: null,
  highlightContainerId: null,
  hoverContainerId: null,
  draggingElementId: null,
  attachHoldElementId: null,
  attachHoldContainerId: null,

  // Init current page once
  initPages: () => {
    const state = get();
    if (state.currentPageId) return;

    const snapshot = loadSessionSnapshot();
    if (snapshot) {
      const currentId = snapshot.currentPageId || snapshot.pages[0]?.id || null;
      set({
        pages: snapshot.pages,
        currentPageId: currentId,
        viewportPreset: snapshot.viewportPreset || "auto",
        viewportKey: snapshot.viewportKey || "base",
        globalCssFiles: snapshot.globalCssFiles || [],
        globalJsFiles: snapshot.globalJsFiles || [],
        showCssEditor: Boolean(snapshot.showCssEditor),
        showJsEditor: Boolean(snapshot.showJsEditor),
        splitEditors: Boolean(snapshot.splitEditors)
      });
      return;
    }

    if (state.pages.length > 0) {
      set({ currentPageId: state.pages[0].id });
    }
  },

  getCurrentPage: () => {
    const state = get();
    return state.pages.find(p => p.id === state.currentPageId);
  },

  // Add page with defaults from first page
  addPage: (pageInfo = {}) => {
    set(state => {
      const first = state.pages[0] || {};
      const nextPage = createPage({
        title: pageInfo.title || first.title || "Home",
        route: pageInfo.route || first.route || "/",
        parentId: pageInfo.parentId || null,
        description: pageInfo.description || first.description || "",
        bodyStyles: first.bodyStyles || {},
        bodyResponsive: first.bodyResponsive || {},
        bodyAttrs: first.bodyAttrs || {},
        customCss: first.customCss || "",
        customJs: first.customJs || "",
        cssFiles: [],
        jsFiles: []
      });

      return {
        pages: [...state.pages, nextPage],
        currentPageId: nextPage.id,
        selectedElementId: null
      };
    });
  },

  // Update page metadata
  updatePage: (id, data) => {
    set(state => ({
      pages: state.pages.map(p => (p.id === id ? { ...p, ...data } : p))
    }));
  },

  // Select page
  selectPage: (id) => {
    set(state => ({
      currentPageId: id,
      selectedElementId: null
    }));
  },

  setPagesSnapshot: (snapshot) => {
    if (!snapshot || !Array.isArray(snapshot.pages)) return;
    set(() => ({
      pages: snapshot.pages,
      currentPageId: snapshot.currentPageId || snapshot.pages[0]?.id || null,
      selectedElementId: null
    }));
  },

  setPreviewMode: (value) => {
    set(() => ({ previewMode: Boolean(value) }));
  },

  togglePreviewMode: () => {
    set(state => ({ previewMode: !state.previewMode }));
  },

  setShowCssEditor: (value) => {
    set(() => ({ showCssEditor: Boolean(value) }));
  },

  setShowJsEditor: (value) => {
    set(() => ({ showJsEditor: Boolean(value) }));
  },

  toggleShowCssEditor: () => {
    set(state => ({ showCssEditor: !state.showCssEditor }));
  },

  toggleShowJsEditor: () => {
    set(state => ({ showJsEditor: !state.showJsEditor }));
  },

  toggleSplitEditors: () => {
    set(state => ({ splitEditors: !state.splitEditors }));
  },

  toggleAutoExpandBody: () => {
    set(state => ({ autoExpandBody: !state.autoExpandBody }));
  },

  // Viewport
  setViewport: (preset, key) => {
    set(() => ({
      viewportPreset: preset,
      viewportKey: key
    }));
  },

  // Global CSS/JS files
  addGlobalCssFile: (name) => {
    set(state => ({
      globalCssFiles: [...state.globalCssFiles, createFile(name || "global")]
    }));
  },

  updateGlobalCssFile: (id, data) => {
    set(state => ({
      globalCssFiles: state.globalCssFiles.map(f => (f.id === id ? { ...f, ...data } : f))
    }));
  },

  deleteGlobalCssFile: (id) => {
    set(state => ({
      globalCssFiles: state.globalCssFiles.filter(f => f.id !== id)
    }));
  },

  addGlobalJsFile: (name) => {
    set(state => ({
      globalJsFiles: [...state.globalJsFiles, createFile(name || "global")]
    }));
  },

  updateGlobalJsFile: (id, data) => {
    set(state => ({
      globalJsFiles: state.globalJsFiles.map(f => (f.id === id ? { ...f, ...data } : f))
    }));
  },

  deleteGlobalJsFile: (id) => {
    set(state => ({
      globalJsFiles: state.globalJsFiles.filter(f => f.id !== id)
    }));
  },

  // Page CSS/JS files (current page)
  addPageCssFile: (name) => {
    set(state => ({
      pages: state.pages.map(p => {
        if (p.id !== state.currentPageId) return p;
        return {
          ...p,
          cssFiles: [...(p.cssFiles || []), createFile(name || "page")]
        };
      })
    }));
  },

  updatePageCssFile: (id, data) => {
    set(state => ({
      pages: state.pages.map(p => {
        if (p.id !== state.currentPageId) return p;
        return {
          ...p,
          cssFiles: (p.cssFiles || []).map(f => (f.id === id ? { ...f, ...data } : f))
        };
      })
    }));
  },

  deletePageCssFile: (id) => {
    set(state => ({
      pages: state.pages.map(p => {
        if (p.id !== state.currentPageId) return p;
        return {
          ...p,
          cssFiles: (p.cssFiles || []).filter(f => f.id !== id)
        };
      })
    }));
  },

  addPageJsFile: (name) => {
    set(state => ({
      pages: state.pages.map(p => {
        if (p.id !== state.currentPageId) return p;
        return {
          ...p,
          jsFiles: [...(p.jsFiles || []), createFile(name || "page")]
        };
      })
    }));
  },

  updatePageJsFile: (id, data) => {
    set(state => ({
      pages: state.pages.map(p => {
        if (p.id !== state.currentPageId) return p;
        return {
          ...p,
          jsFiles: (p.jsFiles || []).map(f => (f.id === id ? { ...f, ...data } : f))
        };
      })
    }));
  },

  deletePageJsFile: (id) => {
    set(state => ({
      pages: state.pages.map(p => {
        if (p.id !== state.currentPageId) return p;
        return {
          ...p,
          jsFiles: (p.jsFiles || []).filter(f => f.id !== id)
        };
      })
    }));
  },

  setHighlightContainer: (id) => {
    set(() => ({ highlightContainerId: id }));
  },

  clearHighlightContainer: () => {
    set(() => ({ highlightContainerId: null }));
  },

  setHoverContainer: (id) => {
    set(() => ({ hoverContainerId: id }));
  },

  clearHoverContainer: () => {
    set(() => ({ hoverContainerId: null }));
  },

  setDraggingElement: (id) => {
    set(() => ({ draggingElementId: id }));
  },

  clearDraggingElement: () => {
    set(() => ({ draggingElementId: null }));
  },

  setAttachHoldElement: (id) => {
    set(() => ({ attachHoldElementId: id }));
  },

  clearAttachHoldElement: () => {
    set(() => ({ attachHoldElementId: null }));
  },

  setAttachHoldContainer: (id) => {
    set(() => ({ attachHoldContainerId: id }));
  },

  clearAttachHoldContainer: () => {
    set(() => ({ attachHoldContainerId: null }));
  },

  // Add element
  addElement: (initialProps, type, parentId = null) => {
    const newEl = addElement(initialProps, type, parentId);

    set(state => ({
      pages: state.pages.map(p => {
        if (p.id !== state.currentPageId) return p;
        return {
          ...p,
          elements: [...p.elements, newEl]
        };
      })
    }));
  },

  // Update props (merge)
  updateProps: (id, newProps) => {
    set(state => ({
      pages: state.pages.map(p => {
        if (p.id !== state.currentPageId) return p;
        return {
          ...p,
          elements: updateProps(p.elements, id, newProps)
        };
      })
    }));
  },

  // Update styles (merge)
  updateStyles: (id, newStyles) => {
    set(state => ({
      pages: state.pages.map(p => {
        if (p.id !== state.currentPageId) return p;
        return {
          ...p,
          elements: updateStyles(p.elements, id, newStyles)
        };
      })
    }));
  },

  // Update responsive styles (merge)
  updateResponsiveStyles: (id, viewportKey, newStyles) => {
    set(state => ({
      pages: state.pages.map(p => {
        if (p.id !== state.currentPageId) return p;
        return {
          ...p,
          elements: updateResponsiveStyles(p.elements, id, viewportKey, newStyles)
        };
      })
    }));
  },

  // Set styles (replace)
  setStyles: (id, styles) => {
    set(state => ({
      pages: state.pages.map(p => {
        if (p.id !== state.currentPageId) return p;
        return {
          ...p,
          elements: setStyles(p.elements, id, styles)
        };
      })
    }));
  },

  // Set responsive styles (replace)
  setResponsiveStyles: (id, viewportKey, styles) => {
    set(state => ({
      pages: state.pages.map(p => {
        if (p.id !== state.currentPageId) return p;
        return {
          ...p,
          elements: setResponsiveStyles(p.elements, id, viewportKey, styles)
        };
      })
    }));
  },

  // Update pseudo styles (merge)
  updatePseudoStyles: (id, stateKey, newStyles) => {
    set(state => ({
      pages: state.pages.map(p => {
        if (p.id !== state.currentPageId) return p;
        return {
          ...p,
          elements: updatePseudoStyles(p.elements, id, stateKey, newStyles)
        };
      })
    }));
  },

  // Set pseudo styles (replace)
  setPseudoStyles: (id, stateKey, styles) => {
    set(state => ({
      pages: state.pages.map(p => {
        if (p.id !== state.currentPageId) return p;
        return {
          ...p,
          elements: setPseudoStyles(p.elements, id, stateKey, styles)
        };
      })
    }));
  },

  // Update animation (merge)
  updateAnimation: (id, newAnim) => {
    set(state => ({
      pages: state.pages.map(p => {
        if (p.id !== state.currentPageId) return p;
        return {
          ...p,
          elements: updateAnimation(p.elements, id, newAnim)
        };
      })
    }));
  },

  // Set attributes (replace)
  setAttributes: (id, attrs) => {
    set(state => ({
      pages: state.pages.map(p => {
        if (p.id !== state.currentPageId) return p;
        return {
          ...p,
          elements: setAttributes(p.elements, id, attrs)
        };
      })
    }));
  },

  // Set element parent
  setElementParent: (id, parentId) => {
    set(state => ({
      pages: state.pages.map(p => {
        if (p.id !== state.currentPageId) return p;
        return {
          ...p,
          elements: updateParent(p.elements, id, parentId)
        };
      })
    }));
  },

  // Set element lock
  setElementLock: (id, locked) => {
    set(state => ({
      pages: state.pages.map(p => {
        if (p.id !== state.currentPageId) return p;
        return {
          ...p,
          elements: updateLock(p.elements, id, locked)
        };
      })
    }));
  },

  // Delete element
  deleteElement: (id) => {
    set(state => ({
      pages: state.pages.map(p => {
        if (p.id !== state.currentPageId) return p;
        return {
          ...p,
          elements: deleteElement(p.elements, id)
        };
      }),
      selectedElementId: null
    }));
  },

  // Select element
  selectElement: (id) => {
    set(state => selectElement(state, id));
  },

  // Body styles (merge)
  updateBodyStyles: (newStyles) => {
    set(state => ({
      pages: state.pages.map(p => {
        if (p.id !== state.currentPageId) return p;
        return {
          ...p,
          bodyStyles: { ...p.bodyStyles, ...newStyles }
        };
      })
    }));
  },

  // Body responsive styles (merge)
  updateBodyResponsiveStyles: (viewportKey, newStyles) => {
    set(state => ({
      pages: state.pages.map(p => {
        if (p.id !== state.currentPageId) return p;
        const current = p.bodyResponsive || {};
        return {
          ...p,
          bodyResponsive: {
            ...current,
            [viewportKey]: {
              ...(current[viewportKey] || {}),
              ...newStyles
            }
          }
        };
      })
    }));
  },

  // Body styles (replace)
  setBodyStyles: (styles) => {
    set(state => ({
      pages: state.pages.map(p => {
        if (p.id !== state.currentPageId) return p;
        return {
          ...p,
          bodyStyles: { ...styles }
        };
      })
    }));
  },

  // Body responsive styles (replace)
  setBodyResponsiveStyles: (viewportKey, styles) => {
    set(state => ({
      pages: state.pages.map(p => {
        if (p.id !== state.currentPageId) return p;
        const current = p.bodyResponsive || {};
        return {
          ...p,
          bodyResponsive: {
            ...current,
            [viewportKey]: { ...styles }
          }
        };
      })
    }));
  },

  // Body attributes (replace)
  setBodyAttrs: (attrs) => {
    set(state => ({
      pages: state.pages.map(p => {
        if (p.id !== state.currentPageId) return p;
        return {
          ...p,
          bodyAttrs: { ...attrs }
        };
      })
    }));
  },

  // Custom CSS (replace)
  setCustomCss: (cssText) => {
    set(state => ({
      pages: state.pages.map(p => {
        if (p.id !== state.currentPageId) return p;
        return {
          ...p,
          customCss: cssText || ""
        };
      })
    }));
  },

  // Custom JS (replace)
  setCustomJs: (jsText) => {
    set(state => ({
      pages: state.pages.map(p => {
        if (p.id !== state.currentPageId) return p;
        return {
          ...p,
          customJs: jsText || ""
        };
      })
    }));
  }

}));
