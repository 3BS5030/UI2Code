export const VIEWPORTS = [
  { id: "desktop", label: "Desktop (1200px)", width: 1200, key: "base" },
  { id: "tablet", label: "Tablet (768px)", width: 768, key: "tablet" },
  { id: "mobile", label: "Mobile (375px)", width: 375, key: "mobile" }
];

export const RESPONSIVE_BREAKPOINTS = {
  tablet: { key: "tablet", media: "(max-width: 992px)" },
  mobile: { key: "mobile", media: "(max-width: 576px)" }
};