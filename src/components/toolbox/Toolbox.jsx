import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Card, Button, Modal, Form } from "react-bootstrap";
import { useBuilderStore } from "../../store/builderStore";

const POPULAR_TAGS = [
  { type: "flex", label: "Add Flex", icon: "bi-distribute-horizontal" },
  { type: "grid", label: "Add Grid", icon: "bi-grid-3x3-gap" },
  { type: "navbar", label: "Add Navbar", icon: "bi-menu-app" },
  { type: "slider", label: "Add Slider", icon: "bi-layout-sidebar-inset" },
  { type: "text", label: "Add Text", icon: "bi-fonts" },
  { type: "button", label: "Add Button", icon: "bi-hand-index-thumb" },
  { type: "image", label: "Add Image", icon: "bi-image" },
  { type: "h1", label: "Add H1", icon: "bi-type-h1" },
  { type: "h2", label: "Add H2", icon: "bi-type-h2" },
  { type: "h3", label: "Add H3", icon: "bi-type-h3" },
  { type: "p", label: "Add Paragraph", icon: "bi-text-paragraph" },
  { type: "a", label: "Add Link", icon: "bi-link-45deg" },
  { type: "div", label: "Add Div", icon: "bi-square" },
  { type: "section", label: "Add Section", icon: "bi-layout-text-window" },
  { type: "span", label: "Add Span", icon: "bi-textarea-t" },
  { type: "input", label: "Add Input", icon: "bi-input-cursor" },
  { type: "textarea", label: "Add Textarea", icon: "bi-input-cursor-text" },
  { type: "select", label: "Add Select", icon: "bi-ui-checks" },
  { type: "iframe", label: "Add Iframe", icon: "bi-layout-text-window" }
];

const ALL_TAGS = [
  ...POPULAR_TAGS,
  { type: "article", label: "Add Article" },
  { type: "aside", label: "Add Aside" },
  { type: "header", label: "Add Header" },
  { type: "footer", label: "Add Footer" },
  { type: "main", label: "Add Main" },
  { type: "nav", label: "Add Nav" },
  { type: "figure", label: "Add Figure" },
  { type: "figcaption", label: "Add Figcaption" },
  { type: "blockquote", label: "Add Blockquote" },
  { type: "pre", label: "Add Pre" },
  { type: "code", label: "Add Code" },
  { type: "small", label: "Add Small" },
  { type: "strong", label: "Add Strong" },
  { type: "em", label: "Add Em" },
  { type: "mark", label: "Add Mark" },
  { type: "u", label: "Add Underline" },
  { type: "s", label: "Add Strikethrough" },
  { type: "hr", label: "Add HR" },
  { type: "br", label: "Add BR" },
  { type: "ul", label: "Add UL" },
  { type: "ol", label: "Add OL" },
  { type: "li", label: "Add LI" },
  { type: "dl", label: "Add DL" },
  { type: "dt", label: "Add DT" },
  { type: "dd", label: "Add DD" },
  { type: "table", label: "Add Table" },
  { type: "thead", label: "Add Thead" },
  { type: "tbody", label: "Add Tbody" },
  { type: "tfoot", label: "Add Tfoot" },
  { type: "tr", label: "Add TR" },
  { type: "th", label: "Add TH" },
  { type: "td", label: "Add TD" },
  { type: "form", label: "Add Form" },
  { type: "label", label: "Add Label" },
  { type: "fieldset", label: "Add Fieldset" },
  { type: "legend", label: "Add Legend" },
  { type: "option", label: "Add Option" },
  { type: "optgroup", label: "Add Optgroup" },
  { type: "meter", label: "Add Meter" },
  { type: "progress", label: "Add Progress" },
  { type: "details", label: "Add Details" },
  { type: "summary", label: "Add Summary" },
  { type: "img", label: "Add Img" },
  { type: "picture", label: "Add Picture" },
  { type: "source", label: "Add Source" },
  { type: "audio", label: "Add Audio" },
  { type: "video", label: "Add Video" },
  { type: "track", label: "Add Track" },
  { type: "canvas", label: "Add Canvas" },
  { type: "svg", label: "Add SVG" },
  { type: "path", label: "Add Path" },
  { type: "g", label: "Add SVG Group" },
  { type: "circle", label: "Add Circle" },
  { type: "rect", label: "Add Rect" },
  { type: "line", label: "Add Line" },
  { type: "polyline", label: "Add Polyline" },
  { type: "polygon", label: "Add Polygon" },
  { type: "embed", label: "Add Embed" },
  { type: "object", label: "Add Object" },
  { type: "param", label: "Add Param" },
  { type: "portal", label: "Add Portal" },
  { type: "map", label: "Add Map" },
  { type: "area", label: "Add Area" }
];

const UNIQUE_TAGS = Array.from(
  new Map(ALL_TAGS.map(item => [item.type, item])).values()
);

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

const FLEX_CHILD_TYPES = [
  { type: "div", label: "Div" },
  { type: "section", label: "Section" },
  { type: "text", label: "Text" },
  { type: "button", label: "Button" },
  { type: "input", label: "Input" },
  { type: "textarea", label: "Textarea" },
  { type: "image", label: "Image" },
  { type: "h2", label: "Heading 2" },
  { type: "p", label: "Paragraph" }
];

const SAVED_TYPE_PREFIX = "saved:";

const isSavedChildType = (type) =>
  typeof type === "string" && type.startsWith(SAVED_TYPE_PREFIX);

const getSavedComponentIdFromType = (type) => {
  if (!isSavedChildType(type)) return null;
  const id = Number(type.slice(SAVED_TYPE_PREFIX.length));
  return Number.isFinite(id) ? id : null;
};

const DEFAULT_FLEX_CONFIG = {
  count: 2,
  direction: "row",
  justifyContent: "space-between",
  alignItems: "stretch",
  wrap: "wrap",
  gap: 12,
  itemSizing: "equal",
  childType: "div"
};

const DEFAULT_GRID_CONFIG = {
  count: 4,
  childType: "div",
  columns: "2",
  gap: 12,
  rowHeight: "auto",
  justifyItems: "stretch",
  alignItems: "stretch",
  autoFlow: "row"
};

const DEFAULT_CREATE_CONFIG = {
  text: "",
  src: "",
  alt: "",
  href: "",
  target: "",
  placeholder: "",
  defaultValue: "",
  width: "",
  widthUnit: "%",
  height: "",
  heightUnit: "px"
};

const DEFAULT_NAVBAR_CONFIG = {
  brandText: "Brand",
  linksCount: 4,
  linkPrefix: "Link",
  showButton: true,
  buttonText: "Register",
  bgColor: "#ffffff",
  textColor: "#0f172a",
  minHeight: 72
};

const DEFAULT_SLIDER_CONFIG = {
  slidesCount: 3,
  titlePrefix: "Slide",
  slideHeight: 280,
  showArrows: true,
  showDots: true,
  loop: true,
  slideContentSource: "default"
};

const getInitialPropsByType = (type) => {
  if (type === "text") return { text: "New Text" };
  if (type === "button") return { text: "Button" };
  if (type === "image" || type === "img") return { src: "https://via.placeholder.com/200", alt: "image" };
  if (type === "h1") return { text: "Heading 1" };
  if (type === "h2") return { text: "Heading 2" };
  if (type === "h3") return { text: "Heading 3" };
  if (type === "p" || type === "paragraph") return { text: "Paragraph text" };
  if (type === "a") return { text: "Link", href: "/", target: "" };
  if (type === "iframe") return { src: "https://example.com", title: "iframe" };
  if (type === "input") return { placeholder: "Input", defaultValue: "" };
  if (type === "textarea") return { defaultValue: "Textarea" };
  if (type === "select") return { text: "Option" };
  if (type === "option") return { text: "Option" };
  if (type === "details") return { text: "Details content" };
  if (type === "summary") return { text: "Summary" };
  if (type === "label") return { text: "Label" };
  if (type === "blockquote") return { text: "Quote" };
  if (type === "code") return { text: "Code" };
  if (type === "pre") return { text: "Preformatted" };
  if (type === "small") return { text: "Small text" };
  if (type === "strong") return { text: "Strong text" };
  if (type === "em") return { text: "Em text" };
  if (type === "mark") return { text: "Mark" };
  if (type === "u") return { text: "Underline" };
  if (type === "s") return { text: "Strikethrough" };
  if (type === "li") return { text: "List item" };
  if (type === "th") return { text: "Header" };
  if (type === "td") return { text: "Cell" };
  if (type === "meter") return { value: 0.6, min: 0, max: 1 };
  if (type === "progress") return { value: 40, max: 100 };
  if (type === "audio" || type === "video") return { controls: true, src: "" };
  if (type === "canvas" || type === "svg") return { text: "" };
  return { text: type };
};

const getCreateDefaultsByType = (type) => {
  const baseProps = getInitialPropsByType(type);
  return {
    ...DEFAULT_CREATE_CONFIG,
    text: baseProps.text || "",
    src: baseProps.src || "",
    alt: baseProps.alt || "",
    href: baseProps.href || "",
    target: baseProps.target || "",
    placeholder: baseProps.placeholder || "",
    defaultValue: baseProps.defaultValue || ""
  };
};

const supportsTextValue = (type) => (
  [
    "text", "button", "h1", "h2", "h3", "p", "paragraph", "a", "link",
    "label", "blockquote", "code", "pre", "small", "strong", "em", "mark",
    "u", "s", "li", "th", "td", "summary", "option", "legend", "span", "div",
    "section", "article", "main", "nav", "header", "footer"
  ].includes(type)
);

const isVoidOrNoInnerText = (type) => (
  ["img", "image", "input", "iframe", "br", "hr", "area", "source", "track", "wbr", "meta", "link"].includes(type)
);

const buildFlexChildStyles = (config) => {
  const sizing = String(config.itemSizing || "equal");
  const direction = String(config.direction || "row");
  const styles = { margin: "0" };

  if (sizing === "equal") {
    styles.flex = "1 1 0";
    if (direction === "row") styles.minWidth = "120px";
  } else if (sizing === "auto") {
    styles.flex = "0 1 auto";
  } else if (sizing === "half") {
    styles.flex = "0 0 auto";
    styles.width = direction === "row" ? "50%" : "100%";
  } else if (sizing === "third") {
    styles.flex = "0 0 auto";
    styles.width = direction === "row" ? "33.3333%" : "100%";
  }

  return styles;
};

const getGridTemplateColumns = (columns) => {
  if (columns === "auto-fit") {
    return "repeat(auto-fit, minmax(160px, 1fr))";
  }
  const count = Math.min(6, Math.max(1, parseInt(columns, 10) || 2));
  return `repeat(${count}, minmax(0, 1fr))`;
};

export default function Toolbox() {
  const [showMore, setShowMore] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createType, setCreateType] = useState("div");
  const [createConfig, setCreateConfig] = useState({ ...DEFAULT_CREATE_CONFIG });
  const [showFlexModal, setShowFlexModal] = useState(false);
  const [flexConfig, setFlexConfig] = useState({ ...DEFAULT_FLEX_CONFIG });
  const [showGridModal, setShowGridModal] = useState(false);
  const [gridConfig, setGridConfig] = useState({ ...DEFAULT_GRID_CONFIG });
  const [showNavbarModal, setShowNavbarModal] = useState(false);
  const [navbarConfig, setNavbarConfig] = useState({ ...DEFAULT_NAVBAR_CONFIG });
  const [showSliderModal, setShowSliderModal] = useState(false);
  const [sliderConfig, setSliderConfig] = useState({ ...DEFAULT_SLIDER_CONFIG });
  const [selectedInsertParentId, setSelectedInsertParentId] = useState(null);
  const [isPickingTarget, setIsPickingTarget] = useState(false);
  const [pickerReturnModal, setPickerReturnModal] = useState("");
  const [pickerBaseSelectedId, setPickerBaseSelectedId] = useState(null);

  const pages = useBuilderStore(state => state.pages);
  const currentPageId = useBuilderStore(state => state.currentPageId);
  const selectedId = useBuilderStore(state => state.selectedElementId);
  const addElement = useBuilderStore(state => state.addElement);
  const updateStyles = useBuilderStore(state => state.updateStyles);
  const setAttributes = useBuilderStore(state => state.setAttributes);
  const selectElement = useBuilderStore(state => state.selectElement);
  const customComponents = useBuilderStore(state => state.customComponents);
  const addSavedComponent = useBuilderStore(state => state.addSavedComponent);
  const setHighlightContainer = useBuilderStore(state => state.setHighlightContainer);
  const clearHighlightContainer = useBuilderStore(state => state.clearHighlightContainer);

  const currentPage = pages.find(p => p.id === currentPageId);
  const elements = useMemo(() => currentPage?.elements || [], [currentPage]);
  const selectedElement = elements.find(e => e.id === selectedId);
  const canNest = selectedElement && CONTAINER_TYPES.has(selectedElement.type);
  const childTypeOptions = [
    ...FLEX_CHILD_TYPES.map((item) => ({ value: item.type, label: item.label, group: "basic" })),
    ...customComponents.map((item) => ({
      value: `${SAVED_TYPE_PREFIX}${item.id}`,
      label: item.name,
      group: "saved"
    }))
  ];
  const sliderContentOptions = [
    { value: "default", label: "Default Slide Content", group: "basic" },
    ...customComponents.map((item) => ({
      value: `${SAVED_TYPE_PREFIX}${item.id}`,
      label: item.name,
      group: "saved"
    }))
  ];

  const byId = useMemo(
    () => new Map(elements.map((item) => [item.id, item])),
    [elements]
  );

  const resolveContainerTargetId = useCallback((candidateId) => {
    if (candidateId === null || candidateId === undefined) return null;
    let current = byId.get(candidateId);
    while (current) {
      if (CONTAINER_TYPES.has(current.type)) return current.id;
      if (current.parentId === null || current.parentId === undefined) return null;
      current = byId.get(current.parentId);
    }
    return null;
  }, [byId]);

  const getInsertTargetLabel = (id) => {
    if (id === null || id === undefined) return "Body (Root)";
    const target = byId.get(id);
    if (!target) return "Body (Root)";
    return `${target.type} #${target.id}`;
  };

  const getCurrentDefaultTargetId = () => (canNest ? selectedElement.id : null);
  const getActiveInsertParentId = () => {
    if (selectedInsertParentId === null || selectedInsertParentId === undefined) return null;
    return byId.has(selectedInsertParentId) ? selectedInsertParentId : null;
  };

  const closeAllCreateModals = () => {
    setShowCreateModal(false);
    setShowFlexModal(false);
    setShowGridModal(false);
    setShowNavbarModal(false);
    setShowSliderModal(false);
  };

  const reopenModalByKey = (key) => {
    if (key === "create") setShowCreateModal(true);
    if (key === "flex") setShowFlexModal(true);
    if (key === "grid") setShowGridModal(true);
    if (key === "navbar") setShowNavbarModal(true);
    if (key === "slider") setShowSliderModal(true);
  };

  const startPickingTarget = (returnModalKey) => {
    closeAllCreateModals();
    setPickerReturnModal(returnModalKey);
    setPickerBaseSelectedId(selectedId);
    setIsPickingTarget(true);
  };

  const cancelPickingTarget = () => {
    setIsPickingTarget(false);
    setPickerReturnModal("");
    setPickerBaseSelectedId(null);
  };

  const handleFlexConfigChange = (key, value) => {
    setFlexConfig(prev => ({ ...prev, [key]: value }));
  };

  const handleGridConfigChange = (key, value) => {
    setGridConfig(prev => ({ ...prev, [key]: value }));
  };

  const handleCreateConfigChange = (key, value) => {
    setCreateConfig(prev => ({ ...prev, [key]: value }));
  };

  const handleCreateImageUpload = (event) => {
    const input = event.target;
    const file = input?.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      if (!result) return;
      setCreateConfig(prev => ({
        ...prev,
        src: result,
        alt: prev.alt || file.name.replace(/\.[^/.]+$/, "") || "image"
      }));
    };
    reader.readAsDataURL(file);
    input.value = "";
  };

  const handleNavbarConfigChange = (key, value) => {
    setNavbarConfig(prev => ({ ...prev, [key]: value }));
  };

  const handleSliderConfigChange = (key, value) => {
    setSliderConfig(prev => ({ ...prev, [key]: value }));
  };

  useEffect(() => {
    if (!isPickingTarget) return;
    if (selectedId === pickerBaseSelectedId) return;

    const resolvedTarget = resolveContainerTargetId(selectedId);
    setSelectedInsertParentId(resolvedTarget);
    setIsPickingTarget(false);
    setPickerBaseSelectedId(null);
    const key = pickerReturnModal;
    setPickerReturnModal("");
    if (key) reopenModalByKey(key);
  }, [isPickingTarget, selectedId, pickerBaseSelectedId, pickerReturnModal, resolveContainerTargetId]);

  useEffect(() => {
    setSelectedInsertParentId(null);
    cancelPickingTarget();
  }, [currentPageId]);

  const openCreateModal = (type) => {
    cancelPickingTarget();
    setSelectedInsertParentId(getCurrentDefaultTargetId());
    setCreateType(type);
    setCreateConfig(getCreateDefaultsByType(type));
    setShowCreateModal(true);
  };

  const closeCreateModal = () => {
    setShowCreateModal(false);
  };

  const openFlexModal = () => {
    cancelPickingTarget();
    setSelectedInsertParentId(getCurrentDefaultTargetId());
    setFlexConfig({ ...DEFAULT_FLEX_CONFIG });
    setShowFlexModal(true);
  };

  const closeFlexModal = () => {
    setShowFlexModal(false);
  };

  const openGridModal = () => {
    cancelPickingTarget();
    setSelectedInsertParentId(getCurrentDefaultTargetId());
    setGridConfig({ ...DEFAULT_GRID_CONFIG });
    setShowGridModal(true);
  };

  const closeGridModal = () => {
    setShowGridModal(false);
  };

  const openNavbarModal = () => {
    cancelPickingTarget();
    setSelectedInsertParentId(getCurrentDefaultTargetId());
    setNavbarConfig({ ...DEFAULT_NAVBAR_CONFIG });
    setShowNavbarModal(true);
  };

  const closeNavbarModal = () => {
    setShowNavbarModal(false);
  };

  const openSliderModal = () => {
    cancelPickingTarget();
    setSelectedInsertParentId(getCurrentDefaultTargetId());
    setSliderConfig({ ...DEFAULT_SLIDER_CONFIG });
    setShowSliderModal(true);
  };

  const closeSliderModal = () => {
    setShowSliderModal(false);
  };

  const handleCreateFlex = () => {
    const parentId = getActiveInsertParentId();
    const safeCount = Math.min(12, Math.max(1, parseInt(flexConfig.count, 10) || 1));
    const safeGap = Math.max(0, parseInt(flexConfig.gap, 10) || 0);

    const containerId = addElement({ text: "" }, "div", parentId);
    updateStyles(containerId, {
      display: "flex",
      flexDirection: flexConfig.direction,
      justifyContent: flexConfig.justifyContent,
      alignItems: flexConfig.alignItems,
      flexWrap: flexConfig.wrap,
      gap: `${safeGap}px`,
      width: "100%",
      minHeight: "120px",
      padding: "12px",
      borderRadius: "8px"
    });

    for (let i = 0; i < safeCount; i += 1) {
      const childType = flexConfig.childType;
      const childStyles = {
        ...buildFlexChildStyles(flexConfig)
      };
      if (isSavedChildType(childType)) {
        const savedId = getSavedComponentIdFromType(childType);
        if (!savedId) continue;
        const inserted = addSavedComponent(savedId, containerId);
        if (inserted?.ok && inserted.rootId) {
          updateStyles(inserted.rootId, childStyles);
        }
      } else {
        const childId = addElement(getInitialPropsByType(childType), childType, containerId);
        if (childType === "div" || childType === "section" || childType === "article" || childType === "main") {
          childStyles.minHeight = "72px";
          childStyles.padding = "10px";
          childStyles.border = "1px solid #cbd5e1";
          childStyles.borderRadius = "6px";
        }
        updateStyles(childId, childStyles);
      }
    }

    selectElement(containerId);
    closeFlexModal();

    if (parentId) {
      setHighlightContainer(parentId);
      setTimeout(() => {
        clearHighlightContainer();
      }, 700);
    }
  };

  const handleCreateGrid = () => {
    const parentId = getActiveInsertParentId();
    const safeCount = Math.min(24, Math.max(1, parseInt(gridConfig.count, 10) || 1));
    const safeGap = Math.max(0, parseInt(gridConfig.gap, 10) || 0);

    const containerId = addElement({ text: "" }, "div", parentId);
    updateStyles(containerId, {
      display: "grid",
      gridTemplateColumns: getGridTemplateColumns(gridConfig.columns),
      gridAutoRows: gridConfig.rowHeight,
      justifyItems: gridConfig.justifyItems,
      alignItems: gridConfig.alignItems,
      gridAutoFlow: gridConfig.autoFlow,
      gap: `${safeGap}px`,
      width: "100%",
      minHeight: "120px",
      padding: "12px",
      borderRadius: "8px"
    });

    for (let i = 0; i < safeCount; i += 1) {
      const childType = gridConfig.childType;
      const childStyles = {
        margin: "0",
        minWidth: "0"
      };
      if (isSavedChildType(childType)) {
        const savedId = getSavedComponentIdFromType(childType);
        if (!savedId) continue;
        const inserted = addSavedComponent(savedId, containerId);
        if (inserted?.ok && inserted.rootId) {
          updateStyles(inserted.rootId, childStyles);
        }
      } else {
        const childId = addElement(getInitialPropsByType(childType), childType, containerId);
        if (childType === "div" || childType === "section" || childType === "article" || childType === "main") {
          childStyles.minHeight = "72px";
          childStyles.padding = "10px";
          childStyles.border = "1px solid #bbf7d0";
          childStyles.borderRadius = "6px";
        }
        updateStyles(childId, childStyles);
      }
    }

    selectElement(containerId);
    closeGridModal();

    if (parentId) {
      setHighlightContainer(parentId);
      setTimeout(() => {
        clearHighlightContainer();
      }, 700);
    }
  };

  const handleCreateSimple = () => {
    const parentId = getActiveInsertParentId();
    const type = createType;
    const initialProps = getInitialPropsByType(type);

    if (supportsTextValue(type) && createConfig.text) initialProps.text = createConfig.text;
    if ((type === "image" || type === "img") && createConfig.src) initialProps.src = createConfig.src;
    if ((type === "image" || type === "img") && createConfig.alt) initialProps.alt = createConfig.alt;
    if ((type === "a" || type === "link") && createConfig.href) initialProps.href = createConfig.href;
    if ((type === "a" || type === "link")) initialProps.target = createConfig.target || "";
    if (type === "iframe" && createConfig.src) initialProps.src = createConfig.src;
    if (type === "input") {
      initialProps.placeholder = createConfig.placeholder || initialProps.placeholder || "";
      initialProps.defaultValue = createConfig.defaultValue || initialProps.defaultValue || "";
    }
    if (type === "textarea") {
      initialProps.defaultValue = createConfig.defaultValue || initialProps.defaultValue || "";
    }

    const createdId = addElement(initialProps, type, parentId);
    const stylePatch = {};
    const widthValue = parseFloat(createConfig.width);
    const heightValue = parseFloat(createConfig.height);
    if (Number.isFinite(widthValue) && widthValue > 0) {
      stylePatch.width = `${widthValue}${createConfig.widthUnit || "%"}`;
    }
    if (Number.isFinite(heightValue) && heightValue > 0) {
      stylePatch.height = `${heightValue}${createConfig.heightUnit || "px"}`;
    }
    if (Object.keys(stylePatch).length > 0) {
      updateStyles(createdId, stylePatch);
    }

    selectElement(createdId);
    closeCreateModal();
    if (parentId) {
      setHighlightContainer(parentId);
      setTimeout(() => {
        clearHighlightContainer();
      }, 700);
    }
  };

  const handleCreateNavbar = () => {
    const parentId = getActiveInsertParentId();
    const linksCount = Math.min(8, Math.max(1, parseInt(navbarConfig.linksCount, 10) || 1));
    const minHeight = Math.max(48, parseInt(navbarConfig.minHeight, 10) || 72);

    const navbarId = addElement({ text: "" }, "nav", parentId);
    updateStyles(navbarId, {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      width: "100%",
      minHeight: `${minHeight}px`,
      padding: "10px 16px",
      backgroundColor: navbarConfig.bgColor || "#ffffff",
      color: navbarConfig.textColor || "#0f172a",
      borderRadius: "8px",
      gap: "12px"
    });

    const brandId = addElement({ text: navbarConfig.brandText || "Brand" }, "h3", navbarId);
    updateStyles(brandId, {
      margin: "0",
      fontSize: "24px",
      color: navbarConfig.textColor || "#0f172a"
    });

    const linksWrapId = addElement({ text: "" }, "div", navbarId);
    updateStyles(linksWrapId, {
      display: "flex",
      gap: "16px",
      alignItems: "center",
      marginLeft: "auto"
    });

    for (let i = 0; i < linksCount; i += 1) {
      const linkId = addElement(
        { text: `${navbarConfig.linkPrefix || "Link"} ${i + 1}`, href: "#", target: "" },
        "a",
        linksWrapId
      );
      updateStyles(linkId, {
        color: "inherit",
        textDecoration: "none",
        margin: "0"
      });
    }

    if (navbarConfig.showButton) {
      const buttonId = addElement({ text: navbarConfig.buttonText || "Register" }, "button", navbarId);
      updateStyles(buttonId, {
        margin: "0",
        padding: "8px 14px",
        borderRadius: "8px"
      });
    }

    selectElement(navbarId);
    closeNavbarModal();
    if (parentId) {
      setHighlightContainer(parentId);
      setTimeout(() => {
        clearHighlightContainer();
      }, 700);
    }
  };

  const handleCreateSlider = () => {
    const parentId = getActiveInsertParentId();
    const slidesCount = Math.min(8, Math.max(1, parseInt(sliderConfig.slidesCount, 10) || 1));
    const slideHeight = Math.max(160, parseInt(sliderConfig.slideHeight, 10) || 280);
    const trackWidth = slidesCount * 100;
    const eachSlideWidth = 100 / slidesCount;
    const slideSource = sliderConfig.slideContentSource || "default";
    const savedSlideComponentId = getSavedComponentIdFromType(slideSource);

    const sliderId = addElement({ text: "" }, "section", parentId);
    setAttributes(sliderId, {
      "data-ui2-slider": "1",
      "data-slider-loop": sliderConfig.loop ? "true" : "false"
    });
    updateStyles(sliderId, {
      position: "relative",
      overflow: "hidden",
      width: "100%",
      minHeight: `${slideHeight}px`,
      borderRadius: "10px",
      backgroundColor: "#f1f5f9"
    });

    const trackId = addElement({ text: "" }, "div", sliderId);
    setAttributes(trackId, {
      "data-ui2-slider-track": "1"
    });
    updateStyles(trackId, {
      display: "flex",
      width: `${trackWidth}%`,
      minHeight: `${slideHeight}px`,
      transform: "translateX(0%)",
      transition: "transform 300ms ease"
    });

    for (let i = 0; i < slidesCount; i += 1) {
      const slideId = addElement({ text: "" }, "div", trackId);
      setAttributes(slideId, {
        "data-ui2-slider-slide": "1",
        "data-slide-index": String(i)
      });
      updateStyles(slideId, {
        flex: `0 0 ${eachSlideWidth}%`,
        width: `${eachSlideWidth}%`,
        minHeight: `${slideHeight}px`,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        gap: "10px",
        padding: "20px",
        boxSizing: "border-box"
      });

      if (savedSlideComponentId) {
        const inserted = addSavedComponent(savedSlideComponentId, slideId);
        if (inserted?.ok && inserted.rootId) {
          updateStyles(inserted.rootId, {
            width: "100%",
            margin: "0",
            position: "",
            left: "",
            top: "",
            right: "",
            bottom: "",
            marginLeft: "",
            marginTop: ""
          });
        }
      } else {
        const titleId = addElement({ text: `${sliderConfig.titlePrefix || "Slide"} ${i + 1}` }, "h2", slideId);
        updateStyles(titleId, { margin: "0" });
        addElement({ text: "Slide description" }, "p", slideId);
        addElement({ text: "Learn more" }, "button", slideId);
      }
    }

    if (sliderConfig.showArrows) {
      const prevId = addElement({ text: "<" }, "button", sliderId);
      setAttributes(prevId, {
        type: "button",
        "data-ui2-slider-prev": "1"
      });
      updateStyles(prevId, {
        position: "absolute",
        left: "12px",
        top: "50%",
        transform: "translateY(-50%)",
        zIndex: "3",
        width: "38px",
        height: "38px",
        borderRadius: "999px",
        border: "none",
        backgroundColor: "#2563eb",
        color: "#ffffff",
        margin: "0",
        padding: "0",
        cursor: "pointer"
      });
      const nextId = addElement({ text: ">" }, "button", sliderId);
      setAttributes(nextId, {
        type: "button",
        "data-ui2-slider-next": "1"
      });
      updateStyles(nextId, {
        position: "absolute",
        right: "12px",
        top: "50%",
        transform: "translateY(-50%)",
        zIndex: "3",
        width: "38px",
        height: "38px",
        borderRadius: "999px",
        border: "none",
        backgroundColor: "#2563eb",
        color: "#ffffff",
        margin: "0",
        padding: "0",
        cursor: "pointer"
      });
    }

    if (sliderConfig.showDots) {
      const dotsId = addElement({ text: "" }, "div", sliderId);
      setAttributes(dotsId, {
        "data-ui2-slider-dots": "1"
      });
      updateStyles(dotsId, {
        position: "absolute",
        left: "50%",
        bottom: "10px",
        transform: "translateX(-50%)",
        display: "flex",
        gap: "8px",
        zIndex: "3"
      });
      for (let i = 0; i < slidesCount; i += 1) {
        const dotId = addElement({ text: "" }, "span", dotsId);
        setAttributes(dotId, {
          "data-ui2-slider-dot": "1",
          "data-slide-index": String(i)
        });
        updateStyles(dotId, {
          width: "8px",
          height: "8px",
          borderRadius: "999px",
          backgroundColor: i === 0 ? "#2563eb" : "#94a3b8",
          display: "inline-block",
          cursor: "pointer"
        });
      }
    }

    selectElement(sliderId);
    closeSliderModal();
    if (parentId) {
      setHighlightContainer(parentId);
      setTimeout(() => {
        clearHighlightContainer();
      }, 700);
    }
  };

  const handleAdd = (type) => {
    if (type === "flex") {
      openFlexModal();
      return;
    }
    if (type === "grid") {
      openGridModal();
      return;
    }
    if (type === "navbar") {
      openNavbarModal();
      return;
    }
    if (type === "slider") {
      openSliderModal();
      return;
    }
    openCreateModal(type);
  };

  const handleAddSaved = (componentId) => {
    const parentId = getActiveInsertParentId() ?? getCurrentDefaultTargetId();
    addSavedComponent(componentId, parentId);
    if (parentId) {
      setHighlightContainer(parentId);
      setTimeout(() => {
        clearHighlightContainer();
      }, 700);
    }
  };

  const list = showMore ? UNIQUE_TAGS : POPULAR_TAGS;

  const renderSimplePreview = () => {
    const t = createType;
    const txt = createConfig.text || "Sample";
    if (t === "button") return <button className="tool-create-preview-btn">{txt || "Button"}</button>;
    if (t === "input") return <input className="tool-create-preview-input" placeholder={createConfig.placeholder || "Input"} disabled />;
    if (t === "textarea") return <textarea className="tool-create-preview-input" placeholder={createConfig.defaultValue || "Textarea"} disabled rows={2} />;
    if (t === "image" || t === "img") return <div className="tool-create-preview-image">{createConfig.src ? "Image URL set" : "Image Placeholder"}</div>;
    if (t === "a" || t === "link") return <span className="tool-create-preview-link">{txt || "Link"}</span>;
    if (isVoidOrNoInnerText(t)) return <div className="tool-create-preview-box">{t}</div>;
    return <div className="tool-create-preview-box">{txt || t}</div>;
  };

  const renderFlexPreview = () => {
    const count = Math.min(8, Math.max(1, parseInt(flexConfig.count, 10) || 1));
    const isColumn = flexConfig.direction === "column";
    return (
      <div
        className="tool-create-preview-layout"
        style={{
          flexDirection: isColumn ? "column" : "row",
          gap: "6px"
        }}
      >
        {Array.from({ length: count }).map((_, idx) => (
          <div key={`fp-${idx}`} className="tool-create-preview-cell">{idx + 1}</div>
        ))}
      </div>
    );
  };

  const renderGridPreview = () => {
    const count = Math.min(12, Math.max(1, parseInt(gridConfig.count, 10) || 1));
    const template = getGridTemplateColumns(gridConfig.columns);
    return (
      <div className="tool-create-preview-layout tool-create-preview-grid" style={{ gridTemplateColumns: template }}>
        {Array.from({ length: count }).map((_, idx) => (
          <div key={`gp-${idx}`} className="tool-create-preview-cell">{idx + 1}</div>
        ))}
      </div>
    );
  };

  const renderNavbarPreview = () => {
    const linksCount = Math.min(6, Math.max(1, parseInt(navbarConfig.linksCount, 10) || 1));
    return (
      <div className="tool-create-preview-navbar" style={{ backgroundColor: navbarConfig.bgColor || "#fff", color: navbarConfig.textColor || "#0f172a" }}>
        <strong>{navbarConfig.brandText || "Brand"}</strong>
        <div className="tool-create-preview-navbar-links">
          {Array.from({ length: linksCount }).map((_, idx) => (
            <span key={`np-${idx}`}>{navbarConfig.linkPrefix || "Link"} {idx + 1}</span>
          ))}
        </div>
        {navbarConfig.showButton && <button className="tool-create-preview-btn-sm">{navbarConfig.buttonText || "Register"}</button>}
      </div>
    );
  };

  const renderSliderPreview = () => {
    const slidesCount = Math.min(5, Math.max(1, parseInt(sliderConfig.slidesCount, 10) || 1));
    const usingSaved = isSavedChildType(sliderConfig.slideContentSource);
    return (
      <div className="tool-create-preview-slider">
        <div className="tool-create-preview-meta">
          {usingSaved ? "Saved content" : "Default content"} • {sliderConfig.loop ? "Loop ON" : "Loop OFF"}
        </div>
        <div className="tool-create-preview-slider-track">
          {Array.from({ length: slidesCount }).map((_, idx) => (
            <div key={`sp-${idx}`} className="tool-create-preview-slide">{sliderConfig.titlePrefix || "Slide"} {idx + 1}</div>
          ))}
        </div>
        {sliderConfig.showDots && (
          <div className="tool-create-preview-dots">
            {Array.from({ length: slidesCount }).map((_, idx) => (
              <span key={`sd-${idx}`} className={`tool-create-preview-dot${idx === 0 ? " is-active" : ""}`} />
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderInsertTargetControl = (modalKey) => (
    <Form.Group className="mb-3">
      <Form.Label>Insert Target</Form.Label>
      <div className="d-flex gap-2 align-items-center">
        <Form.Control
          readOnly
          value={getInsertTargetLabel(getActiveInsertParentId())}
        />
        <Button
          variant="outline-primary"
          onClick={() => startPickingTarget(modalKey)}
        >
          Pick on Canvas
        </Button>
        <Button
          variant="outline-secondary"
          onClick={() => setSelectedInsertParentId(null)}
        >
          Root
        </Button>
      </div>
    </Form.Group>
  );

  return (
    <>
      <Card className="shadow-sm h-100">
        <Card.Header className="bg-light fw-bold">
          Toolbox
        </Card.Header>

        <Card.Body>
          <div className="alert alert-info py-2 mb-2">
            Insert target: <strong>{getInsertTargetLabel(getActiveInsertParentId() ?? getCurrentDefaultTargetId())}</strong>
          </div>

          {isPickingTarget && (
            <div className="alert alert-warning py-2 mb-2">
              <div className="fw-semibold">Pick insertion target</div>
              <div className="small mb-2">Click any component (nearest container will be used) or click empty page area for Root.</div>
              <div className="d-flex gap-2">
                <Button
                  size="sm"
                  variant="outline-secondary"
                  onClick={() => {
                    setSelectedInsertParentId(null);
                    cancelPickingTarget();
                    if (pickerReturnModal) reopenModalByKey(pickerReturnModal);
                  }}
                >
                  Use Root
                </Button>
                <Button size="sm" variant="outline-dark" onClick={cancelPickingTarget}>
                  Cancel Pick
                </Button>
              </div>
            </div>
          )}

          <div className="d-grid gap-2">
            {list.map(item => (
              <Button
                key={item.type}
                variant="outline-primary"
                onClick={() => handleAdd(item.type)}
              >
                {item.icon ? <i className={`bi ${item.icon} me-2`}></i> : null}
                {item.label}
              </Button>
            ))}

            <Button
              variant="outline-secondary"
              onClick={() => setShowMore(v => !v)}
            >
              {showMore ? "Show Less" : "Show More"}
            </Button>
          </div>

          <hr />
          <div className="fw-semibold mb-2">Saved Components</div>
          <div className="d-grid gap-2">
            {customComponents.length === 0 && (
              <div className="text-muted small">No saved components yet.</div>
            )}
            {customComponents.map((item) => (
              <Button
                key={item.id}
                variant="outline-success"
                onClick={() => handleAddSaved(item.id)}
              >
                <i className="bi bi-box-seam me-2"></i>
                {item.name}
              </Button>
            ))}
          </div>
        </Card.Body>
      </Card>

      <Modal show={showCreateModal} onHide={closeCreateModal} centered>
        <Modal.Header closeButton>
          <Modal.Title>Create {createType.toUpperCase()} Component</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="tool-create-preview-wrap">
            {renderSimplePreview()}
          </div>
          <Form>
            {renderInsertTargetControl("create")}
            {supportsTextValue(createType) && (
              <Form.Group className="mb-3">
                <Form.Label>Text / Content</Form.Label>
                <Form.Control
                  value={createConfig.text}
                  onChange={(e) => handleCreateConfigChange("text", e.target.value)}
                  placeholder="Content"
                />
              </Form.Group>
            )}

            {(createType === "image" || createType === "img" || createType === "iframe") && (
              <Form.Group className="mb-3">
                <Form.Label>Source URL</Form.Label>
                <Form.Control
                  value={createConfig.src}
                  onChange={(e) => handleCreateConfigChange("src", e.target.value)}
                  placeholder="https://..."
                />
              </Form.Group>
            )}

            {(createType === "image" || createType === "img") && (
              <Form.Group className="mb-3">
                <Form.Label>Upload Image</Form.Label>
                <Form.Control
                  type="file"
                  accept="image/*"
                  onChange={handleCreateImageUpload}
                />
                <Form.Text muted>
                  Uploading an image will fill Source URL automatically.
                </Form.Text>
              </Form.Group>
            )}

            {(createType === "image" || createType === "img") && (
              <Form.Group className="mb-3">
                <Form.Label>Alt Text</Form.Label>
                <Form.Control
                  value={createConfig.alt}
                  onChange={(e) => handleCreateConfigChange("alt", e.target.value)}
                  placeholder="image"
                />
              </Form.Group>
            )}

            {(createType === "a" || createType === "link") && (
              <>
                <Form.Group className="mb-3">
                  <Form.Label>Href</Form.Label>
                  <Form.Control
                    value={createConfig.href}
                    onChange={(e) => handleCreateConfigChange("href", e.target.value)}
                    placeholder="/ or https://..."
                  />
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>Target</Form.Label>
                  <Form.Select
                    value={createConfig.target}
                    onChange={(e) => handleCreateConfigChange("target", e.target.value)}
                  >
                    <option value="">Same Tab</option>
                    <option value="_blank">New Tab</option>
                  </Form.Select>
                </Form.Group>
              </>
            )}

            {createType === "input" && (
              <>
                <Form.Group className="mb-3">
                  <Form.Label>Placeholder</Form.Label>
                  <Form.Control
                    value={createConfig.placeholder}
                    onChange={(e) => handleCreateConfigChange("placeholder", e.target.value)}
                    placeholder="Input"
                  />
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>Default Value</Form.Label>
                  <Form.Control
                    value={createConfig.defaultValue}
                    onChange={(e) => handleCreateConfigChange("defaultValue", e.target.value)}
                  />
                </Form.Group>
              </>
            )}

            {createType === "textarea" && (
              <Form.Group className="mb-3">
                <Form.Label>Default Value</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  value={createConfig.defaultValue}
                  onChange={(e) => handleCreateConfigChange("defaultValue", e.target.value)}
                />
              </Form.Group>
            )}

            <div className="d-flex gap-2">
              <Form.Group className="mb-0 flex-fill">
                <Form.Label>Width</Form.Label>
                <Form.Control
                  type="number"
                  min={0}
                  value={createConfig.width}
                  onChange={(e) => handleCreateConfigChange("width", e.target.value)}
                  placeholder="optional"
                />
              </Form.Group>
              <Form.Group className="mb-0" style={{ minWidth: 90 }}>
                <Form.Label>Unit</Form.Label>
                <Form.Select
                  value={createConfig.widthUnit}
                  onChange={(e) => handleCreateConfigChange("widthUnit", e.target.value)}
                >
                  <option value="%">%</option>
                  <option value="px">px</option>
                  <option value="rem">rem</option>
                </Form.Select>
              </Form.Group>
            </div>

            <div className="d-flex gap-2 mt-2">
              <Form.Group className="mb-0 flex-fill">
                <Form.Label>Height</Form.Label>
                <Form.Control
                  type="number"
                  min={0}
                  value={createConfig.height}
                  onChange={(e) => handleCreateConfigChange("height", e.target.value)}
                  placeholder="optional"
                />
              </Form.Group>
              <Form.Group className="mb-0" style={{ minWidth: 90 }}>
                <Form.Label>Unit</Form.Label>
                <Form.Select
                  value={createConfig.heightUnit}
                  onChange={(e) => handleCreateConfigChange("heightUnit", e.target.value)}
                >
                  <option value="px">px</option>
                  <option value="%">%</option>
                  <option value="rem">rem</option>
                </Form.Select>
              </Form.Group>
            </div>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-secondary" onClick={closeCreateModal}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleCreateSimple}>
            Create
          </Button>
        </Modal.Footer>
      </Modal>

      <Modal show={showFlexModal} onHide={closeFlexModal} centered>
        <Modal.Header closeButton>
          <Modal.Title>Create Flex Component</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="tool-create-preview-wrap">
            {renderFlexPreview()}
          </div>
          <Form>
            {renderInsertTargetControl("flex")}
            <Form.Group className="mb-3">
              <Form.Label>How many components inside?</Form.Label>
              <Form.Control
                type="number"
                min={1}
                max={12}
                value={flexConfig.count}
                onChange={(e) => handleFlexConfigChange("count", e.target.value)}
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Child component type</Form.Label>
              <Form.Select
                value={flexConfig.childType}
                onChange={(e) => handleFlexConfigChange("childType", e.target.value)}
              >
                <optgroup label="Basic Components">
                  {childTypeOptions
                    .filter((item) => item.group === "basic")
                    .map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                </optgroup>
                {customComponents.length > 0 && (
                  <optgroup label="Saved Components">
                    {childTypeOptions
                      .filter((item) => item.group === "saved")
                      .map((item) => (
                        <option key={item.value} value={item.value}>
                          {item.label}
                        </option>
                      ))}
                  </optgroup>
                )}
              </Form.Select>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Direction</Form.Label>
              <Form.Select
                value={flexConfig.direction}
                onChange={(e) => handleFlexConfigChange("direction", e.target.value)}
              >
                <option value="row">Row (left to right)</option>
                <option value="column">Column (top to bottom)</option>
              </Form.Select>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Distribute items</Form.Label>
              <Form.Select
                value={flexConfig.itemSizing}
                onChange={(e) => handleFlexConfigChange("itemSizing", e.target.value)}
              >
                <option value="equal">Equal width/height (flex: 1)</option>
                <option value="auto">Auto size</option>
                <option value="half">Two per row (50%)</option>
                <option value="third">Three per row (33.33%)</option>
              </Form.Select>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Justify content</Form.Label>
              <Form.Select
                value={flexConfig.justifyContent}
                onChange={(e) => handleFlexConfigChange("justifyContent", e.target.value)}
              >
                <option value="flex-start">Start</option>
                <option value="center">Center</option>
                <option value="flex-end">End</option>
                <option value="space-between">Space Between</option>
                <option value="space-around">Space Around</option>
                <option value="space-evenly">Space Evenly</option>
              </Form.Select>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Align items</Form.Label>
              <Form.Select
                value={flexConfig.alignItems}
                onChange={(e) => handleFlexConfigChange("alignItems", e.target.value)}
              >
                <option value="stretch">Stretch</option>
                <option value="flex-start">Start</option>
                <option value="center">Center</option>
                <option value="flex-end">End</option>
              </Form.Select>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Wrap</Form.Label>
              <Form.Select
                value={flexConfig.wrap}
                onChange={(e) => handleFlexConfigChange("wrap", e.target.value)}
              >
                <option value="wrap">Wrap</option>
                <option value="nowrap">No Wrap</option>
              </Form.Select>
            </Form.Group>

            <Form.Group>
              <Form.Label>Gap (px)</Form.Label>
              <Form.Control
                type="number"
                min={0}
                max={80}
                value={flexConfig.gap}
                onChange={(e) => handleFlexConfigChange("gap", e.target.value)}
              />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-secondary" onClick={closeFlexModal}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleCreateFlex}>
            Create Flex
          </Button>
        </Modal.Footer>
      </Modal>

      <Modal show={showGridModal} onHide={closeGridModal} centered>
        <Modal.Header closeButton>
          <Modal.Title>Create Grid Component</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="tool-create-preview-wrap">
            {renderGridPreview()}
          </div>
          <Form>
            {renderInsertTargetControl("grid")}
            <Form.Group className="mb-3">
              <Form.Label>How many components inside?</Form.Label>
              <Form.Control
                type="number"
                min={1}
                max={24}
                value={gridConfig.count}
                onChange={(e) => handleGridConfigChange("count", e.target.value)}
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Child component type</Form.Label>
              <Form.Select
                value={gridConfig.childType}
                onChange={(e) => handleGridConfigChange("childType", e.target.value)}
              >
                <optgroup label="Basic Components">
                  {childTypeOptions
                    .filter((item) => item.group === "basic")
                    .map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                </optgroup>
                {customComponents.length > 0 && (
                  <optgroup label="Saved Components">
                    {childTypeOptions
                      .filter((item) => item.group === "saved")
                      .map((item) => (
                        <option key={item.value} value={item.value}>
                          {item.label}
                        </option>
                      ))}
                  </optgroup>
                )}
              </Form.Select>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Columns layout</Form.Label>
              <Form.Select
                value={gridConfig.columns}
                onChange={(e) => handleGridConfigChange("columns", e.target.value)}
              >
                <option value="2">2 Columns</option>
                <option value="3">3 Columns</option>
                <option value="4">4 Columns</option>
                <option value="auto-fit">Auto Fit</option>
              </Form.Select>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Row height</Form.Label>
              <Form.Select
                value={gridConfig.rowHeight}
                onChange={(e) => handleGridConfigChange("rowHeight", e.target.value)}
              >
                <option value="auto">Auto</option>
                <option value="120px">120px</option>
                <option value="160px">160px</option>
                <option value="1fr">Equal (1fr)</option>
              </Form.Select>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Justify items</Form.Label>
              <Form.Select
                value={gridConfig.justifyItems}
                onChange={(e) => handleGridConfigChange("justifyItems", e.target.value)}
              >
                <option value="stretch">Stretch</option>
                <option value="start">Start</option>
                <option value="center">Center</option>
                <option value="end">End</option>
              </Form.Select>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Align items</Form.Label>
              <Form.Select
                value={gridConfig.alignItems}
                onChange={(e) => handleGridConfigChange("alignItems", e.target.value)}
              >
                <option value="stretch">Stretch</option>
                <option value="start">Start</option>
                <option value="center">Center</option>
                <option value="end">End</option>
              </Form.Select>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Auto flow</Form.Label>
              <Form.Select
                value={gridConfig.autoFlow}
                onChange={(e) => handleGridConfigChange("autoFlow", e.target.value)}
              >
                <option value="row">Row</option>
                <option value="column">Column</option>
                <option value="dense">Dense</option>
                <option value="row dense">Row Dense</option>
              </Form.Select>
            </Form.Group>

            <Form.Group>
              <Form.Label>Gap (px)</Form.Label>
              <Form.Control
                type="number"
                min={0}
                max={80}
                value={gridConfig.gap}
                onChange={(e) => handleGridConfigChange("gap", e.target.value)}
              />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-secondary" onClick={closeGridModal}>
            Cancel
          </Button>
          <Button variant="success" onClick={handleCreateGrid}>
            Create Grid
          </Button>
        </Modal.Footer>
      </Modal>

      <Modal show={showNavbarModal} onHide={closeNavbarModal} centered>
        <Modal.Header closeButton>
          <Modal.Title>Create Navbar Component</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="tool-create-preview-wrap">
            {renderNavbarPreview()}
          </div>
          <Form>
            {renderInsertTargetControl("navbar")}
            <Form.Group className="mb-3">
              <Form.Label>Brand Text</Form.Label>
              <Form.Control
                value={navbarConfig.brandText}
                onChange={(e) => handleNavbarConfigChange("brandText", e.target.value)}
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Links Count</Form.Label>
              <Form.Control
                type="number"
                min={1}
                max={8}
                value={navbarConfig.linksCount}
                onChange={(e) => handleNavbarConfigChange("linksCount", e.target.value)}
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Link Prefix</Form.Label>
              <Form.Control
                value={navbarConfig.linkPrefix}
                onChange={(e) => handleNavbarConfigChange("linkPrefix", e.target.value)}
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Check
                type="checkbox"
                label="Show CTA Button"
                checked={Boolean(navbarConfig.showButton)}
                onChange={(e) => handleNavbarConfigChange("showButton", e.target.checked)}
              />
            </Form.Group>
            {navbarConfig.showButton && (
              <Form.Group className="mb-3">
                <Form.Label>Button Text</Form.Label>
                <Form.Control
                  value={navbarConfig.buttonText}
                  onChange={(e) => handleNavbarConfigChange("buttonText", e.target.value)}
                />
              </Form.Group>
            )}
            <div className="d-flex gap-2">
              <Form.Group className="mb-0 flex-fill">
                <Form.Label>Background</Form.Label>
                <Form.Control
                  type="color"
                  value={navbarConfig.bgColor}
                  onChange={(e) => handleNavbarConfigChange("bgColor", e.target.value)}
                />
              </Form.Group>
              <Form.Group className="mb-0 flex-fill">
                <Form.Label>Text Color</Form.Label>
                <Form.Control
                  type="color"
                  value={navbarConfig.textColor}
                  onChange={(e) => handleNavbarConfigChange("textColor", e.target.value)}
                />
              </Form.Group>
            </div>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-secondary" onClick={closeNavbarModal}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleCreateNavbar}>
            Create Navbar
          </Button>
        </Modal.Footer>
      </Modal>

      <Modal show={showSliderModal} onHide={closeSliderModal} centered>
        <Modal.Header closeButton>
          <Modal.Title>Create Slider Component</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="tool-create-preview-wrap">
            {renderSliderPreview()}
          </div>
          <Form>
            {renderInsertTargetControl("slider")}
            <Form.Group className="mb-3">
              <Form.Label>Slides Count</Form.Label>
              <Form.Control
                type="number"
                min={1}
                max={8}
                value={sliderConfig.slidesCount}
                onChange={(e) => handleSliderConfigChange("slidesCount", e.target.value)}
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Title Prefix</Form.Label>
              <Form.Control
                value={sliderConfig.titlePrefix}
                onChange={(e) => handleSliderConfigChange("titlePrefix", e.target.value)}
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Slide Content Source</Form.Label>
              <Form.Select
                value={sliderConfig.slideContentSource}
                onChange={(e) => handleSliderConfigChange("slideContentSource", e.target.value)}
              >
                <optgroup label="Default">
                  {sliderContentOptions
                    .filter((item) => item.group === "basic")
                    .map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                </optgroup>
                {customComponents.length > 0 && (
                  <optgroup label="Saved Components">
                    {sliderContentOptions
                      .filter((item) => item.group === "saved")
                      .map((item) => (
                        <option key={item.value} value={item.value}>
                          {item.label}
                        </option>
                      ))}
                  </optgroup>
                )}
              </Form.Select>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Slide Height (px)</Form.Label>
              <Form.Control
                type="number"
                min={160}
                value={sliderConfig.slideHeight}
                onChange={(e) => handleSliderConfigChange("slideHeight", e.target.value)}
              />
            </Form.Group>
            <Form.Group className="mb-2">
              <Form.Check
                type="checkbox"
                label="Loop"
                checked={Boolean(sliderConfig.loop)}
                onChange={(e) => handleSliderConfigChange("loop", e.target.checked)}
              />
            </Form.Group>
            <Form.Group className="mb-2">
              <Form.Check
                type="checkbox"
                label="Show Arrows"
                checked={Boolean(sliderConfig.showArrows)}
                onChange={(e) => handleSliderConfigChange("showArrows", e.target.checked)}
              />
            </Form.Group>
            <Form.Group className="mb-1">
              <Form.Check
                type="checkbox"
                label="Show Dots"
                checked={Boolean(sliderConfig.showDots)}
                onChange={(e) => handleSliderConfigChange("showDots", e.target.checked)}
              />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-secondary" onClick={closeSliderModal}>
            Cancel
          </Button>
          <Button variant="success" onClick={handleCreateSlider}>
            Create Slider
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}

