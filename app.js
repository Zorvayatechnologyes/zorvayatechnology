/* =========================================================
   Portfolio site  —  vanilla JS + Supabase (REST + Auth)
   Public site + admin dashboard (admin-only writes via RLS)
   ========================================================= */

const SUPABASE_URL  = "https://itpqcwaniuakbafupkwz.supabase.co";
const SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml0cHFjd2FuaXVha2JhZnVwa3d6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEwMjM5MjcsImV4cCI6MjEwNjU5OTkyN30.d3q3x_GCSw0GUeI3NjJK8G6MIM0rbZD4Sniy3jiFzSA";
const REST = SUPABASE_URL + "/rest/v1";
const AUTH = SUPABASE_URL + "/auth/v1";
const LS_SESSION = "pf_session";
const LS_THEME   = "pf_theme";

/* ---------------- state ---------------- */
const state = {
  session: null,
  user: null,
  settings: null,
  projects: [],
  isAdmin: false,
  filter: "All",
  adminTab: "projects",
  loginMode: "signin",
  contactRef: "",
  loaded: false,
  flash: null,
};

const app = document.getElementById("app");

/* ---------------- small helpers ---------------- */
function esc(s){
  return String(s == null ? "" : s).replace(/[&<>"']/g, c => (
    {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]
  ));
}
function slugify(s){
  return String(s||"").toLowerCase().trim()
    .replace(/[^a-z0-9\s-]/g,"").replace(/\s+/g,"-").replace(/-+/g,"-").replace(/^-|-$/g,"");
}
function fmtDate(d){
  if(!d) return "";
  try{ return new Date(d).toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"}); }
  catch(e){ return ""; }
}
function initials(name){
  const p = String(name||"").trim().split(/\s+/).filter(Boolean);
  if(!p.length) return "ME";
  return (p[0][0] + (p[1]?p[1][0]:"")).toUpperCase();
}
function waLink(num){
  return "https://wa.me/" + String(num||"").replace(/[^0-9]/g,"");
}
function parseList(v){
  return String(v||"").split(/[\n,]/).map(x=>x.trim()).filter(Boolean);
}

/* ---------------- REST / Auth ---------------- */
async function api(path, opts = {}){
  const { method = "GET", body, prefer, token } = opts;
  const headers = { apikey: SUPABASE_ANON, "Content-Type": "application/json" };
  const t = token || (state.session && state.session.access_token) || SUPABASE_ANON;
  headers["Authorization"] = "Bearer " + t;
  if(prefer) headers["Prefer"] = prefer;
  const res = await fetch(REST + path, {
    method, headers, body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch(e){ data = text; }
  if(!res.ok){
    const m = data && (data.message || data.hint || data.error_description || data.details);
    throw new Error(m || ("Request failed (" + res.status + ")"));
  }
  return data;
}

async function authReq(path, opts = {}){
  const headers = { apikey: SUPABASE_ANON, "Content-Type": "application/json", ...(opts.headers||{}) };
  const res = await fetch(AUTH + path, { ...opts, headers });
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch(e){ data = text; }
  if(!res.ok){
    const m = data && (data.error_description || data.msg || data.message || data.error);
    throw new Error(m || ("Auth failed (" + res.status + ")"));
  }
  return data;
}

/* ---------------- session ---------------- */
function saveSession(d){
  if(!d || !d.access_token) return;
  state.session = {
    access_token: d.access_token,
    refresh_token: d.refresh_token,
    expires_at: Date.now() + (d.expires_in ? d.expires_in*1000 : 3600*1000),
  };
  state.user = d.user || state.user;
  try{ localStorage.setItem(LS_SESSION, JSON.stringify({session:state.session, user:state.user})); }catch(e){}
}
function loadSessionFromStorage(){
  try{
    const raw = localStorage.getItem(LS_SESSION);
    if(!raw) return;
    const o = JSON.parse(raw);
    state.session = o.session || null;
    state.user = o.user || null;
  }catch(e){}
}
function clearSession(){
  state.session = null; state.user = null; state.isAdmin = false;
  try{ localStorage.removeItem(LS_SESSION); }catch(e){}
}
async function ensureSession(){
  if(!state.session) return null;
  if(state.session.expires_at && Date.now() < state.session.expires_at - 60000) return state.session;
  if(!state.session.refresh_token) return null;
  try{
    const d = await authReq("/token?grant_type=refresh_token", {
      method:"POST", body: JSON.stringify({ refresh_token: state.session.refresh_token }),
    });
    saveSession(d);
    return state.session;
  }catch(e){ clearSession(); return null; }
}
async function signIn(email, password){
  const d = await authReq("/token?grant_type=password", {
    method:"POST", body: JSON.stringify({ email, password }),
  });
  saveSession(d);
  state.user = d.user;
  return d;
}
async function signUp(email, password){
  const d = await authReq("/signup", { method:"POST", body: JSON.stringify({ email, password }) });
  if(d && d.access_token) saveSession(d);
  return d;
}
async function signOut(){
  try{ await authReq("/logout", { method:"POST", headers:{ Authorization:"Bearer " + (state.session&&state.session.access_token||"") } }); }catch(e){}
  clearSession();
}

/* ---------------- data ---------------- */
async function loadSettings(){
  try{
    const r = await api("/site_settings?select=*&id=eq.1");
    state.settings = (r && r[0]) || null;
  }catch(e){ state.settings = null; }
}
async function loadProjects(){
  try{
    state.projects = await api("/projects?select=*&order=featured.desc,sort_order.asc,created_at.desc") || [];
  }catch(e){ state.projects = []; }
}
async function checkAdmin(){
  if(!state.user || !state.user.email){ state.isAdmin = false; return; }
  try{
    const r = await api("/admins?select=email&email=eq." + encodeURIComponent(state.user.email));
    state.isAdmin = Array.isArray(r) && r.length > 0;
  }catch(e){ state.isAdmin = false; }
}

/* ---------------- theme ---------------- */
function applyTheme(){
  let t = "light";
  try{ t = localStorage.getItem(LS_THEME) || (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"); }catch(e){}
  document.documentElement.setAttribute("data-theme", t);
}
function toggleTheme(){
  const cur = document.documentElement.getAttribute("data-theme");
  const next = cur === "dark" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", next);
  try{ localStorage.setItem(LS_THEME, next); }catch(e){}
}

/* ---------------- shared chrome ---------------- */
function header(){
  const s = state.settings || {};
  return `
  <header class="site-header">
    <div class="wrap nav">
      <a class="brand" href="#/"><span class="dot"></span>${esc(s.full_name || "My Portfolio")}</a>
      <nav class="nav-links" id="navLinks">
        <a href="#/">Home</a>
        <a href="#/#about">About</a>
        <a href="#/#work">Work</a>
        <a href="#/contact">Contact</a>
      </nav>
      <div class="nav-actions">
        <button class="icon-btn" data-action="toggle-theme" title="Toggle theme" aria-label="Toggle theme">◐</button>
        <button class="icon-btn menu-toggle" data-action="toggle-menu" aria-label="Menu">☰</button>
      </div>
    </div>
  </header>`;
}
function footer(){
  const s = state.settings || {};
  return `
  <footer>
    <div class="wrap foot">
      <div>© ${new Date().getFullYear()} ${esc(s.full_name || "Portfolio")}. Built with care.</div>
      <div><a href="#/admin" style="color:var(--muted)">Admin</a></div>
    </div>
  </footer>`;
}
function socialLinks(s){
  const items = [
    ["GitHub", s.github_url], ["LinkedIn", s.linkedin_url],
    ["Instagram", s.instagram_url], ["Twitter / X", s.twitter_url],
  ].filter(x => x[1]);
  if(!items.length) return "";
  return `<div class="socials">` + items.map(([n,u]) =>
    `<a class="chip" href="${esc(u)}" target="_blank" rel="noopener">${n}</a>`).join("") + `</div>`;
}

/* ---------------- HOME ---------------- */
function projectCard(p){
  const tags = (p.tags||[]).slice(0,4).map(t=>`<span class="tag">${esc(t)}</span>`).join("");
  const thumb = p.cover_image_url
    ? `<img src="${esc(p.cover_image_url)}" alt="${esc(p.title)}" loading="lazy">`
    : `<div class="ph">${esc(p.title)}</div>`;
  return `
  <article class="card" data-action="open-project" data-slug="${esc(p.slug||p.id)}">
    <div class="thumb">${thumb}${p.featured?`<span class="badge">★ Featured</span>`:""}</div>
    <div class="card-body">
      <h3>${esc(p.title)}</h3>
      <p>${esc(p.summary||"")}</p>
      <div class="tags">${tags}</div>
    </div>
  </article>`;
}
function homeView(){
  const s = state.settings || {};
  const allTags = ["All"];
  state.projects.forEach(p => (p.tags||[]).forEach(t => { if(!allTags.includes(t)) allTags.push(t); }));
  const shown = state.filter === "All" ? state.projects
    : state.projects.filter(p => (p.tags||[]).includes(state.filter));

  const avatar = s.avatar_url
    ? `<img src="${esc(s.avatar_url)}" alt="${esc(s.full_name||"")}">`
    : `<div class="initials">${esc(initials(s.full_name))}</div>`;

  return `
  ${header()}
  <main>
    <section class="hero">
      <div class="wrap hero-grid">
        <div>
          <span class="eyebrow">● Available for new projects</span>
          <h1>Hi, I'm <span class="grad">${esc(s.full_name || "Your Name")}</span>.<br>${esc(s.role_title || "")}</h1>
          <p class="lead">${esc(s.tagline || "I design and build thoughtful digital products.")}</p>
          <div class="hero-cta">
            <a class="btn btn-primary" href="#/#work">View my work</a>
            <a class="btn btn-ghost" href="#/contact">Start a project →</a>
          </div>
        </div>
        <div class="avatar-card">${avatar}</div>
      </div>
    </section>

    <section id="about">
      <div class="wrap">
        <div class="section-head">
          <div class="kicker">About</div>
          <h2>A little about me</h2>
          <p>${esc(s.about || "Tell your story here — what you do, what you love, and how you work. You can edit this from the admin dashboard.")}</p>
        </div>
      </div>
    </section>

    <section id="work">
      <div class="wrap">
        <div class="section-head">
          <div class="kicker">Selected work</div>
          <h2>Projects</h2>
          <p>A selection of things I've designed and built. Click any project to see more.</p>
        </div>
        <div class="filters">
          ${allTags.map(t=>`<button class="chip ${state.filter===t?"active":""}" data-action="filter" data-tag="${esc(t)}">${esc(t)}</button>`).join("")}
        </div>
        <div class="grid">
          ${shown.length ? shown.map(projectCard).join("") : `<div class="empty">No projects yet. Check back soon.</div>`}
        </div>
      </div>
    </section>

    <section id="contact">
      <div class="wrap">
        <div class="section-head">
          <div class="kicker">Get in touch</div>
          <h2>Like a design? Let's talk.</h2>
          <p>Want something similar to a project you saw here? Send me a message, or reach me directly.</p>
        </div>
        <div class="contact-grid">
          <div class="contact-list">
            ${s.email ? contactItem("✉","Email","mailto:"+s.email, s.email) : ""}
            ${s.phone ? contactItem("☎","Phone","tel:"+s.phone.replace(/[^0-9+]/g,""), s.phone) : ""}
            ${s.whatsapp ? contactItem("💬","WhatsApp", waLink(s.whatsapp), "Chat on WhatsApp") : ""}
            ${socialLinks(s)}
          </div>
          <div class="panel">
            <div id="contactMsg"></div>
            <form data-form="contact">
              <div class="two-col">
                <div class="field"><label>Your name</label><input name="name" required placeholder="Jane Doe"></div>
                <div class="field"><label>Your email</label><input name="email" type="email" required placeholder="jane@email.com"></div>
              </div>
              <div class="field">
                <label>Which project / design are you interested in?</label>
                <input name="project_ref" placeholder="e.g. Aurora Analytics Dashboard" value="${esc(state.contactRef)}">
              </div>
              <div class="field"><label>Message</label><textarea name="message" required placeholder="Tell me what you'd like to build…"></textarea></div>
              <button class="btn btn-primary" type="submit">Send message</button>
            </form>
          </div>
        </div>
      </div>
    </section>
  </main>
  ${footer()}`;
}
function contactItem(icon,label,href,val){
  return `<a class="contact-item" href="${esc(href)}" target="${href.startsWith("http")?"_blank":"_self"}" rel="noopener">
    <span class="ci">${icon}</span><span><span class="cl">${esc(label)}</span><br><span class="cv">${esc(val)}</span></span></a>`;
}

/* ---------------- PROJECT DETAIL ---------------- */
function detailView(slug){
  const p = state.projects.find(x => x.slug === slug || x.id === slug);
  if(!p) return `${header()}<div class="wrap loading">Project not found. <a href="#/" style="color:var(--accent)">Go home</a></div>${footer()}`;
  const gallery = (p.gallery||[]).map(u=>`<img src="${esc(u)}" alt="" loading="lazy">`).join("");
  const cover = p.cover_image_url ? `<img src="${esc(p.cover_image_url)}" alt="${esc(p.title)}">` : "";
  const links = [];
  if(p.live_url) links.push(`<a class="btn btn-primary" href="${esc(p.live_url)}" target="_blank" rel="noopener">View live ↗</a>`);
  if(p.repo_url) links.push(`<a class="btn btn-ghost" href="${esc(p.repo_url)}" target="_blank" rel="noopener">Source code</a>`);
  return `
  ${header()}
  <main class="wrap">
    <div class="detail-hero">
      <a class="back-link" href="#/#work">← All projects</a>
      <h1 class="detail-title">${esc(p.title)}</h1>
      <div class="tags">${(p.tags||[]).map(t=>`<span class="tag">${esc(t)}</span>`).join("")}</div>
      <div class="detail-cover">${cover}</div>
      <div class="prose">${(p.description||p.summary||"").split(/\n+/).map(x=>`<p>${esc(x)}</p>`).join("")}</div>
      ${gallery?`<div class="gallery">${gallery}</div>`:""}
      <div class="hero-cta" style="margin:28px 0 10px">
        ${links.join("")}
        <button class="btn btn-ghost" data-action="enquire" data-ref="${esc(p.title)}">Want something like this? Contact me</button>
      </div>
    </div>
  </main>
  ${footer()}`;
}

/* ---------------- ADMIN ---------------- */
function adminView(){
  if(!state.session) return loginView();
  if(!state.isAdmin) return notAdminView();
  const s = state.settings || {};
  const unread = (state.pendingMessages||[]).filter(m=>!m.is_read).length;
  return `
  ${header()}
  <main class="wrap" style="padding:34px 0 60px">
    <div class="admin-head">
      <div>
        <div class="kicker">Dashboard</div>
        <h2 style="margin:0;font-size:1.6rem">Welcome back, ${esc((s.full_name||state.user.email).split(" ")[0])}</h2>
      </div>
      <div class="row-actions">
        <a class="btn btn-ghost btn-sm" href="#/">View site</a>
        <button class="btn btn-ghost btn-sm" data-action="logout">Log out</button>
      </div>
    </div>
    <div class="tabs">
      <button class="tab ${state.adminTab==="projects"?"active":""}" data-action="admin-tab" data-tab="projects">Projects</button>
      <button class="tab ${state.adminTab==="messages"?"active":""}" data-action="admin-tab" data-tab="messages">Messages ${unread?`(${unread})`:""}</button>
      <button class="tab ${state.adminTab==="settings"?"active":""}" data-action="admin-tab" data-tab="settings">Site settings</button>
    </div>
    ${flashBanner()}
    <div id="adminBody">${adminTabBody()}</div>
  </main>
  ${footer()}`;
}
function adminTabBody(){
  if(state.adminTab === "projects") return adminProjects();
  if(state.adminTab === "messages") return adminMessages();
  return adminSettings();
}
function adminProjects(){
  const rows = state.projects.map(p => `
    <div class="row-item">
      <div class="ri-thumb">${p.cover_image_url?`<img src="${esc(p.cover_image_url)}" alt="">`:""}</div>
      <div class="grow">
        <h4>${esc(p.title)} ${p.featured?`<span class="pill">★ Featured</span>`:""}</h4>
        <div class="sub">${esc(p.summary||"—")}</div>
      </div>
      <div class="row-actions">
        <button class="btn btn-ghost btn-sm" data-action="edit-project" data-id="${esc(p.id)}">Edit</button>
        <button class="btn btn-danger btn-sm" data-action="delete-project" data-id="${esc(p.id)}" data-title="${esc(p.title)}">Delete</button>
      </div>
    </div>`).join("");
  return `
    <div class="stat-row">
      <div class="stat"><div class="n">${state.projects.length}</div><div class="l">Projects</div></div>
      <div class="stat"><div class="n">${state.projects.filter(p=>p.featured).length}</div><div class="l">Featured</div></div>
    </div>
    <div style="margin-bottom:16px"><button class="btn btn-primary" data-action="new-project">+ Add project</button></div>
    ${rows || `<div class="empty">No projects yet — add your first one.</div>`}`;
}
function adminMessages(){
  const msgs = state.pendingMessages || [];
  const rows = msgs.map(m => `
    <div class="row-item" style="align-items:flex-start;flex-direction:column">
      <div style="display:flex;justify-content:space-between;width:100%;gap:12px;flex-wrap:wrap">
        <div>
          <h4 style="margin:0">${esc(m.name)} ${m.is_read?"":`<span class="pill unread">New</span>`}</h4>
          <div class="sub">${esc(m.email)} · ${fmtDate(m.created_at)}</div>
        </div>
        <div class="row-actions">
          <a class="btn btn-ghost btn-sm" href="mailto:${esc(m.email)}?subject=${encodeURIComponent("Re: your enquiry")}">Reply</a>
          <button class="btn btn-ghost btn-sm" data-action="toggle-read" data-id="${esc(m.id)}" data-read="${m.is_read}">${m.is_read?"Mark unread":"Mark read"}</button>
          <button class="btn btn-danger btn-sm" data-action="delete-message" data-id="${esc(m.id)}">Delete</button>
        </div>
      </div>
      ${m.project_ref?`<div class="pill" style="margin-top:8px">Re: ${esc(m.project_ref)}</div>`:""}
      <p style="margin:8px 0 0;color:var(--muted)">${esc(m.message)}</p>
    </div>`).join("");
  return `<div class="stat-row">
      <div class="stat"><div class="n">${msgs.length}</div><div class="l">Total messages</div></div>
      <div class="stat"><div class="n">${msgs.filter(m=>!m.is_read).length}</div><div class="l">Unread</div></div>
    </div>
    ${rows || `<div class="empty">No messages yet.</div>`}`;
}
function adminSettings(){
  const s = state.settings || {};
  const f = (name,label,type="text",ph="") =>
    `<div class="field"><label>${label}</label><input name="${name}" type="${type}" value="${esc(s[name]||"")}" placeholder="${esc(ph)}"></div>`;
  return `
  <div class="panel">
    <div id="settingsMsg"></div>
    <form data-form="settings">
      <div class="two-col">
        ${f("full_name","Your name")}
        ${f("role_title","Role / title")}
      </div>
      ${f("tagline","Tagline (hero line)")}
      <div class="field"><label>About text</label><textarea name="about">${esc(s.about||"")}</textarea></div>
      <div class="two-col">
        ${f("email","Email","email")}
        ${f("phone","Phone")}
        ${f("whatsapp","WhatsApp number (digits, incl. country code)","text","919876543210")}
        ${f("avatar_url","Profile photo URL")}
      </div>
      <div class="two-col">
        ${f("github_url","GitHub URL")}
        ${f("linkedin_url","LinkedIn URL")}
        ${f("instagram_url","Instagram URL")}
        ${f("twitter_url","Twitter / X URL")}
      </div>
      ${f("resume_url","Résumé / CV URL")}
      <button class="btn btn-primary" type="submit">Save settings</button>
    </form>
  </div>`;
}
function loginView(){
  const signup = state.loginMode === "signup";
  return `
  ${header()}
  <main class="wrap login-wrap">
    <div class="panel">
      <div class="kicker">Admin</div>
      <h2 style="margin:0 0 6px;font-size:1.5rem">${signup?"Create admin account":"Sign in"}</h2>
      <p class="note" style="margin:0 0 20px">${signup?"Use the email you want as your admin login.":"Only the admin can add or edit projects."}</p>
      ${flashBanner()}
      <div id="loginMsg"></div>
      <form data-form="login">
        <div class="field"><label>Email</label><input name="email" type="email" required autocomplete="username"></div>
        <div class="field"><label>Password</label><input name="password" type="password" required minlength="6" autocomplete="${signup?"new-password":"current-password"}"></div>
        <button class="btn btn-primary" type="submit" style="width:100%">${signup?"Create account":"Sign in"}</button>
      </form>
      <p class="note" style="margin-top:16px;text-align:center">
        ${signup?`Already have an account? <a href="#" data-action="login-mode" data-mode="signin" style="color:var(--accent)">Sign in</a>`
                :`First time? <a href="#" data-action="login-mode" data-mode="signup" style="color:var(--accent)">Create your admin account</a>`}
      </p>
    </div>
  </main>
  ${footer()}`;
}
function notAdminView(){
  return `
  ${header()}
  <main class="wrap login-wrap">
    <div class="panel" style="text-align:center">
      <h2 style="margin:0 0 8px;font-size:1.4rem">Not an admin</h2>
      <p class="note">You're signed in as <b>${esc(state.user.email)}</b>, but this account isn't on the admin list, so it can't add or edit projects.</p>
      <button class="btn btn-ghost" data-action="logout" style="margin-top:12px">Log out</button>
    </div>
  </main>
  ${footer()}`;
}

/* ---------------- project modal ---------------- */
function openProjectModal(project){
  const p = project || {};
  const root = document.getElementById("modal-root") || (() => {
    const d = document.createElement("div"); d.id = "modal-root"; document.body.appendChild(d); return d;
  })();
  root.innerHTML = `
  <div class="modal-back" data-action="close-modal-bg">
    <div class="modal" onclick="event.stopPropagation()">
      <h3>${project?"Edit project":"Add project"}</h3>
      <div id="projMsg"></div>
      <form data-form="project" data-id="${esc(p.id||"")}">
        <div class="two-col">
          <div class="field"><label>Title *</label><input name="title" required value="${esc(p.title||"")}"></div>
          <div class="field"><label>Slug (URL)</label><input name="slug" value="${esc(p.slug||"")}" placeholder="auto from title"></div>
        </div>
        <div class="field"><label>Short summary</label><input name="summary" value="${esc(p.summary||"")}" placeholder="One line shown on the card"></div>
        <div class="field"><label>Full description</label><textarea name="description">${esc(p.description||"")}</textarea></div>
        <div class="field"><label>Cover image URL</label><input name="cover_image_url" value="${esc(p.cover_image_url||"")}" placeholder="https://…"></div>
        <div class="field"><label>Gallery image URLs (one per line)</label><textarea name="gallery" placeholder="https://…\nhttps://…">${esc((p.gallery||[]).join("\n"))}</textarea></div>
        <div class="field"><label>Tags (comma separated)</label><input name="tags" value="${esc((p.tags||[]).join(", "))}" placeholder="Web App, UI/UX"></div>
        <div class="two-col">
          <div class="field"><label>Live URL</label><input name="live_url" value="${esc(p.live_url||"")}"></div>
          <div class="field"><label>Source / repo URL</label><input name="repo_url" value="${esc(p.repo_url||"")}"></div>
        </div>
        <div class="two-col">
          <div class="field"><label>Sort order</label><input name="sort_order" type="number" value="${esc(p.sort_order!=null?p.sort_order:0)}"></div>
          <div class="check" style="margin-top:26px"><input type="checkbox" name="featured" id="feat" ${p.featured?"checked":""}><label for="feat" style="margin:0">Feature on home</label></div>
        </div>
        <div class="modal-actions">
          <button type="button" class="btn btn-ghost" data-action="close-modal">Cancel</button>
          <button type="submit" class="btn btn-primary">${project?"Save changes":"Add project"}</button>
        </div>
      </form>
    </div>
  </div>`;
}
function closeModal(){
  const r = document.getElementById("modal-root");
  if(r) r.innerHTML = "";
}
function flashBanner(){
  if(!state.flash) return "";
  return `<div class="alert ${state.flash.type||"ok"}">${esc(state.flash.text)}</div>`;
}
function msg(elId, text, type){
  const el = document.getElementById(elId);
  if(el) el.innerHTML = `<div class="alert ${type}">${esc(text)}</div>`;
}

/* ---------------- router ---------------- */
async function render(){
  const hash = location.hash || "#/";
  let html = "";
  if(hash.startsWith("#/p/")){
    html = detailView(decodeURIComponent(hash.slice(4)));
  } else if(hash.startsWith("#/admin")){
    if(state.session){ await ensureSession(); await checkAdmin(); await loadMessages(); }
    html = adminView();
  } else if(hash.startsWith("#/contact")){
    html = homeView();
  } else {
    html = homeView();
  }
  app.innerHTML = html;
  state.flash = null;
  document.title = (state.settings && state.settings.full_name ? state.settings.full_name + " — Portfolio" : "Portfolio");
  const sec = hash.match(/^#\/#(.+)$/);
  if(hash === "#/contact"){ setTimeout(()=>document.getElementById("contact")?.scrollIntoView({behavior:"smooth"}), 80); }
  else if(sec){ setTimeout(()=>document.getElementById(sec[1])?.scrollIntoView({behavior:"smooth"}), 80); }
}

async function loadMessages(){
  if(!state.isAdmin) return;
  try{
    state.pendingMessages = await api("/messages?select=*&order=created_at.desc") || [];
  }catch(e){ state.pendingMessages = []; }
}

/* ---------------- events (delegation) ---------------- */
app.addEventListener("click", async (e) => {
  const el = e.target.closest("[data-action]");
  if(!el) return;
  const a = el.dataset.action;

  if(a === "toggle-theme"){ toggleTheme(); return; }
  if(a === "toggle-menu"){ document.getElementById("navLinks")?.classList.toggle("open"); return; }
  if(a === "open-project"){ location.hash = "#/p/" + encodeURIComponent(el.dataset.slug); return; }
  if(a === "filter"){ state.filter = el.dataset.tag; render(); return; }
  if(a === "enquire"){ state.contactRef = el.dataset.ref || ""; location.hash = "#/contact"; render(); return; }
  if(a === "admin-tab"){
    state.adminTab = el.dataset.tab;
    if(state.adminTab === "messages") await loadMessages();
    render(); return;
  }
  if(a === "new-project"){ openProjectModal(null); return; }
  if(a === "edit-project"){
    const p = state.projects.find(x => x.id === el.dataset.id);
    openProjectModal(p); return;
  }
  if(a === "delete-project"){
    if(!confirm("Delete project \"" + el.dataset.title + "\"? This can't be undone.")) return;
    try{
      await ensureSession();
      await api("/projects?id=eq." + el.dataset.id, { method:"DELETE" });
      await loadProjects(); render();
    }catch(err){ alert("Could not delete: " + err.message); }
    return;
  }
  if(a === "toggle-read"){
    try{
      await ensureSession();
      const read = el.dataset.read === "true";
      await api("/messages?id=eq." + el.dataset.id, { method:"PATCH", body:{ is_read: !read } });
      await loadMessages(); render();
    }catch(err){ alert("Could not update: " + err.message); }
    return;
  }
  if(a === "delete-message"){
    if(!confirm("Delete this message?")) return;
    try{
      await ensureSession();
      await api("/messages?id=eq." + el.dataset.id, { method:"DELETE" });
      await loadMessages(); render();
    }catch(err){ alert("Could not delete: " + err.message); }
    return;
  }
  if(a === "logout"){ await signOut(); location.hash = "#/"; render(); return; }
  if(a === "login-mode"){ e.preventDefault(); state.loginMode = el.dataset.mode; render(); return; }
  if(a === "close-modal" || a === "close-modal-bg"){
    if(a === "close-modal-bg" && e.target !== el) return;
    closeModal(); return;
  }
});

app.addEventListener("submit", async (e) => {
  const form = e.target.closest("form[data-form]");
  if(!form) return;
  e.preventDefault();
  const kind = form.dataset.form;
  const fd = new FormData(form);

  if(kind === "contact"){
    const body = {
      name: (fd.get("name")||"").trim(),
      email: (fd.get("email")||"").trim(),
      message: (fd.get("message")||"").trim(),
      project_ref: (fd.get("project_ref")||"").trim(),
    };
    if(!body.name || !body.email || !body.message){ msg("contactMsg","Please fill in all required fields.","err"); return; }
    try{
      await api("/messages", { method:"POST", body, prefer:"return=minimal" });
      form.reset(); state.contactRef = "";
      msg("contactMsg","Thanks! Your message has been sent. I'll get back to you soon.","ok");
    }catch(err){ msg("contactMsg","Sorry, something went wrong: " + err.message, "err"); }
    return;
  }

  if(kind === "login"){
    const email = (fd.get("email")||"").trim();
    const password = fd.get("password")||"";
    try{
      if(state.loginMode === "signup"){
        const d = await signUp(email, password);
        if(!d.access_token){
          state.flash = { text:"Account created. Please check your email to confirm it, then sign in.", type:"ok" };
          state.loginMode = "signin";
          render();
          return;
        }
      } else {
        await signIn(email, password);
      }
      await checkAdmin(); await loadSettings(); await loadProjects();
      state.adminTab = "projects";
      msg("loginMsg","Signed in.","ok");
      render();
    }catch(err){ msg("loginMsg", err.message, "err"); }
    return;
  }

  if(kind === "project"){
    const id = form.dataset.id;
    const body = {
      title: (fd.get("title")||"").trim(),
      slug: slugify(fd.get("slug") || fd.get("title")),
      summary: (fd.get("summary")||"").trim(),
      description: (fd.get("description")||"").trim(),
      cover_image_url: (fd.get("cover_image_url")||"").trim(),
      gallery: parseList(fd.get("gallery")),
      tags: parseList(fd.get("tags")),
      live_url: (fd.get("live_url")||"").trim(),
      repo_url: (fd.get("repo_url")||"").trim(),
      featured: !!fd.get("featured"),
      sort_order: parseInt(fd.get("sort_order")||"0",10) || 0,
      updated_at: new Date().toISOString(),
    };
    if(!body.title){ msg("projMsg","Title is required.","err"); return; }
    try{
      await ensureSession();
      if(id){
        await api("/projects?id=eq." + id, { method:"PATCH", body, prefer:"return=representation" });
      } else {
        try{
          await api("/projects", { method:"POST", body, prefer:"return=representation" });
        }catch(err){
          if(/duplicate|unique/i.test(err.message)){ body.slug = body.slug + "-" + Date.now().toString(36); await api("/projects", { method:"POST", body, prefer:"return=representation" }); }
          else throw err;
        }
      }
      closeModal();
      await loadProjects(); render();
    }catch(err){ msg("projMsg", "Could not save: " + err.message, "err"); }
    return;
  }

  if(kind === "settings"){
    const body = {};
    ["full_name","role_title","tagline","about","email","phone","whatsapp","avatar_url","github_url","linkedin_url","instagram_url","twitter_url","resume_url"]
      .forEach(k => body[k] = (fd.get(k)||"").trim());
    body.updated_at = new Date().toISOString();
    try{
      await ensureSession();
      await api("/site_settings?id=eq.1", { method:"PATCH", body, prefer:"return=representation" });
      await loadSettings();
      state.flash = { text:"Settings saved.", type:"ok" };
      render();
    }catch(err){ msg("settingsMsg","Could not save: " + err.message, "err"); }
    return;
  }
});

window.addEventListener("hashchange", render);

/* ---------------- boot ---------------- */
(async function boot(){
  applyTheme();
  loadSessionFromStorage();
  await Promise.all([loadSettings(), loadProjects()]);
  if(state.session){ await ensureSession(); if(state.session && state.session.access_token){ await checkAdmin(); } }
  state.loaded = true;
  render();
})();
