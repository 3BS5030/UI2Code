import React, { useState } from "react";
import { Card, Button } from "react-bootstrap";
import { useBuilderStore } from "../../store/builderStore";

const POPULAR_TAGS = [
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

export default function Toolbox() {
  const [showMore, setShowMore] = useState(false);

  const pages = useBuilderStore(state => state.pages);
  const currentPageId = useBuilderStore(state => state.currentPageId);
  const selectedId = useBuilderStore(state => state.selectedElementId);
  const addElement = useBuilderStore(state => state.addElement);
  const setHighlightContainer = useBuilderStore(state => state.setHighlightContainer);
  const clearHighlightContainer = useBuilderStore(state => state.clearHighlightContainer);

  const currentPage = pages.find(p => p.id === currentPageId);
  const elements = currentPage?.elements || [];
  const selectedElement = elements.find(e => e.id === selectedId);
  const canNest = selectedElement && CONTAINER_TYPES.has(selectedElement.type);

  const handleAdd = (type) => {
    let initialProps = {};

    if (type === "text") {
      initialProps = { text: "New Text" };
    } else if (type === "button") {
      initialProps = { text: "Button" };
    } else if (type === "image" || type === "img") {
      initialProps = { src: "https://via.placeholder.com/200", alt: "image" };
    } else if (type === "h1") {
      initialProps = { text: "Heading 1" };
    } else if (type === "h2") {
      initialProps = { text: "Heading 2" };
    } else if (type === "h3") {
      initialProps = { text: "Heading 3" };
    } else if (type === "p" || type === "paragraph") {
      initialProps = { text: "Paragraph text" };
    } else if (type === "a") {
      initialProps = { text: "Link", href: "/", target: "" };
    } else if (type === "iframe") {
      initialProps = { src: "https://example.com", title: "iframe" };
    } else if (type === "input") {
      initialProps = { placeholder: "Input", defaultValue: "" };
    } else if (type === "textarea") {
      initialProps = { defaultValue: "Textarea" };
    } else if (type === "select") {
      initialProps = { text: "Option" };
    } else if (type === "option") {
      initialProps = { text: "Option" };
    } else if (type === "details") {
      initialProps = { text: "Details content" };
    } else if (type === "summary") {
      initialProps = { text: "Summary" };
    } else if (type === "label") {
      initialProps = { text: "Label" };
    } else if (type === "blockquote") {
      initialProps = { text: "Quote" };
    } else if (type === "code") {
      initialProps = { text: "Code" };
    } else if (type === "pre") {
      initialProps = { text: "Preformatted" };
    } else if (type === "small") {
      initialProps = { text: "Small text" };
    } else if (type === "strong") {
      initialProps = { text: "Strong text" };
    } else if (type === "em") {
      initialProps = { text: "Em text" };
    } else if (type === "mark") {
      initialProps = { text: "Mark" };
    } else if (type === "u") {
      initialProps = { text: "Underline" };
    } else if (type === "s") {
      initialProps = { text: "Strikethrough" };
    } else if (type === "li") {
      initialProps = { text: "List item" };
    } else if (type === "th") {
      initialProps = { text: "Header" };
    } else if (type === "td") {
      initialProps = { text: "Cell" };
    } else if (type === "meter") {
      initialProps = { value: 0.6, min: 0, max: 1 };
    } else if (type === "progress") {
      initialProps = { value: 40, max: 100 };
    } else if (type === "audio" || type === "video") {
      initialProps = { controls: true, src: "" };
    } else if (type === "canvas" || type === "svg") {
      initialProps = { text: "" };
    } else {
      initialProps = { text: type };
    }

    const parentId = canNest ? selectedElement.id : null;
    addElement(initialProps, type, parentId);

    if (parentId) {
      setHighlightContainer(parentId);
      setTimeout(() => {
        clearHighlightContainer();
      }, 700);
    }
  };

  const list = showMore ? UNIQUE_TAGS : POPULAR_TAGS;

  return (
    <Card className="shadow-sm h-100">
      <Card.Header className="bg-light fw-bold">
        Toolbox
      </Card.Header>

      <Card.Body>
        {canNest && (
          <div className="alert alert-warning py-2">
            Adding inside: <strong>{selectedElement.type}</strong>
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
      </Card.Body>
    </Card>
  );
}
