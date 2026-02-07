import React, { useEffect, useMemo, useState } from "react";
import { Button, Form } from "react-bootstrap";
import { useBuilderStore } from "../../store/builderStore";

const ACTION_TEMPLATES = [
  {
    id: "click-alert",
    label: "Click → Alert",
    description: "Show an alert on click.",
    fields: [
      { key: "message", label: "Message", placeholder: "Clicked!", default: "Clicked!" }
    ],
    code: ({ selector, params }) => `const root = pageRoot || document;\nconst el = root.querySelector(${JSON.stringify(selector)});\nif (el) {\n  el.addEventListener(\"click\", () => alert(${JSON.stringify(params.message || "Clicked!")}));\n}`
  },
  {
    id: "click-toggle-class",
    label: "Click → Toggle Class",
    description: "Toggle a class on the target.",
    usesTarget: true,
    fields: [
      { key: "className", label: "Class Name", placeholder: "active", default: "active" }
    ],
    code: ({ selector, targetSelector, params }) => `const root = pageRoot || document;\nconst trigger = root.querySelector(${JSON.stringify(selector)});\nconst target = root.querySelector(${JSON.stringify(targetSelector || selector)});\nif (trigger && target) {\n  trigger.addEventListener(\"click\", () => target.classList.toggle(${JSON.stringify(params.className || "active")}));\n}`
  },
  {
    id: "hover-add-class",
    label: "Hover → Add/Remove Class",
    description: "Add class on hover, remove on mouse leave.",
    usesTarget: true,
    fields: [
      { key: "className", label: "Class Name", placeholder: "is-hover", default: "is-hover" }
    ],
    code: ({ selector, targetSelector, params }) => `const root = pageRoot || document;\nconst trigger = root.querySelector(${JSON.stringify(selector)});\nconst target = root.querySelector(${JSON.stringify(targetSelector || selector)});\nif (trigger && target) {\n  trigger.addEventListener(\"mouseenter\", () => target.classList.add(${JSON.stringify(params.className || "is-hover")}));\n  trigger.addEventListener(\"mouseleave\", () => target.classList.remove(${JSON.stringify(params.className || "is-hover")}));\n}`
  },
  {
    id: "scroll-reveal",
    label: "On Scroll → Reveal",
    description: "Reveal when element enters viewport.",
    fields: [
      { key: "className", label: "Class Name", placeholder: "is-visible", default: "is-visible" }
    ],
    code: ({ selector, params }) => `const root = pageRoot || document;\nconst target = root.querySelector(${JSON.stringify(selector)});\nif (target) {\n  const onScroll = () => {\n    const rect = target.getBoundingClientRect();\n    if (rect.top < window.innerHeight * 0.85) {\n      target.classList.add(${JSON.stringify(params.className || "is-visible")});\n      window.removeEventListener(\"scroll\", onScroll);\n    }\n  };\n  window.addEventListener(\"scroll\", onScroll);\n  onScroll();\n}`
  },
  {
    id: "toggle-display",
    label: "Click → Toggle Target Display",
    description: "Show/hide another element.",
    usesTarget: true,
    fields: [],
    code: ({ selector, targetSelector }) => `const root = pageRoot || document;\nconst trigger = root.querySelector(${JSON.stringify(selector)});\nconst target = root.querySelector(${JSON.stringify(targetSelector)});\nif (trigger && target) {\n  trigger.addEventListener(\"click\", () => {\n    target.style.display = target.style.display === \"none\" ? \"\" : \"none\";\n  });\n}`
  },
  {
    id: "smooth-scroll",
    label: "Click → Smooth Scroll",
    description: "Scroll to a target element.",
    usesTarget: true,
    fields: [],
    code: ({ selector, targetSelector }) => `const root = pageRoot || document;\nconst trigger = root.querySelector(${JSON.stringify(selector)});\nconst target = root.querySelector(${JSON.stringify(targetSelector)});\nif (trigger && target) {\n  trigger.addEventListener(\"click\", (e) => {\n    e.preventDefault();\n    target.scrollIntoView({ behavior: \"smooth\", block: \"start\" });\n  });\n}`
  },
  {
    id: "set-text",
    label: "Click → Set Text",
    description: "Set text content on target.",
    usesTarget: true,
    fields: [
      { key: "text", label: "Text", placeholder: "Hello", default: "Hello" }
    ],
    code: ({ selector, targetSelector, params }) => `const root = pageRoot || document;\nconst trigger = root.querySelector(${JSON.stringify(selector)});\nconst target = root.querySelector(${JSON.stringify(targetSelector)});\nif (trigger && target) {\n  trigger.addEventListener(\"click\", () => {\n    target.textContent = ${JSON.stringify(params.text || "Hello")};\n  });\n}`
  },
  {
    id: "swap-image",
    label: "Click → Swap Image",
    description: "Change image src on click.",
    usesTarget: true,
    fields: [
      { key: "src", label: "Image URL", placeholder: "https://...", default: "" }
    ],
    code: ({ selector, targetSelector, params }) => `const root = pageRoot || document;\nconst trigger = root.querySelector(${JSON.stringify(selector)});\nconst target = root.querySelector(${JSON.stringify(targetSelector)});\nif (trigger && target) {\n  trigger.addEventListener(\"click\", () => {\n    target.setAttribute(\"src\", ${JSON.stringify(params.src || "")});\n  });\n}`
  },
  {
    id: "set-attribute",
    label: "Click → Set Attribute",
    description: "Set any attribute on target.",
    usesTarget: true,
    fields: [
      { key: "attrName", label: "Attribute", placeholder: "data-state", default: "data-state" },
      { key: "attrValue", label: "Value", placeholder: "on", default: "on" }
    ],
    code: ({ selector, targetSelector, params }) => `const root = pageRoot || document;\nconst trigger = root.querySelector(${JSON.stringify(selector)});\nconst target = root.querySelector(${JSON.stringify(targetSelector)});\nif (trigger && target) {\n  trigger.addEventListener(\"click\", () => {\n    target.setAttribute(${JSON.stringify(params.attrName || "data-state")}, ${JSON.stringify(params.attrValue || "on")});\n  });\n}`
  },
  {
    id: "input-mirror",
    label: "Input → Mirror Text",
    description: "Mirror input value to another element.",
    usesTarget: true,
    fields: [
      { key: "mode", label: "Target Mode", type: "select", options: ["textContent", "value"], default: "textContent" }
    ],
    code: ({ selector, targetSelector, params }) => `const root = pageRoot || document;\nconst input = root.querySelector(${JSON.stringify(selector)});\nconst target = root.querySelector(${JSON.stringify(targetSelector)});\nif (input && target) {\n  input.addEventListener(\"input\", () => {\n    target[${JSON.stringify(params.mode || "textContent")}] = input.value;\n  });\n}`
  },
  {
    id: "open-url",
    label: "Click → Open URL",
    description: "Open a URL on click.",
    fields: [
      { key: "url", label: "URL", placeholder: "https://example.com", default: "" },
      { key: "target", label: "Target", type: "select", options: ["_self", "_blank"], default: "_blank" }
    ],
    code: ({ selector, params }) => `const root = pageRoot || document;\nconst trigger = root.querySelector(${JSON.stringify(selector)});\nif (trigger) {\n  trigger.addEventListener(\"click\", () => {\n    window.open(${JSON.stringify(params.url || "")}, ${JSON.stringify(params.target || "_blank")});\n  });\n}`
  }
];

export function CssEditorPanel({ title }) {
  const pages = useBuilderStore(state => state.pages);
  const currentPageId = useBuilderStore(state => state.currentPageId);
  const setCustomCss = useBuilderStore(state => state.setCustomCss);
  const globalCssFiles = useBuilderStore(state => state.globalCssFiles);
  const addGlobalCssFile = useBuilderStore(state => state.addGlobalCssFile);
  const updateGlobalCssFile = useBuilderStore(state => state.updateGlobalCssFile);
  const deleteGlobalCssFile = useBuilderStore(state => state.deleteGlobalCssFile);
  const addPageCssFile = useBuilderStore(state => state.addPageCssFile);
  const updatePageCssFile = useBuilderStore(state => state.updatePageCssFile);
  const deletePageCssFile = useBuilderStore(state => state.deletePageCssFile);

  const currentPage = pages.find(p => p.id === currentPageId);
  const customCss = currentPage?.customCss || "";
  const pageCssFiles = currentPage?.cssFiles || [];

  return (
    <div className="page-code">
      <div className="page-code__header">
        {title || `Custom CSS for: ${currentPage?.title || "Home"} (${currentPage?.route || "/"})`}
      </div>
      <Form>
        <div className="d-flex gap-2 mb-2">
          <Button
            variant="outline-primary"
            size="sm"
            onClick={() => addPageCssFile("page")}
          >
            + Page CSS File
          </Button>
          <Button
            variant="outline-secondary"
            size="sm"
            onClick={() => addGlobalCssFile("global")}
          >
            + Global CSS File
          </Button>
        </div>

        {pageCssFiles.length > 0 && (
          <div className="mb-3">
            <div className="text-muted mb-1" style={{ fontSize: 12 }}>Page CSS Files</div>
            {pageCssFiles.map(file => (
              <div key={file.id} className="mb-2">
                <div className="d-flex gap-2 mb-1">
                  <Form.Control
                    size="sm"
                    value={file.name || ""}
                    onChange={(e) => updatePageCssFile(file.id, { name: e.target.value })}
                    placeholder="filename"
                  />
                  <Button
                    variant="outline-danger"
                    size="sm"
                    onClick={() => deletePageCssFile(file.id)}
                  >
                    Delete
                  </Button>
                </div>
                <Form.Control
                  as="textarea"
                  rows={4}
                  value={file.content || ""}
                  onChange={(e) => updatePageCssFile(file.id, { content: e.target.value })}
                  placeholder=".page { }"
                />
              </div>
            ))}
          </div>
        )}

        {globalCssFiles.length > 0 && (
          <div className="mb-3">
            <div className="text-muted mb-1" style={{ fontSize: 12 }}>Global CSS Files</div>
            {globalCssFiles.map(file => (
              <div key={file.id} className="mb-2">
                <div className="d-flex gap-2 mb-1">
                  <Form.Control
                    size="sm"
                    value={file.name || ""}
                    onChange={(e) => updateGlobalCssFile(file.id, { name: e.target.value })}
                    placeholder="filename"
                  />
                  <Button
                    variant="outline-danger"
                    size="sm"
                    onClick={() => deleteGlobalCssFile(file.id)}
                  >
                    Delete
                  </Button>
                </div>
                <Form.Control
                  as="textarea"
                  rows={4}
                  value={file.content || ""}
                  onChange={(e) => updateGlobalCssFile(file.id, { content: e.target.value })}
                  placeholder="body { }"
                />
              </div>
            ))}
          </div>
        )}

        <Form.Control
          as="textarea"
          rows={8}
          value={customCss}
          onChange={(e) => setCustomCss(e.target.value)}
          placeholder=".card { padding: 12px; }"
        />
      </Form>
    </div>
  );
}

export function JsEditorPanel({ title }) {
  const pages = useBuilderStore(state => state.pages);
  const currentPageId = useBuilderStore(state => state.currentPageId);
  const setCustomJs = useBuilderStore(state => state.setCustomJs);
  const selectedElementId = useBuilderStore(state => state.selectedElementId);
  const globalJsFiles = useBuilderStore(state => state.globalJsFiles);
  const addGlobalJsFile = useBuilderStore(state => state.addGlobalJsFile);
  const updateGlobalJsFile = useBuilderStore(state => state.updateGlobalJsFile);
  const deleteGlobalJsFile = useBuilderStore(state => state.deleteGlobalJsFile);
  const addPageJsFile = useBuilderStore(state => state.addPageJsFile);
  const updatePageJsFile = useBuilderStore(state => state.updatePageJsFile);
  const deletePageJsFile = useBuilderStore(state => state.deletePageJsFile);

  const currentPage = pages.find(p => p.id === currentPageId);
  const customJs = currentPage?.customJs || "";
  const pageJsFiles = currentPage?.jsFiles || [];
  const selectedElement = useMemo(
    () => currentPage?.elements?.find(el => el.id === selectedElementId),
    [currentPage, selectedElementId]
  );

  const [actionTemplate, setActionTemplate] = useState(ACTION_TEMPLATES[0].id);
  const [selectorType, setSelectorType] = useState("id");
  const [selectorValue, setSelectorValue] = useState("");
  const [targetType, setTargetType] = useState("id");
  const [targetValue, setTargetValue] = useState("");
  const [actionParams, setActionParams] = useState({});

  const currentTemplate = useMemo(
    () => ACTION_TEMPLATES.find(t => t.id === actionTemplate) || ACTION_TEMPLATES[0],
    [actionTemplate]
  );

  useEffect(() => {
    if (!currentTemplate) return;
    setActionParams(prev => {
      const next = { ...prev };
      (currentTemplate.fields || []).forEach(field => {
        if (next[field.key] === undefined) {
          next[field.key] = field.default ?? "";
        }
      });
      return next;
    });
  }, [currentTemplate]);

  const buildSelector = () => {
    const value = selectorValue.trim();
    if (!value) return "";
    return selectorType === "id" ? `#${value}` : `.${value}`;
  };

  const buildTargetSelector = () => {
    const value = targetValue.trim();
    if (!value) return "";
    if (targetType === "css") return value;
    return targetType === "id" ? `#${value}` : `.${value}`;
  };

  const applySelectedSelector = (setterType, setterValue) => {
    const attrs = selectedElement?.attrs || {};
    if (attrs.id) {
      setterType("id");
      setterValue(String(attrs.id));
      return;
    }
    if (attrs.className) {
      const firstClass = String(attrs.className).split(/\s+/).filter(Boolean)[0];
      if (firstClass) {
        setterType("class");
        setterValue(firstClass);
      }
    }
  };

  const addActionSnippet = () => {
    const tpl = currentTemplate;
    if (!tpl) return;

    const selector = buildSelector();
    if (!selector) return;

    const targetSelector = tpl.usesTarget ? buildTargetSelector() : "";
    if (tpl.usesTarget && !targetSelector) return;

    const snippet = tpl.code({
      selector,
      targetSelector,
      params: actionParams
    });

    const next = `${customJs}\n\n// ${tpl.label}\n${snippet}`.trim();
    setCustomJs(next);
  };

  const updateActionParam = (key, value) => {
    setActionParams(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="page-code">
      <div className="page-code__header">
        {title || `JS Actions for: ${currentPage?.title || "Home"} (${currentPage?.route || "/"})`}
      </div>
      <Form>
        <div className="d-flex gap-2 mb-2">
          <Button
            variant="outline-primary"
            size="sm"
            onClick={() => addPageJsFile("page")}
          >
            + Page JS File
          </Button>
          <Button
            variant="outline-secondary"
            size="sm"
            onClick={() => addGlobalJsFile("global")}
          >
            + Global JS File
          </Button>
        </div>

        {pageJsFiles.length > 0 && (
          <div className="mb-3">
            <div className="text-muted mb-1" style={{ fontSize: 12 }}>Page JS Files</div>
            {pageJsFiles.map(file => (
              <div key={file.id} className="mb-2">
                <div className="d-flex gap-2 mb-1">
                  <Form.Control
                    size="sm"
                    value={file.name || ""}
                    onChange={(e) => updatePageJsFile(file.id, { name: e.target.value })}
                    placeholder="filename"
                  />
                  <Button
                    variant="outline-danger"
                    size="sm"
                    onClick={() => deletePageJsFile(file.id)}
                  >
                    Delete
                  </Button>
                </div>
                <Form.Control
                  as="textarea"
                  rows={4}
                  value={file.content || ""}
                  onChange={(e) => updatePageJsFile(file.id, { content: e.target.value })}
                  placeholder="// page script"
                />
              </div>
            ))}
          </div>
        )}

        {globalJsFiles.length > 0 && (
          <div className="mb-3">
            <div className="text-muted mb-1" style={{ fontSize: 12 }}>Global JS Files</div>
            {globalJsFiles.map(file => (
              <div key={file.id} className="mb-2">
                <div className="d-flex gap-2 mb-1">
                  <Form.Control
                    size="sm"
                    value={file.name || ""}
                    onChange={(e) => updateGlobalJsFile(file.id, { name: e.target.value })}
                    placeholder="filename"
                  />
                  <Button
                    variant="outline-danger"
                    size="sm"
                    onClick={() => deleteGlobalJsFile(file.id)}
                  >
                    Delete
                  </Button>
                </div>
                <Form.Control
                  as="textarea"
                  rows={4}
                  value={file.content || ""}
                  onChange={(e) => updateGlobalJsFile(file.id, { content: e.target.value })}
                  placeholder="// global script"
                />
              </div>
            ))}
          </div>
        )}

        <Form.Group className="mb-3">
          <Form.Label>Write Custom JS</Form.Label>
          <Form.Control
            as="textarea"
            rows={8}
            value={customJs}
            onChange={(e) => setCustomJs(e.target.value)}
            placeholder="// Your JS here"
          />
        </Form.Group>

        <Form.Group className="mb-3">
          <Form.Label>Quick Actions</Form.Label>
          <div className="d-flex gap-2 mb-2">
            <Form.Select
              value={actionTemplate}
              onChange={(e) => setActionTemplate(e.target.value)}
            >
              {ACTION_TEMPLATES.map(t => (
                <option key={t.id} value={t.id}>{t.label}</option>
              ))}
            </Form.Select>
            <Button
              variant="outline-secondary"
              size="sm"
              onClick={() => applySelectedSelector(setSelectorType, setSelectorValue)}
              disabled={!selectedElement}
            >
              Use Selected
            </Button>
          </div>
          {currentTemplate?.description && (
            <div className="text-muted mb-2" style={{ fontSize: 12 }}>
              {currentTemplate.description}
            </div>
          )}
          <div className="d-flex gap-2 mb-2">
            <Form.Select
              value={selectorType}
              onChange={(e) => setSelectorType(e.target.value)}
            >
              <option value="id">Trigger ID</option>
              <option value="class">Trigger Class</option>
            </Form.Select>
            <Form.Control
              placeholder={selectorType === "id" ? "elementId" : "className"}
              value={selectorValue}
              onChange={(e) => setSelectorValue(e.target.value)}
            />
          </div>

          {currentTemplate?.usesTarget && (
            <div className="d-flex gap-2 mb-2">
              <Form.Select
                value={targetType}
                onChange={(e) => setTargetType(e.target.value)}
              >
                <option value="id">Target ID</option>
                <option value="class">Target Class</option>
                <option value="css">CSS Selector</option>
              </Form.Select>
              <Form.Control
                placeholder={targetType === "css" ? ".card > h1" : "targetId / class"}
                value={targetValue}
                onChange={(e) => setTargetValue(e.target.value)}
              />
              <Button
                variant="outline-secondary"
                size="sm"
                onClick={() => applySelectedSelector(setTargetType, setTargetValue)}
                disabled={!selectedElement}
              >
                Use Selected
              </Button>
            </div>
          )}

          {(currentTemplate?.fields || []).map(field => (
            <div className="mb-2" key={field.key}>
              <Form.Label style={{ fontSize: 12 }}>{field.label}</Form.Label>
              {field.type === "select" ? (
                <Form.Select
                  value={actionParams[field.key] ?? field.default ?? ""}
                  onChange={(e) => updateActionParam(field.key, e.target.value)}
                >
                  {(field.options || []).map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </Form.Select>
              ) : (
                <Form.Control
                  placeholder={field.placeholder || ""}
                  value={actionParams[field.key] ?? field.default ?? ""}
                  onChange={(e) => updateActionParam(field.key, e.target.value)}
                />
              )}
            </div>
          ))}

          <div className="d-flex gap-2 mb-2">
            <Button variant="outline-primary" onClick={addActionSnippet}>
              Add Action
            </Button>
          </div>
          <div className="text-muted" style={{ fontSize: 12 }}>
            Hint: Add element IDs in Attributes (id) or use Class Names. Use pageRoot to scope queries. Return a cleanup function to remove listeners.
          </div>
        </Form.Group>
      </Form>
    </div>
  );
}

export default function EditorsPanel() {
  const showCss = useBuilderStore(state => state.showCssEditor);
  const showJs = useBuilderStore(state => state.showJsEditor);

  return (
    <div className="editors-panel">
      {!showCss && !showJs  &&
        <h4 style={{"textAlign":"center" , height:"100vh" , display:"flex",justifyContent:"center",alignItems:"center",color:"#00000087"}}> show editors to appears here </h4>
      }
      {showCss && <CssEditorPanel />}
      {showJs && <JsEditorPanel />}
    </div>
  );
}
