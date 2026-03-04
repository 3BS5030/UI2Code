import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Container, Nav, Navbar, NavDropdown, Button, Modal, Form, Collapse, Table } from "react-bootstrap";
import { useBuilderStore } from "../../store/builderStore";
import { generatePageHtml } from "../../core/generator";
import { exportPageZip, exportPageImage, exportProjectZipFromFiles, buildReactProjectFiles } from "../../core/exporter";
import { VIEWPORTS } from "../../core/viewports";

const getFolder = (path) => {
  const parts = path.split("/");
  parts.pop();
  return parts.join("/");
};

const getBase = (path) => {
  const parts = path.split("/");
  return parts[parts.length - 1];
};

const ensureUniquePath = (path, existing, originalPath) => {
  if (!existing.has(path) || path === originalPath) return path;
  const parts = path.split("/");
  const name = parts.pop();
  const extMatch = name.match(/^(.*?)(\.[^.]+)?$/);
  const base = extMatch?.[1] || name;
  const ext = extMatch?.[2] || "";
  let i = 1;
  let next = path;
  while (existing.has(next)) {
    next = [...parts, `${base}_${i}${ext}`].filter(Boolean).join("/");
    i += 1;
  }
  return next;
};


export default function AppNavbar() {
  const pages = useBuilderStore(state => state.pages);
  const currentPageId = useBuilderStore(state => state.currentPageId);
  const addPage = useBuilderStore(state => state.addPage);
  const selectPage = useBuilderStore(state => state.selectPage);
  const globalCssFiles = useBuilderStore(state => state.globalCssFiles);
  const globalJsFiles = useBuilderStore(state => state.globalJsFiles);
  const viewportPreset = useBuilderStore(state => state.viewportPreset);
  const getSessionSnapshot = useBuilderStore(state => state.getSessionSnapshot);
  const restoreSessionFromSnapshot = useBuilderStore(state => state.restoreSessionFromSnapshot);

  const firstPage = pages[0] || { title: "Home", route: "/", description: "" };
  const currentPage = useMemo(
    () => pages.find(p => p.id === currentPageId) || firstPage,
    [pages, currentPageId, firstPage]
  );

  const [showModal, setShowModal] = useState(false);
  const [showCode, setShowCode] = useState(false);
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [isExportingImage, setIsExportingImage] = useState(false);
  const [filesState, setFilesState] = useState([]);
  const sessionFileInputRef = useRef(null);
  const [title, setTitle] = useState(firstPage.title || "Home");
  const [route, setRoute] = useState(firstPage.route || "/");
  const [description, setDescription] = useState(firstPage.description || "");
  const [parentId, setParentId] = useState("root");

  const openModal = useCallback(() => {
    setTitle(firstPage.title || "Home");
    setRoute(firstPage.route || "/");
    setDescription(firstPage.description || "");
    setParentId("root");
    setShowModal(true);
  }, [firstPage]);

  useEffect(() => {
    const handleOpenAddPageModal = () => openModal();
    window.addEventListener("ui2code:open-add-page-modal", handleOpenAddPageModal);
    return () => {
      window.removeEventListener("ui2code:open-add-page-modal", handleOpenAddPageModal);
    };
  }, [openModal]);

  const buildRoute = (baseRoute, childRoute) => {
    const cleanBase = (baseRoute || "/").replace(/\/$/, "");
    const cleanChild = (childRoute || "").replace(/^\//, "");
    if (!cleanChild) return cleanBase || "/";
    if (cleanBase === "") return `/${cleanChild}`;
    if (cleanBase === "/") return `/${cleanChild}`;
    return `${cleanBase}/${cleanChild}`;
  };

  const handleCreate = () => {
    if (!title.trim() || !route.trim()) return;
    const selectedParent =
      parentId !== "root" ? pages.find(p => p.id === Number(parentId)) : null;
    const finalRoute = selectedParent
      ? buildRoute(selectedParent.route, route.trim())
      : route.trim();
    addPage({
      title: title.trim(),
      route: finalRoute,
      parentId: selectedParent ? selectedParent.id : null,
      description: description.trim()
    });
    setShowModal(false);
  };

  const code = useMemo(() => generatePageHtml(currentPage, pages), [currentPage, pages]);

  const openProjectModal = () => {
    const files = buildReactProjectFiles(pages, globalCssFiles, globalJsFiles);
    const list = Array.from(files.entries()).map(([path, content]) => ({
      path,
      originalPath: path,
      content,
      deleted: false
    }));
    setFilesState(list);
    setShowProjectModal(true);
  };

  const folderOptions = useMemo(() => {
    const folders = new Set([""]); // root
    filesState.forEach(f => {
      if (f.deleted) return;
      const folder = getFolder(f.path);
      if (folder) folders.add(folder);
    });
    return Array.from(folders).sort();
  }, [filesState]);

  const viewportWidth = useMemo(() => {
    const selected = VIEWPORTS.find(v => v.id === viewportPreset) || VIEWPORTS[0];
    return Number(selected?.width) || 1200;
  }, [viewportPreset]);

  const updateFilePath = (index, nextPath) => {
    setFilesState(prev => {
      const existing = new Set(prev.filter(f => !f.deleted).map(f => f.path));
      const current = prev[index];
      const unique = ensureUniquePath(nextPath, existing, current.path);
      const copy = [...prev];
      copy[index] = { ...current, path: unique };
      return copy;
    });
  };

  const handleRename = (index, name) => {
    const current = filesState[index];
    const folder = getFolder(current.path);
    const nextPath = folder ? `${folder}/${name}` : name;
    updateFilePath(index, nextPath);
  };

  const handleMove = (index, folder) => {
    const current = filesState[index];
    const name = getBase(current.path);
    const nextPath = folder ? `${folder}/${name}` : name;
    updateFilePath(index, nextPath);
  };

  const handleDelete = (index) => {
    setFilesState(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], deleted: !copy[index].deleted };
      return copy;
    });
  };

  const handleExportProject = async () => {
    const original = buildReactProjectFiles(pages, globalCssFiles, globalJsFiles);
    const newFiles = new Map();
    const pathMap = new Map();

    filesState.forEach(file => {
      if (file.deleted) return;
      newFiles.set(file.path, file.content);
      pathMap.set(file.originalPath, file.path);
    });

    await exportProjectZipFromFiles(newFiles, original, pathMap, "react-project.zip");
    setShowProjectModal(false);
  };

  const handleExportImage = async (format) => {
    if (!currentPage || isExportingImage) return;
    setIsExportingImage(true);
    try {
      const globalCssText = (globalCssFiles || []).map(f => f.content || "").join("\n");
      await exportPageImage(currentPage, {
        pages,
        format,
        width: viewportWidth,
        pixelRatio: 2,
        globalCssText
      });
    } catch (err) {
      console.error("Image export failed:", err);
      alert("Image export failed. Check console for details.");
    } finally {
      setIsExportingImage(false);
    }
  };

  const buildSessionFileName = () => {
    const now = new Date();
    const pad = (v) => String(v).padStart(2, "0");
    const date = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
    const time = `${pad(now.getHours())}-${pad(now.getMinutes())}`;
    return `ui2code-session-${date}_${time}.json`;
  };

  const downloadSession = () => {
    try {
      const snapshot = getSessionSnapshot?.();
      if (!snapshot || !Array.isArray(snapshot.pages) || snapshot.pages.length === 0) {
        alert("No session data to save.");
        return;
      }

      const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = buildSessionFileName();
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Session export error:", err);
      alert("Failed to save session file.");
    }
  };

  const openSessionPicker = () => {
    sessionFileInputRef.current?.click();
  };

  const handleOpenSessionFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const result = restoreSessionFromSnapshot?.(parsed);
      if (!result?.ok) {
        alert(result?.message || "Could not open session file.");
        return;
      }
      alert("Session loaded successfully.");
    } catch (err) {
      console.error("Session import error:", err);
      alert("Invalid session file.");
    }
  };

  // JS/CSS editors moved to EditorsPanel

  return (
    <>
      <Navbar expand="lg" className="bg-body-tertiary">
        <Container fluid>
          <Navbar.Brand style={{ color: "black" }}>
            UI2Code
          </Navbar.Brand>
          <Navbar.Toggle aria-controls="basic-navbar-nav" />
          <Navbar.Collapse id="basic-navbar-nav">
            <Nav className="me-auto">
              <NavDropdown title={`Page: ${currentPage?.title || "Home"}`} id="page-selector">
                {pages.map(page => (
                  <NavDropdown.Item
                    key={page.id}
                    active={page.id === currentPageId}
                    onClick={() => selectPage(page.id)}
                    style={{"z-index":"50000"}}
                  >
                    {page.title} ({page.route})
                  </NavDropdown.Item>
                ))}
              </NavDropdown>
            </Nav>

            <div className="navbar-actions">
              <input
                ref={sessionFileInputRef}
                type="file"
                accept="application/json,.json"
                style={{ display: "none" }}
                onChange={handleOpenSessionFile}
              />
              <div className="navbar-menu-strip">
                <Button
                  variant="link"
                  size="sm"
                  onClick={() => setShowCode(v => !v)}
                  className={`nav-menu-btn${showCode ? " is-active" : ""}`}
                >
                  {showCode ? "Hide Code" : "Show Code"}
                </Button>
                <Button
                  variant="link"
                  size="sm"
                  onClick={() => exportPageZip(currentPage, pages)}
                  className="nav-menu-btn"
                >
                  Save Page
                </Button>
                <Button
                  variant="link"
                  size="sm"
                  onClick={downloadSession}
                  className="nav-menu-btn"
                >
                  Save Session
                </Button>
                <Button
                  variant="link"
                  size="sm"
                  onClick={openSessionPicker}
                  className="nav-menu-btn"
                >
                  Open Session
                </Button>
                <NavDropdown
                  title={isExportingImage ? "Saving..." : "Save Image"}
                  id="save-image-dropdown"
                  className="nav-menu-dropdown"
                >
                  <NavDropdown.Item disabled={isExportingImage} onClick={() => handleExportImage("png")}>
                    PNG
                  </NavDropdown.Item>
                  <NavDropdown.Item disabled={isExportingImage} onClick={() => handleExportImage("svg")}>
                    SVG
                  </NavDropdown.Item>
                </NavDropdown>
                <Button
                  variant="link"
                  size="sm"
                  onClick={openProjectModal}
                  className="nav-menu-btn"
                >
                  Save Project
                </Button>
              </div>

            </div>
          </Navbar.Collapse>
        </Container>
      </Navbar>

      <Collapse in={showCode}>
        <div className="page-code">
          <div className="page-code__header">
            Code for: {currentPage?.title || "Home"} ({currentPage?.route || "/"})
          </div>
          <pre className="page-code__body"><code>{code}</code></pre>
        </div>
      </Collapse>

      {/* Editors are rendered in App layout */}



      <Modal show={showProjectModal} onHide={() => setShowProjectModal(false)} size="lg" centered>
        <Modal.Header closeButton>
          <Modal.Title>Project File Tree</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Table bordered size="sm">
            <thead>
              <tr>
                <th>Folder</th>
                <th>File</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filesState.map((file, index) => (
                <tr key={file.originalPath} style={{ opacity: file.deleted ? 0.4 : 1 }}>
                  <td style={{ width: "40%" }}>
                    <Form.Select
                      size="sm"
                      value={getFolder(file.path)}
                      onChange={e => handleMove(index, e.target.value)}
                      disabled={file.deleted}
                    >
                      {folderOptions.map(folder => (
                        <option key={folder} value={folder}>
                          {folder || "(root)"}
                        </option>
                      ))}
                    </Form.Select>
                  </td>
                  <td>
                    <Form.Control
                      size="sm"
                      value={getBase(file.path)}
                      onChange={e => handleRename(index, e.target.value)}
                      disabled={file.deleted}
                    />
                  </td>
                  <td style={{ width: "140px" }}>
                    <Button
                      variant={file.deleted ? "outline-success" : "outline-danger"}
                      size="sm"
                      onClick={() => handleDelete(index)}
                    >
                      {file.deleted ? "Undo" : "Delete"}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
          <div className="text-muted" style={{ fontSize: 12 }}>
            Renaming or moving files will update imports automatically for generated files.
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" size="sm" onClick={() => setShowProjectModal(false)}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" onClick={handleExportProject}>
            Export ZIP
          </Button>
        </Modal.Footer>
      </Modal>

      <Modal show={showModal} onHide={() => setShowModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>New Page</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Title</Form.Label>
              <Form.Control
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Page title"
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Route</Form.Label>
              <Form.Control
                type="text"
                value={route}
                onChange={e => setRoute(e.target.value)}
                placeholder={parentId === "root" ? "/about" : "child-path"}
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Parent Page</Form.Label>
              <Form.Select
                value={parentId}
                onChange={e => setParentId(e.target.value)}
              >
                <option value="root">Root (new route)</option>
                {pages.map(page => (
                  <option key={page.id} value={page.id}>
                    {page.title} ({page.route})
                  </option>
                ))}
              </Form.Select>
              {parentId !== "root" && (
                <Form.Text>
                  Full route will be:{" "}
                  {buildRoute(
                    pages.find(p => p.id === Number(parentId))?.route || "/",
                    route
                  )}
                </Form.Text>
              )}
            </Form.Group>
            <Form.Group>
              <Form.Label>Description</Form.Label>
              <Form.Control
                as="textarea"
                rows={2}
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Optional"
              />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" size="sm" onClick={() => setShowModal(false)}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleCreate}
            disabled={!title.trim() || !route.trim()}
          >
            Create
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}
