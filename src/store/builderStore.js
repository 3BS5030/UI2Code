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
  updateLayout,
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

const normalizeFileList = (list = [], fallbackPrefix = "file") => {
  if (!Array.isArray(list)) return [];
  return list.map((file, index) => ({
    id: Number.isFinite(Number(file?.id)) ? Number(file.id) : randomId(),
    name: typeof file?.name === "string" && file.name.trim() ? file.name : `${fallbackPrefix}-${index + 1}`,
    content: typeof file?.content === "string" ? file.content : ""
  }));
};

const normalizePages = (pages = []) => {
  if (!Array.isArray(pages)) return [];
  return pages
    .filter((page) => page && typeof page === "object")
    .map((page, index) => ({
      id: Number.isFinite(Number(page?.id)) ? Number(page.id) : randomId(),
      title: typeof page?.title === "string" && page.title.trim() ? page.title : `Page ${index + 1}`,
      route: typeof page?.route === "string" && page.route.trim() ? page.route : (index === 0 ? "/" : `/page-${index + 1}`),
      parentId: Number.isFinite(Number(page?.parentId)) ? Number(page.parentId) : null,
      description: typeof page?.description === "string" ? page.description : "",
      elements: Array.isArray(page?.elements) ? deepClone(page.elements) : [],
      bodyStyles: page?.bodyStyles && typeof page.bodyStyles === "object" ? deepClone(page.bodyStyles) : {},
      bodyResponsive: page?.bodyResponsive && typeof page.bodyResponsive === "object" ? deepClone(page.bodyResponsive) : {},
      bodyAttrs: page?.bodyAttrs && typeof page.bodyAttrs === "object" ? deepClone(page.bodyAttrs) : {},
      customCss: typeof page?.customCss === "string" ? page.customCss : "",
      customJs: typeof page?.customJs === "string" ? page.customJs : "",
      cssFiles: normalizeFileList(page?.cssFiles, "page-css"),
      jsFiles: normalizeFileList(page?.jsFiles, "page-js")
    }));
};

const buildSessionSnapshot = (state) => ({
  pages: deepClone(state.pages || []),
  customComponents: deepClone(state.customComponents || []),
  currentPageId: state.currentPageId ?? null,
  selectedElementId: state.selectedElementId ?? null,
  viewportPreset: state.viewportPreset || "auto",
  viewportKey: state.viewportKey || "base",
  previewMode: Boolean(state.previewMode),
  autoExpandBody: state.autoExpandBody !== false,
  globalCssFiles: deepClone(state.globalCssFiles || []),
  globalJsFiles: deepClone(state.globalJsFiles || []),
  showCssEditor: Boolean(state.showCssEditor),
  showJsEditor: Boolean(state.showJsEditor),
  splitEditors: Boolean(state.splitEditors)
});

const createFile = (name = "new") => ({
  id: Math.floor(Math.random() * 99999999),
  name,
  content: ""
});

const randomId = () => Math.floor(Math.random() * 99999999);

const deepClone = (value) => JSON.parse(JSON.stringify(value));

const collectSubtree = (elements = [], rootId) => {
  if (!rootId) return [];

  const byId = new Map(elements.map(el => [el.id, el]));
  if (!byId.has(rootId)) return [];

  const byParent = new Map();
  elements.forEach((el) => {
    const key = el.parentId ?? "__root__";
    if (!byParent.has(key)) byParent.set(key, []);
    byParent.get(key).push(el);
  });

  const result = [];
  const walk = (id) => {
    const node = byId.get(id);
    if (!node) return;
    result.push(node);
    const children = byParent.get(id) || [];
    children.forEach(child => walk(child.id));
  };

  walk(rootId);
  return result;
};

const buildClonedTemplateElements = (templateElements = [], targetParentId, existingElements = []) => {
  if (!templateElements.length) return { elements: [], rootId: null };

  const templateIds = new Set(templateElements.map(el => el.id));
  const used = new Set(existingElements.map(el => el.id));
  const idMap = new Map();

  const nextId = () => {
    let id = randomId();
    while (used.has(id) || idMap.has(id)) id = randomId();
    used.add(id);
    return id;
  };

  templateElements.forEach((el) => {
    idMap.set(el.id, nextId());
  });

  let firstRootId = null;
  const cloned = templateElements.map((el) => {
    const isRoot = !templateIds.has(el.parentId);
    const parentId = isRoot
      ? (targetParentId ?? null)
      : (idMap.get(el.parentId) ?? null);

    const next = {
      ...deepClone(el),
      id: idMap.get(el.id),
      parentId,
      lockedToParent: Boolean(parentId)
    };

    if (isRoot && firstRootId === null) firstRootId = next.id;
    return next;
  });

  return { elements: cloned, rootId: firstRootId };
};

export const useBuilderStore = create((set, get) => ({

  pages: [createPage()],
  customComponents: [],
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
      const result = get().restoreSessionFromSnapshot(snapshot);
      if (result?.ok) return;
    }

    if (state.pages.length > 0) {
      set({ currentPageId: state.pages[0].id });
    }
  },

  getSessionSnapshot: () => {
    const state = get();
    return buildSessionSnapshot(state);
  },

  restoreSessionFromSnapshot: (incomingSnapshot) => {
    try {
      const snapshot = typeof incomingSnapshot === "string"
        ? JSON.parse(incomingSnapshot)
        : incomingSnapshot;

      const pages = normalizePages(snapshot?.pages);
      if (!pages.length) {
        return { ok: false, message: "Invalid session file: no pages found." };
      }

      const customComponents = Array.isArray(snapshot?.customComponents)
        ? deepClone(snapshot.customComponents)
        : [];
      const globalCssFiles = normalizeFileList(snapshot?.globalCssFiles, "global-css");
      const globalJsFiles = normalizeFileList(snapshot?.globalJsFiles, "global-js");

      const currentPageId = pages.some((page) => page.id === snapshot?.currentPageId)
        ? snapshot.currentPageId
        : pages[0].id;

      const pageById = new Map(pages.map((page) => [page.id, page]));
      const selectedElementId =
        Number.isFinite(Number(snapshot?.selectedElementId)) &&
        (pageById.get(currentPageId)?.elements || []).some((el) => el.id === snapshot.selectedElementId)
          ? snapshot.selectedElementId
          : null;

      const nextState = {
        pages,
        customComponents,
        currentPageId,
        selectedElementId,
        viewportPreset: snapshot?.viewportPreset || "auto",
        viewportKey: snapshot?.viewportKey || "base",
        previewMode: Boolean(snapshot?.previewMode),
        autoExpandBody: snapshot?.autoExpandBody !== false,
        globalCssFiles,
        globalJsFiles,
        showCssEditor: Boolean(snapshot?.showCssEditor),
        showJsEditor: Boolean(snapshot?.showJsEditor),
        splitEditors: Boolean(snapshot?.splitEditors),
        highlightContainerId: null,
        hoverContainerId: null,
        draggingElementId: null,
        attachHoldElementId: null,
        attachHoldContainerId: null
      };

      set(() => nextState);

      if (typeof window !== "undefined") {
        try {
          const stored = buildSessionSnapshot({ ...get(), ...nextState });
          sessionStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
        } catch (err) {
          console.error("Session persist error:", err);
        }
      }

      return { ok: true };
    } catch (err) {
      console.error("Session import error:", err);
      return { ok: false, message: "Invalid session file format." };
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

    return newEl.id;
  },

  // Save selected element subtree as reusable component
  saveSelectedAsComponent: (id, name = "") => {
    const state = get();
    const currentPage = state.pages.find(p => p.id === state.currentPageId);
    const elements = currentPage?.elements || [];
    const selected = elements.find(el => el.id === id);

    if (!selected) {
      return { ok: false, message: "No element selected." };
    }

    const subtree = collectSubtree(elements, id);
    if (!subtree.length) {
      return { ok: false, message: "Could not capture element tree." };
    }

    const label = String(name || `${selected.type} Component`).trim() || `${selected.type} Component`;
    const existingIds = new Set(state.customComponents.map(c => c.id));
    let componentId = randomId();
    while (existingIds.has(componentId)) componentId = randomId();

    const component = {
      id: componentId,
      name: label,
      rootType: selected.type || "div",
      elements: subtree.map(el => deepClone(el))
    };

    set((prev) => ({
      customComponents: [...prev.customComponents, component]
    }));

    return { ok: true, component };
  },

  // Add saved reusable component to current page
  addSavedComponent: (componentId, parentId = null) => {
    const state = get();
    const component = state.customComponents.find(c => c.id === componentId);
    if (!component) {
      return { ok: false, message: "Saved component not found." };
    }

    let insertedRootId = null;

    set((prev) => ({
      pages: prev.pages.map((p) => {
        if (p.id !== prev.currentPageId) return p;
        const clone = buildClonedTemplateElements(component.elements || [], parentId, p.elements || []);
        if (!clone.elements.length) return p;
        insertedRootId = clone.rootId;
        return {
          ...p,
          elements: [...(p.elements || []), ...clone.elements]
        };
      }),
      selectedElementId: insertedRootId || prev.selectedElementId
    }));

    if (!insertedRootId) {
      return { ok: false, message: "Could not insert saved component." };
    }

    return { ok: true, rootId: insertedRootId };
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

  // Toggle element as inherited layout source
  setElementLayout: (id, isLayout) => {
    set(state => ({
      pages: state.pages.map(p => {
        if (p.id !== state.currentPageId) return p;
        return {
          ...p,
          elements: updateLayout(p.elements, id, isLayout)
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
