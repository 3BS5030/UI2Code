import { defaultStyles } from "../core/defaultStyles";

// ===== Add Element =====
export function addElement(initialProps, type, parentId = null) {

  const id = Math.floor(Math.random() * 99999999);

  const styles = { ...defaultStyles[type] };
  const bootstrapClasses = {
    text: "mb-3",
    paragraph: "mb-3",
    button: "btn btn-primary",
    image: "img-fluid",
    link: "link-primary text-decoration-none",
    a: "link-primary text-decoration-none",
    h1: "h1",
    h2: "h2",
    h3: "h3",
    input: "form-control",
    textarea: "form-control",
    select: "form-select w-auto",
    div: "container",
    section: "container",
    article: "container",
    main: "container",
    nav: "navbar",
    ul: "list-unstyled",
    ol: "list-unstyled",
    table: "table"
  };
  const defaultClassName = bootstrapClasses[type] || "";

  const newElement = {
    id: id,
    type: type,
    parentId: parentId,
    lockedToParent: Boolean(parentId),
    props: initialProps,
    styles: styles,
    attrs: defaultClassName ? { className: defaultClassName } : {},
    responsiveStyles: {},
    pseudoStyles: {
      hover: {},
      active: {},
      focus: {}
    },
    animation: {
      name: "none",
      duration: "1s",
      timing: "ease",
      delay: "0s",
      iteration: "1",
      direction: "normal",
      fillMode: "both"
    }
  };

  return newElement;
}

// ===== Update Props =====
export function updateProps(elements, id, newProps) {

  const updatedElements = elements.map(element => {

    if (element.id === id) {
      return {
        ...element,

        props: {
          ...element.props,
          ...newProps
        }
      };
    }

    return element;
  });

  return updatedElements;
}

// ===== Update Responsive Styles =====
export function updateResponsiveStyles(elements, id, viewportKey, newStyles) {
  const updatedElements = elements.map(element => {
    if (element.id === id) {
      const current = element.responsiveStyles || {};
      return {
        ...element,
        responsiveStyles: {
          ...current,
          [viewportKey]: {
            ...(current[viewportKey] || {}),
            ...newStyles
          }
        }
      };
    }

    return element;
  });

  return updatedElements;
}

// ===== Set Responsive Styles (replace) =====
export function setResponsiveStyles(elements, id, viewportKey, styles) {
  const updatedElements = elements.map(element => {
    if (element.id === id) {
      const current = element.responsiveStyles || {};
      return {
        ...element,
        responsiveStyles: {
          ...current,
          [viewportKey]: { ...styles }
        }
      };
    }

    return element;
  });

  return updatedElements;
}

// ===== Update Styles =====
export function updateStyles(elements, id, newStyles) {

  const updatedElements = elements.map(element => {

    if (element.id === id) {
      return {
        ...element,

        styles: {
          ...element.styles,
          ...newStyles
        }
      };
    }

    return element;
  });

  return updatedElements;
}

// ===== Set Styles (replace) =====
export function setStyles(elements, id, styles) {

  const updatedElements = elements.map(element => {

    if (element.id === id) {
      return {
        ...element,
        styles: { ...styles }
      };
    }

    return element;
  });

  return updatedElements;
}

// ===== Update Pseudo Styles =====
export function updatePseudoStyles(elements, id, stateKey, newStyles) {

  const updatedElements = elements.map(element => {
    if (element.id === id) {
      const current = element.pseudoStyles || { hover: {}, active: {}, focus: {} };
      return {
        ...element,
        pseudoStyles: {
          ...current,
          [stateKey]: {
            ...(current[stateKey] || {}),
            ...newStyles
          }
        }
      };
    }

    return element;
  });

  return updatedElements;
}

// ===== Set Pseudo Styles (replace) =====
export function setPseudoStyles(elements, id, stateKey, styles) {

  const updatedElements = elements.map(element => {
    if (element.id === id) {
      const current = element.pseudoStyles || { hover: {}, active: {}, focus: {} };
      return {
        ...element,
        pseudoStyles: {
          ...current,
          [stateKey]: { ...styles }
        }
      };
    }

    return element;
  });

  return updatedElements;
}

// ===== Update Animation =====
export function updateAnimation(elements, id, newAnim) {

  const updatedElements = elements.map(element => {
    if (element.id === id) {
      return {
        ...element,
        animation: {
          ...(element.animation || {}),
          ...newAnim
        }
      };
    }

    return element;
  });

  return updatedElements;
}

// ===== Set Attributes (replace) =====
export function setAttributes(elements, id, attrs) {

  const updatedElements = elements.map(element => {

    if (element.id === id) {
      return {
        ...element,
        attrs: { ...attrs }
      };
    }

    return element;
  });

  return updatedElements;
}

// ===== Update Parent =====
export function updateParent(elements, id, parentId) {

  const updatedElements = elements.map(element => {
    if (element.id === id) {
      return {
        ...element,
        parentId: parentId || null
      };
    }

    return element;
  });

  return updatedElements;
}

// ===== Update Lock =====
export function updateLock(elements, id, locked) {

  const updatedElements = elements.map(element => {
    if (element.id === id) {
      return {
        ...element,
        lockedToParent: Boolean(locked)
      };
    }

    return element;
  });

  return updatedElements;
}

// ===== Delete Element =====
export function deleteElement(elements, id) {

  const updatedElements = elements.filter(element => {
    return element.id !== id && element.parentId !== id;
  });

  return updatedElements;
}

// ===== Select Element =====
export function selectElement(state, id) {

  return {
    ...state,
    selectedElementId: id
  };
}

// ===== Get Element By Id (helper) =====
export function getElementById(elements, id) {
  return elements.find(element => element.id === id);
}
