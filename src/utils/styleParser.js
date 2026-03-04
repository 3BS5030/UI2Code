const POSITION_KEYS = ["position", "left", "top", "right", "bottom"];

const isEmpty = (value) => value === undefined || value === null || value === "";

const cloneStyles = (styles = {}) => ({ ...(styles || {}) });

export const isManualPositionValue = (value) => {
  const normalized = typeof value === "string" ? value.trim().toLowerCase() : "";
  return Boolean(normalized && normalized !== "static");
};

export const shouldKeepManualPosition = (element = {}) => {
  if (typeof element.manualPosition === "boolean") return element.manualPosition;
  return false;
};

export const normalizePositionStyles = (styles = {}, keepManualPosition = false) => {
  const next = cloneStyles(styles);
  if (keepManualPosition) return next;

  if (!isEmpty(next.left) && isEmpty(next.marginLeft)) next.marginLeft = next.left;
  if (!isEmpty(next.top) && isEmpty(next.marginTop)) next.marginTop = next.top;
  if (!isEmpty(next.right) && isEmpty(next.marginRight)) next.marginRight = next.right;
  if (!isEmpty(next.bottom) && isEmpty(next.marginBottom)) next.marginBottom = next.bottom;

  POSITION_KEYS.forEach((key) => {
    if (key in next) delete next[key];
  });

  return next;
};
