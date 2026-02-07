# UI Builder (uitofront)

Drag-and-drop UI builder with multi-page support, responsive breakpoints, inline preview, and export to HTML or a structured React project.

## Features
- Visual canvas with drag, resize, and selection.
- Multi-page routing with page metadata.
- Responsive breakpoints and per-viewport overrides.
- Properties panel with style editor, pseudo states, and animations.
- Custom CSS/JS per page and global CSS/JS files.
- Session persistence (refresh-safe).
- Export:
  - Single page HTML.
  - Full React project (structured files).

## Quick Start
1. Install dependencies.
2. Start the dev server.

```bash
npm install
npm start
```

App runs at `http://localhost:3000`.

## How It Works
### Pages
Each page stores:
- Elements tree (with parent/child relationships).
- Body styles/attributes.
- Custom CSS/JS text.
- Page CSS/JS files (custom names).

### Responsive
Each element can store `responsiveStyles` for breakpoints. The generator emits media queries using `RESPONSIVE_BREAKPOINTS` from `src/core/viewports.js`.

### Custom CSS/JS
The editor panel supports:
- Page CSS files.
- Global CSS files.
- Page JS files.
- Global JS files.
- Inline custom CSS/JS.

In preview/export, all sources are concatenated and applied in this order:
1. Generated base styles.
2. Body responsive styles.
3. Page CSS files.
4. Global CSS files.
5. Inline custom CSS.
6. Page JS files.
7. Global JS files.
8. Inline custom JS.

## Preview Mode
Preview runs in the same page (toggle from the navbar). It hides editing UI and renders the output as it will be exported.

## Export
Use the navbar actions:
- **Save Page**: exports a single HTML page.
- **Save Project**: builds a full React project in `/exports` and downloads a zip.

## Structure
Key files:
- `src/store/builderStore.js` - main state + session persistence.
- `src/store/builderFunctions.js` - element defaults and helpers.
- `src/components/canvas/Canvas.jsx` - canvas and viewport toolbar.
- `src/components/canvas/CanvasItem.jsx` - element rendering/drag/resize.
- `src/components/properties/PropertiesPanel.jsx` - property editor.
- `src/components/layout/EditorsPanel.jsx` - CSS/JS editors + JS actions.
- `src/core/generator.js` - HTML/CSS/JS generation.
- `src/core/exporter.js` - export to HTML/React project.

## Development Notes
- The UI uses Bootstrap utility classes by default for elements.
- Images support direct URL or upload (base64).
- Selection stays on the selected element; clicks on canvas reset to body.

## Scripts
- `npm start` - dev server.
- `npm run build` - production build.
- `npm test` - tests.

