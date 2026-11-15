import { useCallback, useEffect, useMemo, useState } from "react";
import {
  FiArchive,
  FiCheck,
  FiChevronDown,
  FiChevronLeft,
  FiChevronRight,
  FiImage,
  FiInbox,
  FiLogOut,
  FiMenu,
  FiMessageCircle,
  FiPlus,
  FiSearch,
  FiShield,
  FiTool,
  FiTrash2,
  FiX,
} from "react-icons/fi";
import { api } from "./api.js";

const blankProject = {
  title: "",
  vehicle: "",
  service: "Instalación de parabrisas",
  description: "",
};

function dateLabel(value) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("es-PE", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function App() {
  const [admin, setAdmin] = useState(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [section, setSection] = useState("projects");
  const [mobileNav, setMobileNav] = useState(false);
  const [projects, setProjects] = useState([]);
  const [messages, setMessages] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [messageFilter, setMessageFilter] = useState("all");
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [notice, setNotice] = useState(null);
  const [modal, setModal] = useState(null);
  const [saving, setSaving] = useState(false);
  const [login, setLogin] = useState({ email: "", password: "" });
  const [loginError, setLoginError] = useState("");

  const showNotice = useCallback((message, kind = "success") => {
    setNotice({ message, kind });
    window.setTimeout(() => setNotice(null), 4200);
  }, []);

  const loadProjects = useCallback(async () => {
    const result = await api("/api/trabajos");
    setProjects(result);
  }, []);

  const loadMessages = useCallback(async (status = "all") => {
    const query = status === "all" ? "" : `?status=${status}`;
    const [result, unread] = await Promise.all([
      api(`/api/mensajes${query}`),
      api("/api/mensajes?status=new"),
    ]);
    setMessages(result);
    setUnreadCount(unread.length);
  }, []);

  const refreshSection = useCallback(async () => {
    if (!admin) return;
    setLoading(true);
    try {
      if (section === "projects") {
        const [, unread] = await Promise.all([
          loadProjects(),
          api("/api/mensajes?status=new"),
        ]);
        setUnreadCount(unread.length);
      }
      else await loadMessages(messageFilter);
    } catch (error) {
      if (error.status === 401) setAdmin(null);
      else showNotice(error.message, "error");
    } finally {
      setLoading(false);
    }
  }, [admin, section, messageFilter, loadProjects, loadMessages, showNotice]);

  useEffect(() => {
    let active = true;
    api("/api/auth/session")
      .then((result) => { if (active) setAdmin(result.admin); })
      .catch(() => {})
      .finally(() => { if (active) setCheckingSession(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    refreshSection();
  }, [refreshSection]);

  const filteredProjects = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("es");
    if (!term) return projects;
    return projects.filter((project) =>
      [project.title, project.vehicle, project.service, project.description]
        .some((value) => String(value || "").toLocaleLowerCase("es").includes(term)),
    );
  }, [projects, search]);

  async function submitLogin(event) {
    event.preventDefault();
    setLoginError("");
    setSaving(true);
    try {
      const result = await api("/api/auth/login", {
        method: "POST",
        body: JSON.stringify(login),
      });
      setAdmin(result.admin);
      setLogin({ email: "", password: "" });
    } catch (error) {
      setLoginError(error.message);
    } finally {
      setSaving(false);
    }
  }

  async function logout() {
    try {
      await api("/api/auth/logout", { method: "POST" });
    } finally {
      setAdmin(null);
      setProjects([]);
      setMessages([]);
    }
  }

  async function saveProject(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const files = data.getAll("images").filter((file) => file.size > 0);
    data.delete("images");
    files.forEach((file) => data.append("images", file));
    const existing = modal?.project;
    if (!existing && files.length === 0) {
      showNotice("Selecciona al menos una foto del trabajo.", "error");
      return;
    }

    setSaving(true);
    try {
      const path = existing ? `/api/trabajos/${existing.id}` : "/api/trabajos";
      await api(path, { method: existing ? "PUT" : "POST", body: data });
      setModal(null);
      await loadProjects();
      showNotice(existing ? "Trabajo actualizado." : "Trabajo agregado a la galería.");
    } catch (error) {
      showNotice(error.message, "error");
    } finally {
      setSaving(false);
    }
  }

  async function deleteProject(project) {
    if (!window.confirm(`¿Eliminar “${project.title}” y sus fotos?`)) return;
    try {
      await api(`/api/trabajos/${project.id}`, { method: "DELETE" });
      setProjects((current) => current.filter((item) => item.id !== project.id));
      showNotice("Trabajo eliminado de la galería.");
    } catch (error) {
      showNotice(error.message, "error");
    }
  }

  async function updateMessage(message, status) {
    try {
      await api(`/api/mensajes/${message.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      await loadMessages(messageFilter);
      showNotice(status === "archived" ? "Mensaje archivado." : "Mensaje marcado como leído.");
    } catch (error) {
      showNotice(error.message, "error");
    }
  }

  async function deleteMessage(message) {
    if (!window.confirm("¿Eliminar este mensaje de forma permanente?")) return;
    try {
      await api(`/api/mensajes/${message.id}`, { method: "DELETE" });
      setMessages((current) => current.filter((item) => item.id !== message.id));
      showNotice("Mensaje eliminado.");
    } catch (error) {
      showNotice(error.message, "error");
    }
  }

  if (checkingSession) {
    return <main className="boot-screen"><span className="loader" /><p>Preparando tu espacio de trabajo</p></main>;
  }

  if (!admin) {
    return (
      <main className="login-screen">
        <section className="login-card">
          <a className="brand brand-login" href="/" aria-label="Soliglas administración">
            <span className="brand-mark">S</span><span>SOLIGLAS<span className="brand-dot">.</span></span>
          </a>
          <span className="eyebrow login-eyebrow"><FiShield /> ACCESO ADMINISTRATIVO</span>
          <h1>Bienvenido de nuevo.</h1>
          <p className="login-copy">Ingresa con tu cuenta para gestionar el catálogo y las consultas de tus clientes.</p>
          <form className="login-form" onSubmit={submitLogin}>
            <label htmlFor="email">Correo electrónico</label>
            <input id="email" autoComplete="username" type="email" value={login.email} onChange={(event) => setLogin({ ...login, email: event.target.value })} placeholder="admin@soliglas.com" required />
            <label htmlFor="password">Contraseña</label>
            <input id="password" autoComplete="current-password" type="password" value={login.password} onChange={(event) => setLogin({ ...login, password: event.target.value })} placeholder="Tu contraseña" required />
            {loginError && <p className="form-error" role="alert">{loginError}</p>}
            <button className="button button-primary login-submit" type="submit" disabled={saving}>{saving ? "Validando…" : "Iniciar sesión"}<FiChevronRight /></button>
          </form>
          <p className="secure-note"><FiShield /> Conexión protegida. Solo usuarios autorizados.</p>
        </section>
        <div className="login-aside"><div className="aside-orb orb-one" /><div className="aside-orb orb-two" /><span className="aside-kicker">SOLIGLAS · ADMIN</span><p>Todo lo que tu equipo necesita.<br /><strong>En un mismo lugar.</strong></p><span className="aside-foot">Catálogo · Consultas · Contenido</span></div>
      </main>
    );
  }

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileNav ? "sidebar-open" : ""}`}>
        <a className="brand" href="#inicio" onClick={() => setSection("projects")}><span className="brand-mark">S</span><span>SOLIGLAS<span className="brand-dot">.</span><small>ADMINISTRACIÓN</small></span></a>
        <div className="sidebar-label">ESPACIO DE TRABAJO</div>
        <nav className="side-nav" aria-label="Navegación del panel">
          <button className={section === "projects" ? "nav-link active" : "nav-link"} onClick={() => { setSection("projects"); setMobileNav(false); }}><FiTool /><span>Trabajos realizados</span><FiChevronRight className="nav-arrow" /></button>
          <button className={section === "messages" ? "nav-link active" : "nav-link"} onClick={() => { setSection("messages"); setMobileNav(false); }}><FiInbox /><span>Mensajes</span>{unreadCount > 0 && <span className="nav-count">{unreadCount}</span>}</button>
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-tip"><FiImage /><p>Las fotos de tus instalaciones se guardan de forma segura en Cloudinary.</p></div>
          <div className="admin-profile"><span className="avatar">{admin.email?.[0]?.toUpperCase() || "A"}</span><span className="profile-copy"><strong>Administrador</strong><small>{admin.email}</small></span><button className="icon-button logout-button" onClick={logout} aria-label="Cerrar sesión" title="Cerrar sesión"><FiLogOut /></button></div>
        </div>
      </aside>
      {mobileNav && <button className="mobile-scrim" aria-label="Cerrar menú" onClick={() => setMobileNav(false)} />}
      <main className="main-area">
        <header className="topbar">
          <button className="icon-button mobile-menu" onClick={() => setMobileNav(true)} aria-label="Abrir menú"><FiMenu /></button>
          <div className="breadcrumbs"><span>Panel</span><FiChevronRight /><strong>{section === "projects" ? "Trabajos realizados" : "Mensajes"}</strong></div>
          <div className="topbar-right"><span className="status-dot" /> Sistema activo <span className="topbar-divider" /><span className="topbar-date">{new Intl.DateTimeFormat("es-PE", { dateStyle: "full" }).format(new Date())}</span></div>
        </header>
        <div className="content-wrap">
          {section === "projects" ? (
            <>
              <section className="page-heading">
                <div><span className="eyebrow">PORTAFOLIO</span><h1>Trabajos realizados</h1><p>Muestra las instalaciones y servicios que ha realizado Soliglas.</p></div>
                <button className="button button-primary" onClick={() => setModal({ project: null })}><FiPlus /> Agregar trabajo</button>
              </section>
              <section className="stats-grid" aria-label="Resumen de la galería">
                <article className="stat-card"><span className="stat-icon blue"><FiTool /></span><span className="stat-label">Trabajos publicados</span><strong>{projects.length}</strong><small>En la galería de Soliglas</small></article>
                <article className="stat-card"><span className="stat-icon violet"><FiImage /></span><span className="stat-label">Fotos de trabajos</span><strong>{projects.reduce((count, project) => count + (project.images?.length || 0), 0)}</strong><small>Almacenadas en Cloudinary</small></article>
                <article className="stat-card"><span className="stat-icon green"><FiInbox /></span><span className="stat-label">Mensajes nuevos</span><strong>{unreadCount}</strong><small>Consultas por responder</small></article>
              </section>
              <section className="panel-card catalog-panel">
                <div className="panel-heading"><div><h2>Galería de trabajos</h2><p>{projects.length} {projects.length === 1 ? "trabajo" : "trabajos"} registrados</p></div><label className="search-box"><FiSearch /><input aria-label="Buscar trabajos" placeholder="Buscar trabajo…" value={search} onChange={(event) => setSearch(event.target.value)} /></label></div>
                {loading ? <LoadingState /> : filteredProjects.length ? (
                  <div className="table-scroll"><table className="data-table"><thead><tr><th>TRABAJO REALIZADO</th><th>VEHÍCULO</th><th>SERVICIO</th><th>FOTOS</th><th>FECHA</th><th><span className="sr-only">Acciones</span></th></tr></thead><tbody>{filteredProjects.map((project) => <tr key={project.id}><td><div className="product-cell"><div className="product-thumb">{project.images?.[0] ? <img src={project.images[0]} alt="" /> : <FiImage />}</div><span><strong>{project.title}</strong><small>{project.description}</small></span></div></td><td><strong>{project.vehicle}</strong></td><td><span className="category-pill">{project.service}</span></td><td className="muted-cell">{project.images?.length || 0} fotos</td><td className="muted-cell">{dateLabel(project.createdAt)}</td><td><div className="row-actions"><button className="text-action" onClick={() => setModal({ project })}>Editar</button><button className="icon-button danger-button" onClick={() => deleteProject(project)} aria-label={`Eliminar ${project.title}`} title="Eliminar"><FiTrash2 /></button></div></td></tr>)}</tbody></table></div>
                ) : <EmptyState icon={<FiTool />} title={search ? "No encontramos coincidencias" : "Tu galería empieza aquí"} copy={search ? "Prueba con otro vehículo, servicio o título." : "Agrega tu primer trabajo para mostrar una instalación realizada por Soliglas."} action={!search && <button className="button button-primary" onClick={() => setModal({ project: null })}><FiPlus /> Agregar trabajo</button>} />}
                <div className="table-footer"><span>Mostrando {filteredProjects.length} de {projects.length} trabajos</span><span className="pagination-copy"><FiChevronLeft /> Página 1 de 1 <FiChevronRight /></span></div>
              </section>
            </>
          ) : (
            <>
              <section className="page-heading"><div><span className="eyebrow">COMUNICACIÓN</span><h1>Mensajes</h1><p>Lee y organiza las consultas que llegan desde tu página web.</p></div></section>
              <section className="stats-grid message-stats"><article className="stat-card"><span className="stat-icon blue"><FiInbox /></span><span className="stat-label">Mensajes recibidos</span><strong>{messages.length}</strong><small>En esta vista</small></article><article className="stat-card"><span className="stat-icon amber"><FiMessageCircle /></span><span className="stat-label">Sin leer</span><strong>{unreadCount}</strong><small>Requieren atención</small></article></section>
              <section className="panel-card messages-panel"><div className="panel-heading"><div><h2>Bandeja de entrada</h2><p>Las consultas más recientes primero</p></div><label className="filter-select"><select value={messageFilter} onChange={(event) => setMessageFilter(event.target.value)} aria-label="Filtrar mensajes"><option value="all">Todos los mensajes</option><option value="new">Sin leer</option><option value="read">Leídos</option><option value="archived">Archivados</option></select><FiChevronDown /></label></div>
                {loading ? <LoadingState /> : messages.length ? <div className="message-list">{messages.map((message) => <article className={`message-card ${message.status === "new" ? "message-unread" : ""}`} key={message.id}><div className="message-avatar">{message.name?.[0]?.toUpperCase() || "C"}</div><div className="message-main"><div className="message-title"><h3>{message.subject}</h3>{message.status === "new" && <span className="unread-label">NUEVO</span>}</div><p className="message-from">{message.name} <span>·</span> {message.email}{message.phone && <> <span>·</span> {message.phone}</>}</p><p className="message-body">{message.message}</p><div className="message-meta"><span>{dateLabel(message.created_at)}</span>{message.status === "archived" && <span className="archived-label"><FiArchive /> Archivado</span>}</div></div><div className="message-actions">{message.status === "new" && <button className="text-action" onClick={() => updateMessage(message, "read")}><FiCheck /> Marcar leído</button>}{message.status !== "archived" && <button className="icon-button" onClick={() => updateMessage(message, "archived")} aria-label="Archivar mensaje" title="Archivar"><FiArchive /></button>}<button className="icon-button danger-button" onClick={() => deleteMessage(message)} aria-label="Eliminar mensaje" title="Eliminar"><FiTrash2 /></button></div></article>)}</div> : <EmptyState icon={<FiInbox />} title="No hay mensajes en esta vista" copy="Cuando alguien envíe una consulta desde la web, aparecerá aquí." />}
                <div className="table-footer"><span>{messages.length} mensajes cargados</span><span className="secure-note"><FiShield /> Mensajes privados</span></div>
              </section>
            </>
          )}
          <footer className="app-footer"><span>© {new Date().getFullYear()} Soliglas</span><span>Panel de administración <i /> Gestión segura</span></footer>
        </div>
      </main>
      {modal && <ProjectModal project={modal.project} saving={saving} onClose={() => !saving && setModal(null)} onSubmit={saveProject} />}
      {notice && <div className={`toast toast-${notice.kind}`} role="status">{notice.kind === "success" ? <FiCheck /> : <FiX />}{notice.message}</div>}
    </div>
  );
}

function ProjectModal({ project, saving, onClose, onSubmit }) {
  const value = (key, fallback = "") => project?.[key] ?? fallback;
  return <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><section className="product-modal" role="dialog" aria-modal="true" aria-labelledby="project-modal-title"><div className="modal-heading"><div><span className="eyebrow">PORTAFOLIO</span><h2 id="project-modal-title">{project ? "Editar trabajo" : "Agregar trabajo"}</h2><p>{project ? "Actualiza los datos y agrega fotos del trabajo." : "Describe el vehículo y la instalación que realizaste."}</p></div><button type="button" className="icon-button" onClick={onClose} aria-label="Cerrar"><FiX /></button></div><form className="product-form" onSubmit={onSubmit}>
    <div className="form-grid"><div className="field field-wide"><label htmlFor="project-title">Nombre del trabajo</label><input id="project-title" name="title" maxLength="180" defaultValue={value("title")} placeholder="Ej. Instalación de parabrisas en Porsche Cayenne" required /></div>
      <div className="field"><label htmlFor="project-vehicle">Vehículo</label><input id="project-vehicle" name="vehicle" maxLength="180" defaultValue={value("vehicle")} placeholder="Porsche Cayenne" required /></div>
      <div className="field"><label htmlFor="project-service">Servicio realizado</label><select id="project-service" name="service" defaultValue={value("service", blankProject.service)}><option>Instalación de parabrisas</option><option>Reparación de parabrisas</option><option>Polarizado</option><option>Laminado de vidrios</option><option>Instalación de luneta</option><option>Instalación de vidrio lateral</option><option>Otro trabajo</option></select></div>
      <div className="field field-wide"><label htmlFor="project-description">Descripción del trabajo</label><textarea id="project-description" name="description" rows="4" maxLength="2000" defaultValue={value("description")} placeholder="Cuenta brevemente qué trabajo se realizó y algún detalle que quieras destacar…" required /></div>
      <div className="field field-wide"><label htmlFor="project-images">{project ? "Agregar fotos" : "Fotos del trabajo"}<span className="label-hint">JPG, PNG o WebP · hasta 8 fotos de 6 MB</span></label><input className="file-input" id="project-images" type="file" name="images" accept="image/jpeg,image/png,image/webp" multiple={!project} /><small className="field-help">{project ? "Las fotos existentes se mantienen; las nuevas se añadirán." : "Sube fotos del vehículo y del resultado de la instalación."}</small></div>
    </div><div className="modal-actions"><button type="button" className="button button-quiet" onClick={onClose} disabled={saving}>Cancelar</button><button className="button button-primary" type="submit" disabled={saving}>{saving ? "Guardando…" : project ? "Guardar cambios" : "Agregar a la galería"}<FiChevronRight /></button></div>
  </form></section></div>;
}

function LoadingState() { return <div className="loading-state"><span className="loader" /><p>Cargando información…</p></div>; }

function EmptyState({ icon, title, copy, action }) {
  return <div className="empty-state"><span className="empty-icon">{icon}</span><h3>{title}</h3><p>{copy}</p>{action}</div>;
}

export default App;
