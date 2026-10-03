/* =========================================================
   Zorvaya Technology  - portfolio site
   vanilla JS + Supabase (REST + Auth)
   Public site + admin dashboard (admin-only writes via RLS)
   No emoji anywhere: all icons are inline SVG.
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
  adminTab: "overview",
  loginMode: "signin",
  contactRef: "",
  pendingMessages: [],
  ratings: [],
  ratingPick: 0,
  ratingJustSubmitted: false,
  loaded: false,
  flash: null,
};

const app = document.getElementById("app");

/* ---------------- icons (inline SVG, no emoji) ---------------- */
const ICONS = {
  mail: '<rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="m4 7.5 8 5.5 8-5.5"/>',
  phone: '<path d="M6 3.5h3l1.4 3.7-2 1.4a12 12 0 0 0 6 6l1.4-2 3.7 1.4v3a1.9 1.9 0 0 1-2 1.9A16 16 0 0 1 4.1 5.5 1.9 1.9 0 0 1 6 3.5z"/>',
  whatsapp: '<path d="M12 3.5a8.5 8.5 0 0 0-7.3 12.8L3.5 20.5l4.3-1.1A8.5 8.5 0 1 0 12 3.5z"/><path d="M8.7 8.3c0 3.7 2.8 6.5 6.5 6.5.8 0 1.3-.8 1.3-1.3l-1.8-.9-.9.9a4.6 4.6 0 0 1-2.2-2.2l.9-.9-.9-1.8c-.5 0-1.3.5-1.3 1.3z"/>',
  github: '<path d="M9 19.5c-4 1.4-4-2.4-6-3m12 5v-3.4c0-.9.1-1.3-.5-1.9 2.2-.3 4.4-1.1 4.4-4.9A3.8 3.8 0 0 0 18 7.4 3.6 3.6 0 0 0 17.9 4s-1.1-.3-3.4 1.3a11.7 11.7 0 0 0-6 0C6.2 3.7 5.1 4 5.1 4a3.6 3.6 0 0 0-.1 3.4A3.8 3.8 0 0 0 3.6 9.9c0 3.8 2.2 4.6 4.4 4.9-.6.6-.6 1.2-.5 1.9V21"/>',
  linkedin: '<rect x="3" y="3" width="18" height="18" rx="3"/><path d="M8 11v6M8 7.9v.01M12 17v-3.4a2 2 0 0 1 4 0V17"/>',
  instagram: '<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="3.8"/><path d="M17.4 6.6v.01"/>',
  twitter: '<path d="M4 4.5l6.8 8.2L4.5 19.5h2.2l5.1-5.7 4.6 5.7H20l-7-8.6L19.3 4.5h-2.2l-4.6 5.1L8.2 4.5z"/>',
  external: '<path d="M14 4h6v6"/><path d="M20 4 11 13"/><path d="M19 13.5V18a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h4.5"/>',
  arrowLeft: '<path d="M19 12H5"/><path d="m11 18-6-6 6-6"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.2 5.2l1.4 1.4M17.4 17.4l1.4 1.4M18.8 5.2l-1.4 1.4M6.6 17.4 5.2 18.8"/>',
  moon: '<path d="M20.5 13.5A8.5 8.5 0 0 1 10.5 3.5a7 7 0 1 0 10 10z"/>',
  menu: '<path d="M3.5 7h17M3.5 12h17M3.5 17h17"/>',
  plus: '<path d="M12 5.5v13M5.5 12h13"/>',
  check: '<path d="m4 12.5 5 5L20 6.5"/>',
  grid: '<rect x="3" y="3" width="7.5" height="7.5" rx="2"/><rect x="13.5" y="3" width="7.5" height="7.5" rx="2"/><rect x="3" y="13.5" width="7.5" height="7.5" rx="2"/><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="2"/>',
  layers: '<path d="m12 3 9 5-9 5-9-5 9-5z"/><path d="m3 13 9 5 9-5"/>',
  gear: '<circle cx="12" cy="12" r="3.2"/><path d="M12 2.5v2.2M12 19.3v2.2M4.9 4.9l1.6 1.6M17.5 17.5l1.6 1.6M2.5 12h2.2M19.3 12h2.2M4.9 19.1l1.6-1.6M17.5 6.5l1.6-1.6"/>',
  star: '<path d="M12 2.6l2.9 5.9 6.5.9-4.7 4.6 1.1 6.5L12 17.4l-5.8 3.1 1.1-6.5-4.7-4.6 6.5-.9z"/>',
};
function icon(name, cls){
  return `<svg class="${cls||"ico"}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name]||""}</svg>`;
}

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
  if(!p.length) return "ZT";
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
async function loadMessages(){
  if(!state.isAdmin) return;
  try{
    state.pendingMessages = await api("/messages?select=*&order=created_at.desc") || [];
  }catch(e){ state.pendingMessages = []; }
}
async function loadRatings(){
  try{
    state.ratings = await api("/ratings?select=id,stars,comment,created_at&order=created_at.desc") || [];
  }catch(e){ state.ratings = []; }
}
function ratingStats(){
  const r = state.ratings || [];
  if(!r.length) return { avg:0, count:0 };
  const sum = r.reduce((a,x)=>a + (x.stars||0), 0);
  return { avg: sum / r.length, count: r.length };
}
const STAR_PATH = "M12 2.6l2.9 5.9 6.5.9-4.7 4.6 1.1 6.5L12 17.4l-5.8 3.1 1.1-6.5-4.7-4.6 6.5-.9z";
function starSvg(extra){
  return `<svg class="star ${extra||""}" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="${STAR_PATH}"/></svg>`;
}
function starsRow(v){
  let o = "";
  for(let i=1;i<=5;i++){ o += starSvg(i<=v ? "on" : ""); }
  return o;
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
  const b = document.querySelector('[data-action="toggle-theme"]');
  if(b) b.innerHTML = icon(next === "dark" ? "sun" : "moon");
}

/* ---------------- shared chrome ---------------- */
function header(){
  const s = state.settings || {};
  const dark = document.documentElement.getAttribute("data-theme") === "dark";
  return `
  <header class="site-header">
    <div class="wrap nav">
      <a class="brand" href="#/"><img class="brand-logo" src="./logo.png" alt=""><span>${esc(s.full_name || "Zorvaya Technology")}</span></a>
      <nav class="nav-links" id="navLinks">
        <a href="#/">Home</a>
        <a href="#/#about">About</a>
        <a href="#/#work">Work</a>
        <a href="#/contact">Contact</a>
      </nav>
      <div class="nav-actions">
        <button class="icon-btn" data-action="toggle-theme" title="Switch theme" aria-label="Switch theme">${icon(dark?"sun":"moon")}</button>
        <button class="icon-btn menu-toggle" data-action="toggle-menu" aria-label="Menu">${icon("menu")}</button>
      </div>
    </div>
  </header>`;
}
function footer(){
  const s = state.settings || {};
  return `
  <footer>
    <div class="wrap foot">
      <div><span class="fbrand">${esc(s.full_name || "Zorvaya Technology")}</span> &copy; ${new Date().getFullYear()}. All rights reserved.</div>
      <div><a href="#/admin" style="color:var(--muted)">Admin</a></div>
    </div>
  </footer>`;
}
function socialLinks(s){
  const items = [
    ["GitHub", s.github_url, "github"],
    ["LinkedIn", s.linkedin_url, "linkedin"],
    ["Instagram", s.instagram_url, "instagram"],
    ["Twitter / X", s.twitter_url, "twitter"],
  ].filter(x => x[1]);
  if(!items.length) return "";
  return `<div class="socials">` + items.map(([n,u,ic]) =>
    `<a class="chip" href="${esc(u)}" target="_blank" rel="noopener">${icon(ic)}${n}</a>`).join("") + `</div>`;
}

/* ---------------- HOME ---------------- */
function projectCard(p){
  const tags = (p.tags||[]).slice(0,4).map(t=>`<span class="tag">${esc(t)}</span>`).join("");
  const thumb = p.cover_image_url
    ? `<img src="${esc(p.cover_image_url)}" alt="${esc(p.title)}" loading="lazy">`
    : `<div class="ph">${esc(p.title)}</div>`;
  return `
  <article class="card${p.featured?" big":""}" data-action="open-project" data-slug="${esc(p.slug||p.id)}">
    <div class="thumb">${thumb}${p.featured?`<span class="badge">Featured</span>`:""}</div>
    <div class="card-body">
      <h3>${esc(p.title)}</h3>
      <p>${esc(p.summary||"")}</p>
      <div class="tags">${tags}</div>
    </div>
  </article>`;
}
function marquee(){
  const words = ["Web design","Branding","Product","Motion","Development","UI / UX"];
  const star = `<svg class="mstar" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2c.6 4.8 2.6 6.8 7.4 7.4-4.8.6-6.8 2.6-7.4 7.4-.6-4.8-2.6-6.8-7.4-7.4C9.4 8.8 11.4 6.8 12 2z"/></svg>`;
  const seq = words.map(w=>`<span>${w}</span>${star}`).join("");
  return `<div class="marquee" aria-hidden="true"><div class="marquee-track">${seq}${seq}</div></div>`;
}
function rateSection(){
  const { avg, count } = ratingStats();
  const rounded = Math.round(avg);
  const recent = (state.ratings||[]).filter(r => r.comment && r.comment.trim()).slice(0,3);
  const pick = state.ratingPick || 0;
  const picker = `<div class="rate-pick" id="ratePick">` +
    [1,2,3,4,5].map(i => `<button type="button" class="star-btn ${i<=pick?"on":""}" data-action="rate" data-value="${i}" aria-label="Rate ${i} out of 5">${starSvg()}</button>`).join("") +
    `</div>`;
  return `
  <section id="rate">
    <div class="wrap">
      <div class="section-head">
        <div class="kicker">Feedback</div>
        <h2>Rate this website</h2>
        <p>How did we do? Your rating helps us make it better.</p>
      </div>
      <div class="rate-grid${recent.length?"":" solo"}">
        <div class="panel">
          <div class="rate-avg">
            <div class="rate-big">${count ? avg.toFixed(1) : "-"}</div>
            <div>
              <div class="stars-static">${starsRow(rounded)}</div>
              <div class="note">${count ? count + (count===1?" rating":" ratings") + " so far" : "No ratings yet. Be the first."}</div>
            </div>
          </div>
          ${state.ratingJustSubmitted
            ? `<div class="alert ok">Thanks for rating. We appreciate it.</div>`
            : `<form data-form="rating">
                <input type="hidden" name="stars" id="rateStars" value="${pick}">
                ${picker}
                <div class="field"><label>Add a short comment (optional)</label><textarea name="comment" placeholder="What did you think?"></textarea></div>
                <div id="rateMsg"></div>
                <button class="btn btn-primary" type="submit">Submit rating</button>
              </form>`}
        </div>
        ${recent.length ? `<div class="rate-recent">${recent.map(r=>`
          <div class="quote">
            <div class="stars-static">${starsRow(r.stars)}</div>
            <p>${esc(r.comment)}</p>
          </div>`).join("")}</div>` : ""}
      </div>
    </div>
  </section>`;
}
function homeView(){
  const s = state.settings || {};
  const allTags = ["All"];
  state.projects.forEach(p => (p.tags||[]).forEach(t => { if(!allTags.includes(t)) allTags.push(t); }));
  const shown = state.filter === "All" ? state.projects
    : state.projects.filter(p => (p.tags||[]).includes(state.filter));

  const avatar = `<img src="${esc(s.avatar_url || "logo.png")}" alt="${esc(s.full_name||"Zorvaya Technology")}">`;

  return `
  ${header()}
  <main>
    <section class="hero">
      <div class="wrap hero-grid">
        <div>
          <div class="stickers">
            <span class="sticker">Open for new projects</span>
            <span class="sticker lime">Design + Code</span>
          </div>
          <h1 class="display"><span class="grad">${esc(s.full_name || "Zorvaya Technology")}</span></h1>
          <p class="role">${esc(s.role_title || "")}</p>
          <p class="lead">${esc(s.tagline || "We design and build digital products for the web.")}</p>
          <div class="hero-cta">
            <a class="btn btn-primary" href="#/#work">See the work</a>
            <a class="btn btn-ghost" href="#/contact">Start a project</a>
          </div>
        </div>
        <div class="avatar-card"><div class="ring"></div>${avatar}</div>
      </div>
    </section>
    ${marquee()}

    <section id="about">
      <div class="wrap">
        <div class="section-head">
          <div class="kicker">About</div>
          <h2>About us</h2>
          <p>${esc(s.about || "Tell your story here: what you build, who you build it for, and how you work. You can edit this from the admin dashboard.")}</p>
        </div>
      </div>
    </section>

    <section id="work">
      <div class="wrap">
        <div class="section-head">
          <div class="kicker">Selected work</div>
          <h2>Projects</h2>
          <p>A selection of work we have designed and built. Open any project to see the details.</p>
        </div>
        <div class="filters">
          ${allTags.map(t=>`<button class="chip ${state.filter===t?"active":""}" data-action="filter" data-tag="${esc(t)}">${esc(t)}</button>`).join("")}
        </div>
        <div class="grid">
          ${shown.length ? shown.map(projectCard).join("") : `<div class="empty">No projects yet. Check back soon.</div>`}
        </div>
      </div>
    </section>

    ${rateSection()}

    <section id="contact">
      <div class="wrap">
        <div class="section-head">
          <div class="kicker">Get in touch</div>
          <h2>Like what you see? Let's talk.</h2>
          <p>Want something similar to a project here? Send us a message, or reach us directly.</p>
        </div>
        <div class="contact-grid">
          <div class="contact-list">
            ${s.email ? contactItem("mail","Email","mailto:"+s.email, s.email) : ""}
            ${s.phone ? contactItem("phone","Phone","tel:"+s.phone.replace(/[^0-9+]/g,""), s.phone) : ""}
            ${s.whatsapp ? contactItem("whatsapp","WhatsApp", waLink(s.whatsapp), "Chat on WhatsApp") : ""}
            ${socialLinks(s)}
          </div>
          <div class="panel">
            <div id="contactMsg"></div>
            <form data-form="contact">
              <div class="two-col">
                <div class="field"><label>Your name</label><input name="name" required placeholder="Your full name"></div>
                <div class="field"><label>Your email</label><input name="email" type="email" required placeholder="you@email.com"></div>
              </div>
              <div class="field">
                <label>Which project or design are you interested in?</label>
                <input name="project_ref" placeholder="e.g. Aurora Analytics Dashboard" value="${esc(state.contactRef)}">
              </div>
              <div class="field"><label>Message</label><textarea name="message" required placeholder="Tell us what you would like to build."></textarea></div>
              <button class="btn btn-primary" type="submit">Send message</button>
            </form>
          </div>
        </div>
      </div>
    </section>
  </main>
  ${footer()}`;
}
function contactItem(ic,label,href,val){
  return `<a class="contact-item" href="${esc(href)}" target="${href.startsWith("http")?"_blank":"_self"}" rel="noopener">
    <span class="ci">${icon(ic)}</span><span><span class="cl">${esc(label)}</span><br><span class="cv">${esc(val)}</span></span></a>`;
}

/* ---------------- PROJECT DETAIL ---------------- */
function detailView(slug){
  const p = state.projects.find(x => x.slug === slug || x.id === slug);
  if(!p) return `${header()}<div class="wrap loading">Project not found. <a href="#/" style="color:var(--accent)">Go home</a></div>${footer()}`;
  const gallery = (p.gallery||[]).map(u=>`<img src="${esc(u)}" alt="" loading="lazy">`).join("");
  const cover = p.cover_image_url ? `<img src="${esc(p.cover_image_url)}" alt="${esc(p.title)}">` : "";
  const links = [];
  if(p.live_url) links.push(`<a class="btn btn-primary" href="${esc(p.live_url)}" target="_blank" rel="noopener">View live ${icon("external")}</a>`);
  if(p.repo_url) links.push(`<a class="btn btn-ghost" href="${esc(p.repo_url)}" target="_blank" rel="noopener">Source code</a>`);
  return `
  ${header()}
  <main class="wrap">
    <div class="detail-hero">
      <a class="back-link" href="#/#work">${icon("arrowLeft")} All projects</a>
      <h1 class="detail-title">${esc(p.title)}</h1>
      <div class="tags">${(p.tags||[]).map(t=>`<span class="tag">${esc(t)}</span>`).join("")}</div>
      <div class="detail-cover">${cover}</div>
      <div class="prose">${(p.description||p.summary||"").split(/\n+/).map(x=>`<p>${esc(x)}</p>`).join("")}</div>
      ${gallery?`<div class="gallery">${gallery}</div>`:""}
      <div class="hero-cta" style="margin:28px 0 10px">
        ${links.join("")}
        <button class="btn btn-ghost" data-action="enquire" data-ref="${esc(p.title)}">Want something like this? Contact us</button>
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
  const nav = [
    ["overview","Overview","grid",0],
    ["projects","Projects","layers",state.projects.length],
    ["messages","Messages","mail",unread],
    ["ratings","Ratings","star",(state.ratings||[]).length],
    ["settings","Settings","gear",0],
  ];
  const meta = {
    overview:["Overview","A quick look at everything on your site."],
    projects:["Projects","Add, edit or remove the work shown on your site."],
    messages:["Messages","Enquiries sent through the contact form."],
    ratings:["Ratings","How visitors rated the site."],
    settings:["Site settings","Your name, contact details and links."],
  }[state.adminTab] || ["Overview",""];
  return `
  ${header()}
  <main class="wrap admin-wrap">
    <div class="admin-shell">
      <aside class="admin-side">
        <div class="admin-side-brand">
          <img src="./logo.png" alt="">
          <div>
            <div class="asb-name">${esc(s.full_name || "Zorvaya Technology")}</div>
            <div class="asb-sub">Admin dashboard</div>
          </div>
        </div>
        <nav class="admin-nav">
          ${nav.map(([id,label,ic,count])=>`
            <button class="anav ${state.adminTab===id?"active":""}" data-action="admin-tab" data-tab="${id}">
              ${icon(ic)}<span>${label}</span>${count?`<span class="anav-count">${count}</span>`:""}
            </button>`).join("")}
        </nav>
        <div class="admin-side-foot">
          <a class="btn btn-ghost btn-sm" href="#/">View site</a>
          <button class="btn btn-ghost btn-sm" data-action="logout">Log out</button>
        </div>
      </aside>
      <section class="admin-main">
        <div class="admin-main-head">
          <div class="kicker">Dashboard</div>
          <h1>${esc(meta[0])}</h1>
          <p class="note">${esc(meta[1])}</p>
        </div>
        ${flashBanner()}
        <div id="adminBody">${adminTabBody()}</div>
      </section>
    </div>
  </main>
  ${footer()}`;
}
function adminTabBody(){
  if(state.adminTab === "projects") return adminProjects();
  if(state.adminTab === "messages") return adminMessages();
  if(state.adminTab === "ratings") return adminRatings();
  if(state.adminTab === "settings") return adminSettings();
  return adminOverview();
}
function adminOverview(){
  const { avg, count } = ratingStats();
  const msgs = state.pendingMessages || [];
  const unread = msgs.filter(m=>!m.is_read).length;
  const featured = state.projects.filter(p=>p.featured).length;
  const recentMsgs = msgs.slice(0,3);
  const recentRatings = (state.ratings||[]).slice(0,3);
  return `
    <div class="stat-row">
      <div class="stat"><div class="n">${state.projects.length}</div><div class="l">Projects</div></div>
      <div class="stat"><div class="n">${featured}</div><div class="l">Featured</div></div>
      <div class="stat"><div class="n">${msgs.length}</div><div class="l">Messages</div></div>
      <div class="stat"><div class="n">${unread}</div><div class="l">Unread</div></div>
      <div class="stat"><div class="n">${count ? avg.toFixed(1) : "-"}</div><div class="l">Avg rating</div></div>
      <div class="stat"><div class="n">${count}</div><div class="l">Ratings</div></div>
    </div>
    <div class="admin-cols">
      <div class="panel">
        <h3 class="panel-title">Quick actions</h3>
        <div class="quick">
          <button class="btn btn-primary" data-action="new-project">${icon("plus")} Add new project</button>
          <button class="btn btn-ghost" data-action="admin-tab" data-tab="messages">${icon("mail")} Read messages</button>
          <button class="btn btn-ghost" data-action="admin-tab" data-tab="ratings">${icon("star")} View ratings</button>
          <button class="btn btn-ghost" data-action="admin-tab" data-tab="settings">${icon("gear")} Site settings</button>
        </div>
      </div>
      <div class="panel">
        <h3 class="panel-title">Recent messages</h3>
        ${recentMsgs.length ? recentMsgs.map(m=>`
          <div class="mini">
            <div class="mini-top"><b>${esc(m.name)}</b><span class="sub">${fmtDate(m.created_at)}</span></div>
            <div class="mini-sub">${esc(m.email)}</div>
          </div>`).join("") : `<p class="note">No messages yet.</p>`}
      </div>
      <div class="panel">
        <h3 class="panel-title">Recent ratings</h3>
        ${recentRatings.length ? recentRatings.map(r=>`
          <div class="mini">
            <div class="mini-top"><span class="stars-static">${starsRow(r.stars)}</span><span class="sub">${fmtDate(r.created_at)}</span></div>
            ${r.comment?`<div class="mini-sub">${esc(r.comment)}</div>`:""}
          </div>`).join("") : `<p class="note">No ratings yet.</p>`}
      </div>
    </div>`;
}
function adminProjects(){
  const rows = state.projects.map(p => `
    <div class="row-item">
      <div class="ri-thumb">${p.cover_image_url?`<img src="${esc(p.cover_image_url)}" alt="">`:""}</div>
      <div class="grow">
        <h4>${esc(p.title)} ${p.featured?`<span class="pill">Featured</span>`:""}</h4>
        <div class="sub">${esc(p.summary||"-")}</div>
      </div>
      <div class="row-actions">
        <button class="btn btn-ghost btn-sm" data-action="edit-project" data-id="${esc(p.id)}">Edit</button>
        <button class="btn btn-danger btn-sm" data-action="delete-project" data-id="${esc(p.id)}" data-title="${esc(p.title)}">Remove</button>
      </div>
    </div>`).join("");
  return `
    <div class="stat-row">
      <div class="stat"><div class="n">${state.projects.length}</div><div class="l">Projects</div></div>
      <div class="stat"><div class="n">${state.projects.filter(p=>p.featured).length}</div><div class="l">Featured</div></div>
    </div>
    <div style="margin-bottom:18px"><button class="btn btn-primary" data-action="new-project">${icon("plus")} Add new project</button></div>
    ${rows || `<div class="empty">No projects yet. Add your first one.</div>`}`;
}
function adminMessages(){
  const msgs = state.pendingMessages || [];
  const rows = msgs.map(m => `
    <div class="row-item" style="align-items:flex-start;flex-direction:column">
      <div style="display:flex;justify-content:space-between;width:100%;gap:12px;flex-wrap:wrap">
        <div>
          <h4 style="margin:0">${esc(m.name)} ${m.is_read?"":`<span class="pill unread">New</span>`}</h4>
          <div class="sub">${esc(m.email)} &middot; ${fmtDate(m.created_at)}</div>
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
function adminRatings(){
  const { avg, count } = ratingStats();
  const rows = (state.ratings||[]).map(r => `
    <div class="row-item" style="align-items:flex-start;flex-direction:column">
      <div style="display:flex;justify-content:space-between;width:100%;gap:12px;flex-wrap:wrap">
        <div>
          <div class="stars-static">${starsRow(r.stars)}</div>
          <div class="sub">${fmtDate(r.created_at)}</div>
        </div>
        <div class="row-actions">
          <button class="btn btn-danger btn-sm" data-action="delete-rating" data-id="${esc(r.id)}">Delete</button>
        </div>
      </div>
      ${r.comment ? `<p style="margin:8px 0 0;color:var(--muted)">${esc(r.comment)}</p>` : ""}
    </div>`).join("");
  return `<div class="stat-row">
      <div class="stat"><div class="n">${count ? avg.toFixed(1) : "-"}</div><div class="l">Average rating</div></div>
      <div class="stat"><div class="n">${count}</div><div class="l">Total ratings</div></div>
    </div>
    ${rows || `<div class="empty">No ratings yet.</div>`}`;
}
function adminSettings(){
  const s = state.settings || {};
  const f = (name,label,type,ph) =>
    `<div class="field"><label>${label}</label><input name="${name}" type="${type||"text"}" value="${esc(s[name]||"")}" placeholder="${esc(ph||"")}"></div>`;
  return `
  <div class="panel">
    <div id="settingsMsg"></div>
    <form data-form="settings">
      <div class="two-col">
        ${f("full_name","Site / company name")}
        ${f("role_title","Role or subtitle")}
      </div>
      ${f("tagline","Tagline (hero line)")}
      <div class="field"><label>About text</label><textarea name="about">${esc(s.about||"")}</textarea></div>
      <div class="two-col">
        ${f("email","Email","email")}
        ${f("phone","Phone")}
        ${f("whatsapp","WhatsApp number (digits, with country code)","text","919876543210")}
        ${f("avatar_url","Logo / profile image URL")}
      </div>
      <div class="two-col">
        ${f("github_url","GitHub URL")}
        ${f("linkedin_url","LinkedIn URL")}
        ${f("instagram_url","Instagram URL")}
        ${f("twitter_url","Twitter / X URL")}
      </div>
      ${f("resume_url","Brochure / CV URL")}
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
      <p class="note" style="margin:0 0 20px">${signup?"Use the email you want as your admin login.":"Only the admin can add or remove projects."}</p>
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
      <p class="note">You are signed in as <b>${esc(state.user.email)}</b>, but this account is not on the admin list, so it cannot add or remove projects.</p>
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
      <h3>${project?"Edit project":"Add new project"}</h3>
      <div id="projMsg"></div>
      <form data-form="project" data-id="${esc(p.id||"")}">
        <div class="two-col">
          <div class="field"><label>Title *</label><input name="title" required value="${esc(p.title||"")}"></div>
          <div class="field"><label>Slug (URL)</label><input name="slug" value="${esc(p.slug||"")}" placeholder="auto from title"></div>
        </div>
        <div class="field"><label>Short summary</label><input name="summary" value="${esc(p.summary||"")}" placeholder="One line shown on the card"></div>
        <div class="field"><label>Full description</label><textarea name="description">${esc(p.description||"")}</textarea></div>
        <div class="field"><label>Cover image URL</label><input name="cover_image_url" value="${esc(p.cover_image_url||"")}" placeholder="https://"></div>
        <div class="field"><label>Gallery image URLs (one per line)</label><textarea name="gallery" placeholder="https://&#10;https://">${esc((p.gallery||[]).join("\n"))}</textarea></div>
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
    if(state.session){ await ensureSession(); await checkAdmin(); await loadMessages(); await loadRatings(); }
    html = adminView();
  } else if(hash.startsWith("#/contact")){
    html = homeView();
  } else {
    html = homeView();
  }
  app.innerHTML = html;
  state.flash = null;
  document.title = (state.settings && state.settings.full_name ? state.settings.full_name : "Portfolio");
  const sec = hash.match(/^#\/#(.+)$/);
  if(hash === "#/contact"){ setTimeout(()=>document.getElementById("contact")?.scrollIntoView({behavior:"smooth"}), 80); }
  else if(sec){ setTimeout(()=>document.getElementById(sec[1])?.scrollIntoView({behavior:"smooth"}), 80); }
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
  if(a === "rate"){
    const v = parseInt(el.dataset.value, 10) || 0;
    state.ratingPick = v;
    const pick = document.getElementById("ratePick");
    if(pick){ Array.from(pick.querySelectorAll("[data-action='rate']")).forEach((b,i)=>b.classList.toggle("on", i < v)); }
    const hidden = document.getElementById("rateStars");
    if(hidden) hidden.value = String(v);
    return;
  }
  if(a === "delete-rating"){
    if(!confirm("Delete this rating?")) return;
    try{
      await ensureSession();
      await api("/ratings?id=eq." + el.dataset.id, { method:"DELETE" });
      await loadRatings(); render();
    }catch(err){ alert("Could not delete: " + err.message); }
    return;
  }
  if(a === "enquire"){ state.contactRef = el.dataset.ref || ""; location.hash = "#/contact"; render(); return; }
  if(a === "admin-tab"){
    state.adminTab = el.dataset.tab;
    if(state.adminTab === "messages") await loadMessages();
    if(state.adminTab === "ratings") await loadRatings();
    render(); return;
  }
  if(a === "new-project"){ openProjectModal(null); return; }
  if(a === "edit-project"){
    const p = state.projects.find(x => x.id === el.dataset.id);
    openProjectModal(p); return;
  }
  if(a === "delete-project"){
    if(!confirm("Remove project \"" + el.dataset.title + "\"? This cannot be undone.")) return;
    try{
      await ensureSession();
      await api("/projects?id=eq." + el.dataset.id, { method:"DELETE" });
      await loadProjects(); render();
    }catch(err){ alert("Could not remove: " + err.message); }
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
      msg("contactMsg","Thank you. Your message has been sent and we will get back to you soon.","ok");
    }catch(err){ msg("contactMsg","Sorry, something went wrong: " + err.message, "err"); }
    return;
  }

  if(kind === "rating"){
    const stars = parseInt(fd.get("stars")||"0", 10);
    const comment = (fd.get("comment")||"").trim();
    if(!(stars >= 1 && stars <= 5)){ msg("rateMsg","Please pick a star rating first.","err"); return; }
    try{
      await api("/ratings", { method:"POST", body:{ stars, comment }, prefer:"return=minimal" });
      state.ratingPick = 0;
      state.ratingJustSubmitted = true;
      await loadRatings();
      render();
      setTimeout(()=>document.getElementById("rate")?.scrollIntoView({behavior:"smooth"}), 80);
    }catch(err){ msg("rateMsg","Could not save your rating: " + err.message, "err"); }
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
      state.adminTab = "overview";
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
          if(/duplicate|unique/i.test(err.message)){
            body.slug = body.slug + "-" + Date.now().toString(36);
            await api("/projects", { method:"POST", body, prefer:"return=representation" });
          } else throw err;
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
  await Promise.all([loadSettings(), loadProjects(), loadRatings()]);
  if(state.session){ await ensureSession(); if(state.session && state.session.access_token){ await checkAdmin(); } }
  state.loaded = true;
  render();
})();
