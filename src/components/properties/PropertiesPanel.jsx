import React, { useMemo, useState, useEffect } from "react";
import { useBuilderStore } from "../../store/builderStore";

const STYLE_PRESETS = [
    "width",
    "height",
    "minWidth",
    "minHeight",
    "maxWidth",
    "maxHeight",
    "color",
    "backgroundColor",
    "opacity",
    "fontSize",
    "fontWeight",
    "fontFamily",
    "fontStyle",
    "textAlign",
    "textDecoration",
    "textTransform",
    "letterSpacing",
    "lineHeight",
    "whiteSpace",
    "overflow",
    "overflowX",
    "overflowY",
    "padding",
    "paddingTop",
    "paddingRight",
    "paddingBottom",
    "paddingLeft",
    "margin",
    "marginTop",
    "marginRight",
    "marginBottom",
    "marginLeft",
    "border",
    "borderWidth",
    "borderStyle",
    "borderColor",
    "borderRadius",
    "boxShadow",
    "outline",
    "outlineWidth",
    "outlineStyle",
    "outlineColor",
    "display",
    "visibility",
    "alignItems",
    "justifyContent",
    "alignContent",
    "justifyItems",
    "alignSelf",
    "gap",
    "rowGap",
    "columnGap",
    "flex",
    "flexDirection",
    "flexWrap",
    "flexGrow",
    "flexShrink",
    "flexBasis",
    "order",
    "gridTemplateColumns",
    "gridTemplateRows",
    "gridColumn",
    "gridRow",
    "gridArea",
    "placeItems",
    "placeContent",
    "objectFit",
    "objectPosition",
    "position",
    "left",
    "top",
    "right",
    "bottom",
    "zIndex",
    "transform",
    "transformOrigin",
    "transition",
    "cursor",
    "pointerEvents",
    "filter",
    "backdropFilter",
    "boxSizing",
    "listStyle",
    "listStyleType",
    "listStylePosition",
    "listStyleImage",
    "tableLayout",
    "captionSide",
    "borderCollapse",
    "borderSpacing"
];

const COLOR_KEYS = new Set([
    "color",
    "backgroundColor",
    "borderColor",
    "outlineColor",
    "textShadow",
    "fill",
    "stroke"
]);

const NUMBER_UNIT_KEYS = new Set([
    "width",
    "height",
    "minWidth",
    "minHeight",
    "maxWidth",
    "maxHeight",
    "left",
    "top",
    "right",
    "bottom",
    "fontSize",
    "borderRadius",
    "gap",
    "rowGap",
    "columnGap",
    "padding",
    "paddingTop",
    "paddingRight",
    "paddingBottom",
    "paddingLeft",
    "margin",
    "marginTop",
    "marginRight",
    "marginBottom",
    "marginLeft",
    "borderWidth",
    "outlineWidth"
]);

const KEYWORD_OPTIONS = {
    width: ["auto", "fit-content", "max-content", "min-content", "100%", "100vw"],
    height: ["auto", "fit-content", "max-content", "min-content", "100%", "100vh"],
    minWidth: ["auto", "fit-content", "max-content", "min-content"],
    minHeight: ["auto", "fit-content", "max-content", "min-content"],
    maxWidth: ["none", "fit-content", "max-content", "min-content", "100%"],
    maxHeight: ["none", "fit-content", "max-content", "min-content", "100%"],
    objectFit: ["fill", "contain", "cover", "none", "scale-down"],
    objectPosition: ["center", "top", "bottom", "left", "right"],
    display: ["block", "inline", "inline-block", "flex", "grid", "none"],
    position: ["static", "relative", "absolute", "fixed", "sticky"],
    overflow: ["visible", "hidden", "scroll", "auto", "clip"],
    overflowX: ["visible", "hidden", "scroll", "auto", "clip"],
    overflowY: ["visible", "hidden", "scroll", "auto", "clip"],
    textAlign: ["left", "center", "right", "justify", "start", "end"],
    fontWeight: ["normal", "bold", "bolder", "lighter", "100", "200", "300", "400", "500", "600", "700", "800", "900"],
    whiteSpace: ["normal", "nowrap", "pre", "pre-wrap", "pre-line", "break-spaces"],
    cursor: ["auto", "default", "pointer", "text", "move", "grab", "not-allowed"],
    alignItems: ["stretch", "flex-start", "center", "flex-end", "baseline"],
    justifyContent: ["flex-start", "center", "flex-end", "space-between", "space-around", "space-evenly"],
    alignContent: ["stretch", "flex-start", "center", "flex-end", "space-between", "space-around"],
    justifyItems: ["stretch", "start", "center", "end"],
    placeItems: ["stretch", "start", "center", "end"],
    placeContent: ["stretch", "start", "center", "end", "space-between", "space-around"],
    textTransform: ["none", "capitalize", "uppercase", "lowercase"],
    listStyleType: ["none", "disc", "circle", "square", "decimal", "lower-roman", "upper-roman"],
    borderStyle: ["none", "solid", "dashed", "dotted", "double", "groove", "ridge", "inset", "outset"],
    outlineStyle: ["none", "solid", "dashed", "dotted", "double"],
    boxSizing: ["content-box", "border-box"],
    pointerEvents: ["auto", "none"],
    visibility: ["visible", "hidden", "collapse"]
};

const UNIT_OPTIONS = ["px", "%", "em", "rem", "vw", "vh"];
const ANIMATION_PRESETS = [
    "none",
    "fadeIn",
    "slideUp",
    "slideDown",
    "slideLeft",
    "slideRight",
    "zoomIn",
    "rotateIn"
];

const parseUnitValue = (value, fallbackUnit = "px") => {
    if (value === undefined || value === null || value === "") {
        return { num: "", unit: fallbackUnit };
    }

    const str = String(value).trim();
    const match = str.match(/^(-?\d*\.?\d+)([a-z%]*)$/i);

    if (!match) {
        return { num: "", unit: fallbackUnit };
    }

    const num = match[1];
    const unit = match[2] || fallbackUnit;

    return { num, unit };
};

const buildUnitValue = (num, unit) => {
    if (num === "" || num === null || num === undefined) return "";
    return `${num}${unit || ""}`;
};

export default function PropertiesPanel() {

    const pages = useBuilderStore(state => state.pages);
    const currentPageId = useBuilderStore(state => state.currentPageId);
    const selectedId = useBuilderStore(state => state.selectedElementId);

    const updateProps = useBuilderStore(state => state.updateProps);
    const updateStyles = useBuilderStore(state => state.updateStyles);
    const setStyles = useBuilderStore(state => state.setStyles);
    const updateResponsiveStyles = useBuilderStore(state => state.updateResponsiveStyles);
    const setResponsiveStyles = useBuilderStore(state => state.setResponsiveStyles);
    const updatePseudoStyles = useBuilderStore(state => state.updatePseudoStyles);
    const setPseudoStyles = useBuilderStore(state => state.setPseudoStyles);
    const updateAnimation = useBuilderStore(state => state.updateAnimation);
    const setAttributes = useBuilderStore(state => state.setAttributes);
    const deleteElement = useBuilderStore(state => state.deleteElement);

    const updateBodyStyles = useBuilderStore(state => state.updateBodyStyles);
    const setBodyStyles = useBuilderStore(state => state.setBodyStyles);
    const updateBodyResponsiveStyles = useBuilderStore(state => state.updateBodyResponsiveStyles);
    const setBodyResponsiveStyles = useBuilderStore(state => state.setBodyResponsiveStyles);
    const setBodyAttrs = useBuilderStore(state => state.setBodyAttrs);
    const viewportKey = useBuilderStore(state => state.viewportKey);

    const currentPage = pages.find(p => p.id === currentPageId);
    const elements = currentPage?.elements || [];
    const bodyStyles = currentPage?.bodyStyles || {};
    const bodyResponsive = currentPage?.bodyResponsive || {};
    const bodyAttrs = currentPage?.bodyAttrs || {};

    const selectedElement = useMemo(
        () => elements.find(e => e.id === selectedId),
        [elements, selectedId]
    );

    const [mode, setMode] = useState(selectedElement ? "selected" : "body");
    const [styleTarget, setStyleTarget] = useState("base");
    const [newAttrKey, setNewAttrKey] = useState("");
    const [newAttrValue, setNewAttrValue] = useState("");
    const [styleKey, setStyleKey] = useState("");
    const [styleValue, setStyleValue] = useState("");

    useEffect(() => {
        if (selectedElement) {
            setMode("selected");
        } else {
            setMode("body");
        }
    }, [selectedElement]);

    useEffect(() => {
        if (mode === "body") {
            setStyleTarget("base");
        }
    }, [mode]);

    const isBody = mode === "body";
    const responsiveOverrides = isBody
        ? (bodyResponsive[viewportKey] || {})
        : (selectedElement?.responsiveStyles?.[viewportKey] || {});
    const baseStyles = isBody ? (bodyStyles || {}) : (selectedElement?.styles || {});
    const effectiveBaseStyles = viewportKey === "base"
        ? baseStyles
        : { ...baseStyles, ...responsiveOverrides };
    const pseudoStyles = selectedElement?.pseudoStyles || { hover: {}, active: {}, focus: {} };
    const currentStyles = isBody
        ? (viewportKey === "base" ? baseStyles : responsiveOverrides)
        : (styleTarget === "base"
            ? (viewportKey === "base" ? baseStyles : responsiveOverrides)
            : (pseudoStyles[styleTarget] || {}));
    const currentAttrs = isBody ? (bodyAttrs || {}) : (selectedElement?.attrs || {});
    const animation = selectedElement?.animation || {};

    const handleTextChange = (e) => {
        const value = e.target.value;
        updateProps(selectedId, { text: value });
    };

    const handleAttrValueChange = (key, value) => {
        if (isBody) {
            setBodyAttrs({ ...currentAttrs, [key]: value });
            return;
        }
        setAttributes(selectedId, { ...currentAttrs, [key]: value });
    };

    const handleAttrKeyChange = (oldKey, newKey) => {
        if (!newKey) return;
        const next = { ...currentAttrs };
        const value = next[oldKey];
        delete next[oldKey];
        next[newKey] = value;

        if (isBody) {
            setBodyAttrs(next);
            return;
        }
        setAttributes(selectedId, next);
    };

    const handleAttrRemove = (key) => {
        const next = { ...currentAttrs };
        delete next[key];

        if (isBody) {
            setBodyAttrs(next);
            return;
        }
        setAttributes(selectedId, next);
    };

    const handleAttrAdd = () => {
        if (!newAttrKey) return;
        const next = { ...currentAttrs, [newAttrKey]: newAttrValue };

        if (isBody) {
            setBodyAttrs(next);
        } else {
            setAttributes(selectedId, next);
        }

        setNewAttrKey("");
        setNewAttrValue("");
    };

    const handleStyleAdd = () => {
        if (!styleKey) return;

        if (isBody) {
            if (viewportKey === "base") {
                updateBodyStyles({ [styleKey]: styleValue });
            } else {
                updateBodyResponsiveStyles(viewportKey, { [styleKey]: styleValue });
            }
        } else if (styleTarget === "base") {
            if (viewportKey === "base") {
                updateStyles(selectedId, { [styleKey]: styleValue });
            } else {
                updateResponsiveStyles(selectedId, viewportKey, { [styleKey]: styleValue });
            }
        } else {
            updatePseudoStyles(selectedId, styleTarget, { [styleKey]: styleValue });
        }

        setStyleKey("");
        setStyleValue("");
    };

    const handleStyleChange = (key, value) => {
        if (isBody) {
            if (viewportKey === "base") {
                updateBodyStyles({ [key]: value });
            } else {
                updateBodyResponsiveStyles(viewportKey, { [key]: value });
            }
        } else if (styleTarget === "base") {
            if (viewportKey === "base") {
                updateStyles(selectedId, { [key]: value });
            } else {
                updateResponsiveStyles(selectedId, viewportKey, { [key]: value });
            }
        } else {
            updatePseudoStyles(selectedId, styleTarget, { [key]: value });
        }
    };

    const handleStyleRemove = (key) => {
        const next = { ...currentStyles };
        delete next[key];

        if (isBody) {
            if (viewportKey === "base") {
                setBodyStyles(next);
            } else {
                setBodyResponsiveStyles(viewportKey, next);
            }
            return;
        }

        if (styleTarget === "base") {
            if (viewportKey === "base") {
                setStyles(selectedId, next);
            } else {
                setResponsiveStyles(selectedId, viewportKey, next);
            }
        } else {
            setPseudoStyles(selectedId, styleTarget, next);
        }
    };

    const renderUnitInput = (key, label) => {
        const sourceStyles = styleTarget === "base" ? effectiveBaseStyles : currentStyles;
        const { num, unit } = parseUnitValue(sourceStyles[key]);

        return (
            <div className="mb-3">
                <label className="form-label">{label}</label>
                <div className="d-flex gap-2">
                    <input
                        type="number"
                        className="form-control form-control-sm"
                        value={num}
                        onChange={e => handleStyleChange(key, buildUnitValue(e.target.value, unit))}
                    />
                    <select
                        className="form-select form-select-sm"
                        value={unit}
                        onChange={e => handleStyleChange(key, buildUnitValue(num, e.target.value))}
                    >
                        {UNIT_OPTIONS.map(opt => (
                            <option key={opt} value={opt}>{opt}</option>
                        ))}
                    </select>
                </div>
            </div>
        );
    };

    return (
        <div className="properties">

            <div className="d-flex gap-2 mb-3">
                <button
                    type="button"
                    className={`btn btn-sm ${mode === "body" ? "btn-primary" : "btn-outline-primary"}`}
                    onClick={() => setMode("body")}
                >
                    Body
                </button>
                <button
                    type="button"
                    className={`btn btn-sm ${mode === "selected" ? "btn-primary" : "btn-outline-primary"}`}
                    onClick={() => setMode("selected")}
                    disabled={!selectedElement}
                >
                    Selected
                </button>
            </div>

            <h3>{isBody ? "Body Properties" : "Properties"}</h3>
            {!isBody && (
                <div className="d-flex gap-2 mb-3">
                    <button
                        type="button"
                        className={`btn btn-sm ${styleTarget === "base" ? "btn-primary" : "btn-outline-primary"}`}
                        onClick={() => setStyleTarget("base")}
                    >
                        Base
                    </button>
                    <button
                        type="button"
                        className={`btn btn-sm ${styleTarget === "hover" ? "btn-primary" : "btn-outline-primary"}`}
                        onClick={() => setStyleTarget("hover")}
                    >
                        Hover
                    </button>
                    <button
                        type="button"
                        className={`btn btn-sm ${styleTarget === "active" ? "btn-primary" : "btn-outline-primary"}`}
                        onClick={() => setStyleTarget("active")}
                    >
                        Active
                    </button>
                    <button
                        type="button"
                        className={`btn btn-sm ${styleTarget === "focus" ? "btn-primary" : "btn-outline-primary"}`}
                        onClick={() => setStyleTarget("focus")}
                    >
                        Focus
                    </button>
                </div>
            )}

            {!isBody && selectedElement && (
                <div className="mb-3">
                    <button
                        type="button"
                        className="btn btn-sm btn-danger"
                        onClick={() => deleteElement(selectedId)}
                    >
                        Delete Element
                    </button>
                </div>
            )}

            {renderUnitInput("width", "Width")}
            {renderUnitInput("height", "Height")}

            {!isBody && selectedElement?.props?.text !== undefined && (
                <div className="mb-3">
                    <label className="form-label">Text / Content</label>
                    <input
                        className="form-control form-control-sm"
                        value={selectedElement.props.text}
                        onChange={handleTextChange}
                    />
                </div>
            )}

            {!isBody && (
                <div className="mb-3">
                    <label className="form-label">Class Names</label>
                    <input
                        className="form-control form-control-sm"
                        placeholder="e.g. card primary shadow"
                        value={currentAttrs.className || ""}
                        onChange={e => handleAttrValueChange("className", e.target.value)}
                    />
                </div>
            )}

            {!isBody && (
                <div className="mb-3">
                    <label className="form-label">Element ID</label>
                    <input
                        className="form-control form-control-sm"
                        placeholder="e.g. heroTitle"
                        value={currentAttrs.id || ""}
                        onChange={e => handleAttrValueChange("id", e.target.value)}
                    />
                </div>
            )}

            {!isBody && selectedElement?.type === "image" && (
                <div className="mb-3">
                    <label className="form-label">Image URL</label>
                    <input
                        className="form-control form-control-sm"
                        value={selectedElement.props.src}
                        onChange={e => updateProps(selectedId, { src: e.target.value })}
                    />
                    <label className="form-label mt-2">Upload Image</label>
                    <input
                        type="file"
                        accept="image/*"
                        className="form-control form-control-sm"
                        onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            const reader = new FileReader();
                            reader.onload = () => {
                                const result = reader.result;
                                if (typeof result === "string") {
                                    updateProps(selectedId, { src: result });
                                }
                            };
                            reader.readAsDataURL(file);
                        }}
                    />
                </div>
            )}

            {!isBody && selectedElement?.type === "iframe" && (
                <>
                    <div className="mb-3">
                        <label className="form-label">Iframe URL</label>
                        <input
                            className="form-control form-control-sm"
                            value={selectedElement.props.src}
                            onChange={e => updateProps(selectedId, { src: e.target.value })}
                        />
                    </div>
                    <div className="mb-3">
                        <label className="form-label">Title</label>
                        <input
                            className="form-control form-control-sm"
                            value={selectedElement.props.title}
                            onChange={e => updateProps(selectedId, { title: e.target.value })}
                        />
                    </div>
                </>
            )}

            {!isBody && (selectedElement?.type === "a" || selectedElement?.type === "link") && (
                <>
                    <div className="mb-3">
                        <label className="form-label">Href</label>
                        <input
                            className="form-control form-control-sm"
                            value={selectedElement.props.href}
                            onChange={e => updateProps(selectedId, { href: e.target.value })}
                        />
                    </div>
                    <div className="mb-3">
                        <label className="form-label">Target</label>
                        <input
                            className="form-control form-control-sm"
                            value={selectedElement.props.target}
                            onChange={e => updateProps(selectedId, { target: e.target.value })}
                        />
                    </div>
                </>
            )}

            {!isBody && selectedElement?.type === "input" && (
                <>
                    <div className="mb-3">
                        <label className="form-label">Placeholder</label>
                        <input
                            className="form-control form-control-sm"
                            value={selectedElement.props.placeholder || ""}
                            onChange={e => updateProps(selectedId, { placeholder: e.target.value })}
                        />
                    </div>
                    <div className="mb-3">
                        <label className="form-label">Default Value</label>
                        <input
                            className="form-control form-control-sm"
                            value={selectedElement.props.defaultValue || ""}
                            onChange={e => updateProps(selectedId, { defaultValue: e.target.value })}
                        />
                    </div>
                </>
            )}

            {!isBody && selectedElement?.type === "textarea" && (
                <div className="mb-3">
                    <label className="form-label">Default Value</label>
                    <textarea
                        className="form-control form-control-sm"
                        rows={3}
                        value={selectedElement.props.defaultValue || ""}
                        onChange={e => updateProps(selectedId, { defaultValue: e.target.value })}
                    />
                </div>
            )}

            <hr />
            <h5>Styles ({isBody ? "Body" : styleTarget})</h5>
            {Object.keys(currentStyles).length === 0 && (
                <p className="text-muted small">No custom styles yet.</p>
            )}
            {Object.keys(currentStyles).map(key => (
                <div className="d-flex gap-2 mb-2" key={key}>
                    <input
                        className="form-control form-control-sm"
                        value={key}
                        readOnly
                    />

                    {COLOR_KEYS.has(key) ? (
                        <input
                            type="color"
                            className="form-control form-control-sm"
                            value={String(currentStyles[key] || "#000000")}
                            onChange={e => handleStyleChange(key, e.target.value)}
                        />
                    ) : KEYWORD_OPTIONS[key] ? (
                        <select
                            className="form-select form-select-sm"
                            value={currentStyles[key]}
                            onChange={e => handleStyleChange(key, e.target.value)}
                        >
                            {KEYWORD_OPTIONS[key].map(opt => (
                                <option key={opt} value={opt}>{opt}</option>
                            ))}
                            {!KEYWORD_OPTIONS[key].includes(String(currentStyles[key] || "")) && (
                                <option value={currentStyles[key]}>
                                    {String(currentStyles[key] || "custom")}
                                </option>
                            )}
                        </select>
                    ) : NUMBER_UNIT_KEYS.has(key) ? (
                        <div className="d-flex gap-2 w-100">
                            <input
                                type="number"
                                className="form-control form-control-sm"
                                value={parseUnitValue(currentStyles[key]).num}
                                onChange={e => handleStyleChange(
                                    key,
                                    buildUnitValue(e.target.value, parseUnitValue(currentStyles[key]).unit)
                                )}
                            />
                            <select
                                className="form-select form-select-sm"
                                value={parseUnitValue(currentStyles[key]).unit}
                                onChange={e => handleStyleChange(
                                    key,
                                    buildUnitValue(parseUnitValue(currentStyles[key]).num, e.target.value)
                                )}
                            >
                                {UNIT_OPTIONS.map(opt => (
                                    <option key={opt} value={opt}>{opt}</option>
                                ))}
                            </select>
                        </div>
                    ) : (
                        <input
                            className="form-control form-control-sm"
                            value={currentStyles[key]}
                            onChange={e => handleStyleChange(key, e.target.value)}
                        />
                    )}

                    <button
                        className="btn btn-sm btn-outline-danger"
                        type="button"
                        onClick={() => handleStyleRemove(key)}
                    >
                        Remove
                    </button>
                </div>
            ))}

            <div className="mb-2">
                <select
                    className="form-select form-select-sm"
                    value={styleKey}
                    onChange={e => setStyleKey(e.target.value)}
                >
                    <option value="">Select CSS property</option>
                    {STYLE_PRESETS.map(prop => (
                        <option key={prop} value={prop}>{prop}</option>
                    ))}
                </select>
            </div>

            <div className="d-flex gap-2 mb-2">
                <input
                    className="form-control form-control-sm"
                    placeholder="custom property"
                    value={styleKey}
                    onChange={e => setStyleKey(e.target.value)}
                />
                <input
                    className="form-control form-control-sm"
                    placeholder="value"
                    value={styleValue}
                    onChange={e => setStyleValue(e.target.value)}
                />
                <button
                    className="btn btn-sm btn-primary"
                    type="button"
                    onClick={handleStyleAdd}
                >
                    Add
                </button>
            </div>

            {!isBody && selectedElement && (
                <>
                    <hr />
                    <h5>Animation</h5>

                    <div className="mb-3">
                        <label className="form-label">Animation</label>
                        <select
                            className="form-select form-select-sm"
                            value={animation.name || "none"}
                            onChange={e => updateAnimation(selectedId, { name: e.target.value })}
                        >
                            {ANIMATION_PRESETS.map(name => (
                                <option key={name} value={name}>{name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="mb-3">
                        <label className="form-label">Duration (s)</label>
                        <input
                            type="number"
                            step="0.1"
                            className="form-control form-control-sm"
                            value={parseUnitValue(animation.duration || "1s", "s").num}
                            onChange={e => updateAnimation(selectedId, { duration: `${e.target.value || 0}s` })}
                        />
                    </div>

                    <div className="mb-3">
                        <label className="form-label">Delay (s)</label>
                        <input
                            type="number"
                            step="0.1"
                            className="form-control form-control-sm"
                            value={parseUnitValue(animation.delay || "0s", "s").num}
                            onChange={e => updateAnimation(selectedId, { delay: `${e.target.value || 0}s` })}
                        />
                    </div>

                    <div className="mb-3">
                        <label className="form-label">Timing Function</label>
                        <select
                            className="form-select form-select-sm"
                            value={animation.timing || "ease"}
                            onChange={e => updateAnimation(selectedId, { timing: e.target.value })}
                        >
                            <option value="ease">ease</option>
                            <option value="linear">linear</option>
                            <option value="ease-in">ease-in</option>
                            <option value="ease-out">ease-out</option>
                            <option value="ease-in-out">ease-in-out</option>
                        </select>
                    </div>

                    <div className="mb-3">
                        <label className="form-label">Iteration</label>
                        <input
                            className="form-control form-control-sm"
                            value={animation.iteration || "1"}
                            onChange={e => updateAnimation(selectedId, { iteration: e.target.value })}
                        />
                    </div>

                    <div className="mb-3">
                        <label className="form-label">Direction</label>
                        <select
                            className="form-select form-select-sm"
                            value={animation.direction || "normal"}
                            onChange={e => updateAnimation(selectedId, { direction: e.target.value })}
                        >
                            <option value="normal">normal</option>
                            <option value="reverse">reverse</option>
                            <option value="alternate">alternate</option>
                            <option value="alternate-reverse">alternate-reverse</option>
                        </select>
                    </div>

                    <div className="mb-3">
                        <label className="form-label">Fill Mode</label>
                        <select
                            className="form-select form-select-sm"
                            value={animation.fillMode || "both"}
                            onChange={e => updateAnimation(selectedId, { fillMode: e.target.value })}
                        >
                            <option value="none">none</option>
                            <option value="forwards">forwards</option>
                            <option value="backwards">backwards</option>
                            <option value="both">both</option>
                        </select>
                    </div>
                </>
            )}

            <hr />



            <h5>Attributes</h5>
            {Object.keys(currentAttrs).length === 0 && (
                <p className="text-muted small">No attributes yet.</p>
            )}
            {Object.keys(currentAttrs).map(key => (
                <div className="d-flex gap-2 mb-2" key={key}>
                    <input
                        className="form-control form-control-sm"
                        defaultValue={key}
                        onBlur={e => handleAttrKeyChange(key, e.target.value.trim())}
                    />
                    <input
                        className="form-control form-control-sm"
                        value={currentAttrs[key]}
                        onChange={e => handleAttrValueChange(key, e.target.value)}
                    />
                    <button
                        className="btn btn-sm btn-outline-danger"
                        type="button"
                        onClick={() => handleAttrRemove(key)}
                    >
                        Remove
                    </button>
                </div>
            ))}

            <div className="d-flex gap-2 mb-3">
                <input
                    className="form-control form-control-sm"
                    placeholder="attr name"
                    value={newAttrKey}
                    onChange={e => setNewAttrKey(e.target.value)}
                />
                <input
                    className="form-control form-control-sm"
                    placeholder="value"
                    value={newAttrValue}
                    onChange={e => setNewAttrValue(e.target.value)}
                />
                <button
                    className="btn btn-sm btn-primary"
                    type="button"
                    onClick={handleAttrAdd}
                >
                    Add
                </button>
            </div>





        </div>
    );
}
