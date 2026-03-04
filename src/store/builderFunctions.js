import { defaultStyles } from "../core/defaultStyles";

const hasOwn = (obj, key) => Object.prototype.hasOwnProperty.call(obj || {}, key);

const isManualPositionValue = (value) => {
  const normalized = typeof value === "string" ? value.trim().toLowerCase() : "";
  return Boolean(normalized && normalized !== "static");
};

const resolveManualPositionFromPatch = (element, patchedStyles, patch) => {
  if (hasOwn(patch, "position")) {
    return isManualPositionValue(patchedStyles.position);
  }
  return Boolean(element.manualPosition);
};

// ===== Add Element =====
export function addElement(initialProps, type, parentId = null) {

  const id = Math.floor(Math.random() * 99999999);

  const styles = { ...defaultStyles[type] };
  const bootstrapClasses = {
    text: "mb-3",
    paragraph: "mb-3",
    button: "btn btn-primary",
    image: "img-fluid",
    link: "text-decoration-none",
    a: "text-decoration-none",
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
    isLayout: false,
    lockedToParent: Boolean(parentId),
    props: initialProps,
    styles: styles,
    manualPosition: false,
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

// ===== Update Layout Flag =====
export function updateLayout(elements, id, isLayout) {
  return elements.map((element) => {
    if (element.id !== id) return element;
    return {
      ...element,
      isLayout: Boolean(isLayout)
    };
  });
}

// ===== Update Responsive Styles =====
export function updateResponsiveStyles(elements, id, viewportKey, newStyles) {
  const updatedElements = elements.map(element => {
    if (element.id === id) {
      const current = element.responsiveStyles || {};
      const nextResponsive = {
        ...current,
        [viewportKey]: {
          ...(current[viewportKey] || {}),
          ...newStyles
        }
      };
      const nextManualPosition = hasOwn(newStyles, "position")
        ? isManualPositionValue(newStyles.position)
        : Boolean(element.manualPosition);
      return {
        ...element,
        responsiveStyles: nextResponsive,
        manualPosition: nextManualPosition
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
      const nextResponsive = {
        ...current,
        [viewportKey]: { ...styles }
      };
      const nextManualPosition = hasOwn(styles, "position")
        ? isManualPositionValue(styles.position)
        : Boolean(element.manualPosition);
      return {
        ...element,
        responsiveStyles: nextResponsive,
        manualPosition: nextManualPosition
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
      const nextStyles = {
        ...element.styles,
        ...newStyles
      };
      return {
        ...element,
        styles: nextStyles,
        manualPosition: resolveManualPositionFromPatch(element, nextStyles, newStyles)
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
        styles: { ...styles },
        manualPosition: isManualPositionValue(styles?.position)
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
  const byParent = new Map();
  elements.forEach((el) => {
    const key = el.parentId ?? "__root__";
    if (!byParent.has(key)) byParent.set(key, []);
    byParent.get(key).push(el.id);
  });

  const idsToRemove = new Set([id]);
  const stack = [id];

  while (stack.length > 0) {
    const current = stack.pop();
    const children = byParent.get(current) || [];
    children.forEach((childId) => {
      if (idsToRemove.has(childId)) return;
      idsToRemove.add(childId);
      stack.push(childId);
    });
  }

  return elements.filter((element) => !idsToRemove.has(element.id));
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
