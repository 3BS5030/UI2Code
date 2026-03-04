const buildChildrenMap = (elements = []) => {
  const byParent = new Map();
  elements.forEach((element) => {
    const key = element.parentId ?? "__root__";
    if (!byParent.has(key)) byParent.set(key, []);
    byParent.get(key).push(element);
  });
  return byParent;
};

const collectDescendantIds = (startId, byParent, visited) => {
  if (visited.has(startId)) return;
  visited.add(startId);
  const children = byParent.get(startId) || [];
  children.forEach((child) => collectDescendantIds(child.id, byParent, visited));
};

const collectLayoutIds = (elements = []) => {
  if (!elements.length) return new Set();

  const byParent = buildChildrenMap(elements);
  const included = new Set();

  elements.forEach((element) => {
    if (!element?.isLayout) return;
    collectDescendantIds(element.id, byParent, included);
  });

  return included;
};

const normalizeParentIds = (elements = []) => {
  const presentIds = new Set(elements.map((element) => element.id));
  return elements.map((element) => {
    if (!element.parentId || presentIds.has(element.parentId)) return element;
    return { ...element, parentId: null };
  });
};

const mapInheritedIds = (elements = [], pageId) => {
  if (!elements.length) return [];
  const idMap = new Map();
  elements.forEach((element) => {
    idMap.set(element.id, `layout-${pageId}-${element.id}`);
  });

  return elements.map((element) => ({
    ...element,
    id: idMap.get(element.id),
    parentId: element.parentId ? (idMap.get(element.parentId) || null) : null,
    sourceElementId: element.id
  }));
};

export const getPageChain = (pages = [], pageOrId) => {
  if (!Array.isArray(pages) || pages.length === 0) return [];

  const byId = new Map(pages.map((page) => [page.id, page]));
  const startPage = typeof pageOrId === "object" && pageOrId
    ? byId.get(pageOrId.id) || pageOrId
    : byId.get(pageOrId);

  if (!startPage) return [];

  const chain = [];
  const visited = new Set();
  let current = startPage;

  while (current && !visited.has(current.id)) {
    chain.push(current);
    visited.add(current.id);
    current = current.parentId ? byId.get(current.parentId) : null;
  }

  return chain.reverse();
};

export const getLayoutElementsForPage = (page) => {
  const elements = page?.elements || [];
  const layoutIds = collectLayoutIds(elements);
  if (!layoutIds.size) return [];

  const selected = elements.filter((element) => layoutIds.has(element.id));
  return normalizeParentIds(selected);
};

export const getEffectivePageElements = (pages = [], pageOrId) => {
  const chain = getPageChain(pages, pageOrId);
  if (!chain.length) return [];

  const currentPage = chain[chain.length - 1];
  const inherited = chain.slice(0, -1).flatMap((ancestor) => {
    const layoutElements = getLayoutElementsForPage(ancestor);
    return mapInheritedIds(layoutElements, ancestor.id).map((element) => ({
      ...element,
      layoutInherited: true,
      layoutReadOnly: true,
      layoutSourcePageId: ancestor.id
    }));
  });

  const own = (currentPage?.elements || []).map((element) => ({
    ...element,
    layoutInherited: false,
    layoutReadOnly: false,
    layoutSourcePageId: currentPage.id
  }));

  return [...inherited, ...own];
};
