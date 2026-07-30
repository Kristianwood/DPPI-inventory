/* ============================================================
   DPPI Inventory — application
   ============================================================ */
'use strict';

/* ---------------- helpers ---------------- */
const $ = (sel, el = document) => el.querySelector(sel);
const $$ = (sel, el = document) => [...el.querySelectorAll(sel)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const fmtMoney = n => new Intl.NumberFormat('en-CA', { style: 'currency', currency: (DB.state?.settings.currency || 'CAD') }).format(n || 0);
const fmtMoneyShort = n => {
  const v = Math.abs(n);
  if (v >= 1e6) return '$' + (n / 1e6).toFixed(1) + 'M';
  if (v >= 1e3) return '$' + (n / 1e3).toFixed(1) + 'k';
  return '$' + Math.round(n);
};
const iso = d => {
  const x = d instanceof Date ? d : new Date(d + 'T12:00:00');
  return x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0');
};
const todayISO = () => iso(new Date());
const fmtDate = i => new Date(i + 'T12:00:00').toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' });
const fmtDateShort = i => new Date(i + 'T12:00:00').toLocaleDateString('en-CA', { month: 'short', day: 'numeric' });
const JOB_COLORS = ['#0D9488', '#8B5CF6', '#D97706', '#0284C7', '#F43F5E'];

const ICONS = {
  jobs: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>',
  inventory: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 8l-9-5-9 5v8l9 5 9-5V8z"/><path d="M3 8l9 5 9-5M12 13v8"/></svg>',
  calendar: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="17" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>',
  invoices: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6M9 13h6M9 17h6"/></svg>',
  revenue: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 20h18M6 16v-5M11 16V7M16 16v-8M21 16V4"/></svg>',
  team: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.8-3.5 3.4-5 6.5-5s5.7 1.5 6.5 5M16 8.5a3 3 0 110 0M15.5 15.2c2.4.4 4.3 1.8 5 4.8"/></svg>',
  settings: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.6 1.6 0 00.3 1.7l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.6 1.6 0 00-1.7-.3 1.6 1.6 0 00-1 1.5V21a2 2 0 11-4 0v-.2a1.6 1.6 0 00-1-1.5 1.6 1.6 0 00-1.7.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.6 1.6 0 00.3-1.7 1.6 1.6 0 00-1.5-1H3a2 2 0 110-4h.2a1.6 1.6 0 001.5-1 1.6 1.6 0 00-.3-1.7l-.1-.1a2 2 0 112.8-2.8l.1.1a1.6 1.6 0 001.7.3h.1a1.6 1.6 0 001-1.5V3a2 2 0 114 0v.2a1.6 1.6 0 001 1.5h.1a1.6 1.6 0 001.7-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.6 1.6 0 00-.3 1.7v.1a1.6 1.6 0 001.5 1h.2a2 2 0 110 4h-.2a1.6 1.6 0 00-1.5 1z"/></svg>',
  search: '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.5-4.5"/></svg>',
  back: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M15 18l-6-6 6-6"/></svg>',
  x: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M18 6L6 18M6 6l12 12"/></svg>',
  plus: '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M12 5v14M5 12h14"/></svg>',
  box: '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M21 8l-9-5-9 5v8l9 5 9-5V8z"/><path d="M3 8l9 5 9-5"/></svg>',
  kit: '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="8" height="8" rx="2"/><rect x="13" y="3" width="8" height="8" rx="2"/><rect x="3" y="13" width="8" height="8" rx="2"/><rect x="13" y="13" width="8" height="8" rx="2"/></svg>',
  print: '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9V3h12v6M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>',
};

/* ---------------- permissions ---------------- */
const PERMS = [
  ['viewRates', 'See pricing & revenue'],
  ['manageGear', 'Add / edit gear & kits'],
  ['manageJobs', 'Create jobs & assign gear'],
  ['invoices', 'Create quotes & invoices'],
  ['manageTeam', 'Manage team & settings'],
];
const ROLE_PRESETS = {
  owner: { viewRates: true, manageGear: true, manageJobs: true, invoices: true, manageTeam: true },
  admin: { viewRates: true, manageGear: true, manageJobs: true, invoices: true, manageTeam: false },
  tech: { viewRates: false, manageGear: true, manageJobs: true, invoices: false, manageTeam: false },
  viewer: { viewRates: false, manageGear: false, manageJobs: false, invoices: false, manageTeam: false },
};

let currentUser = null;
const can = p => !!(currentUser && currentUser.perms && currentUser.perms[p]);

/* ---------------- money / availability engine ---------------- */
const getGear = id => DB.state.gear.find(g => g.id === id);
const getKit = id => DB.state.kits.find(k => k.id === id);
const getJob = id => DB.state.jobs.find(j => j.id === id);

function kitDayRate(kit) {
  if (kit.dailyRate != null && kit.dailyRate !== '') return +kit.dailyRate;
  return (kit.items || []).reduce((s, it) => s + ((getGear(it.gearId)?.dailyRate || 0) * it.qty), 0);
}
function nodeDayRate(node) {
  if (node.kind === 'kit') { const k = getKit(node.refId); return k ? kitDayRate(k) * node.qty : 0; }
  const g = getGear(node.refId); return g ? (g.dailyRate || 0) * node.qty : 0;
}
function jobDayRate(job) { return (job.nodes || []).reduce((s, n) => s + nodeDayRate(n), 0); }

function jobStatus(job) {
  const days = job.shootDays || [];
  if (!days.length) return 'draft';
  const t = todayISO();
  if (t < days[0]) return 'upcoming';
  if (t > days[days.length - 1]) return 'wrapped';
  return 'active';
}

/** units of a gear item consumed by a job (direct nodes + inside kits) */
function jobGearUnits(job, gearId) {
  let n = 0;
  for (const node of (job.nodes || [])) {
    if (node.kind === 'gear' && node.refId === gearId) n += node.qty;
    if (node.kind === 'kit') {
      const kit = getKit(node.refId);
      const inKit = kit?.items?.find(i => i.gearId === gearId);
      if (inKit) n += inKit.qty * node.qty;
    }
  }
  return n;
}
/** units of gear committed on a given date across all jobs */
function assignedOn(gearId, dateISO, excludeJobId) {
  return DB.state.jobs.reduce((s, j) => {
    if (j.id === excludeJobId) return s;
    if (!(j.shootDays || []).includes(dateISO)) return s;
    return s + jobGearUnits(j, gearId);
  }, 0);
}
/** worst-case availability of a gear item across a set of dates */
function availableAcross(gearId, dates, excludeJobId) {
  const g = getGear(gearId); if (!g) return 0;
  if (!dates || !dates.length) return g.qty;
  let worst = Infinity;
  for (const d of dates) worst = Math.min(worst, g.qty - assignedOn(gearId, d, excludeJobId));
  return worst;
}
function kitAvailableAcross(kit, dates, excludeJobId) {
  let worst = Infinity;
  for (const it of (kit.items || [])) {
    const av = availableAcross(it.gearId, dates, excludeJobId);
    worst = Math.min(worst, Math.floor(av / it.qty));
  }
  return worst === Infinity ? 0 : worst;
}

function applyDiscount(amount, disc) {
  if (!disc || !disc.value) return { amount, off: 0 };
  const off = disc.type === 'pct' ? amount * (+disc.value / 100) : Math.min(+disc.value, amount);
  return { amount: amount - off, off };
}
function jobTotals(job) {
  const days = (job.shootDays || []).length || 0;
  const dayRate = jobDayRate(job);
  const gross = dayRate * days;
  const { amount: net, off } = applyDiscount(gross, job.discount);
  return { days, dayRate, gross, off, net };
}
/** booked revenue attributable to one calendar day */
function revenueOn(dateISO) {
  return DB.state.jobs.reduce((s, j) => {
    const days = j.shootDays || [];
    if (!days.includes(dateISO)) return s;
    const t = jobTotals(j);
    return s + (t.days ? t.net / t.days : 0);
  }, 0);
}
function revenueRange(fromISO, toISO) {
  let s = 0;
  for (const j of DB.state.jobs) {
    const t = jobTotals(j);
    if (!t.days) continue;
    const perDay = t.net / t.days;
    for (const d of j.shootDays) if (d >= fromISO && d <= toISO) s += perDay;
  }
  return s;
}

function invoiceTotals(inv) {
  const sub = (inv.lineItems || []).reduce((s, li) => s + (+li.qty || 0) * (+li.days || 1) * (+li.rate || 0), 0);
  const { amount: afterDisc, off } = applyDiscount(sub, inv.discount);
  const tax = afterDisc * ((+inv.taxPct || 0) / 100);
  return { sub, off, tax, total: afterDisc + tax };
}

/* ---------------- toast / modal ---------------- */
function toast(msg) {
  const el = document.createElement('div');
  el.className = 'toast glass'; el.textContent = msg;
  $('#toastRoot').appendChild(el);
  setTimeout(() => { el.style.opacity = '0'; el.style.transition = 'opacity .3s'; setTimeout(() => el.remove(), 320); }, 2200);
}
function openModal(html, { wide } = {}) {
  closeModal();
  const veil = document.createElement('div');
  veil.className = 'modal-veil';
  veil.innerHTML = `<div class="modal glass ${wide ? 'wide' : ''}" role="dialog" aria-modal="true">${html}</div>`;
  veil.addEventListener('pointerdown', e => { if (e.target === veil) closeModal(); });
  $('#modalRoot').appendChild(veil);
  const first = $('input, select, textarea, button.primary', veil);
  if (first && window.matchMedia('(min-width: 900px)').matches) setTimeout(() => first.focus(), 60);
  return veil;
}
function closeModal() { $('#modalRoot').innerHTML = ''; }
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

/* ---------------- photo handling ---------------- */
function scaleToDataURI(img, max, quality) {
  const scale = Math.min(1, max / Math.max(img.width, img.height));
  const c = document.createElement('canvas');
  c.width = Math.round(img.width * scale); c.height = Math.round(img.height * scale);
  c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
  return c.toDataURL('image/jpeg', quality);
}
/** Returns {full, thumb} — full for the gallery, tiny thumb for lists/nodes. */
function resizeImage(file) {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => {
      res({ full: scaleToDataURI(img, 900, 0.78), thumb: scaleToDataURI(img, 128, 0.7) });
      URL.revokeObjectURL(img.src);
    };
    img.onerror = rej;
    img.src = URL.createObjectURL(file);
  });
}
/** Thumb for list rows; falls back to the full photo for gear saved before thumbs existed. */
const thumbOf = g => (g.thumbs && g.thumbs[0]) || (g.photos && g.photos[0]) || '';
/** One-time background migration: build thumbs for gear that predates them. */
function ensureThumbs() {
  const missing = DB.state.gear.filter(g => g.photos?.length && (!g.thumbs || g.thumbs.length !== g.photos.length));
  if (!missing.length) return;
  let work = Promise.resolve();
  for (const g of missing) {
    work = work.then(() => Promise.all((g.photos || []).map(p => new Promise(res => {
      const img = new Image();
      img.onload = () => res(scaleToDataURI(img, 128, 0.7));
      img.onerror = () => res('');
      img.src = p;
    }))).then(thumbs => { g.thumbs = thumbs; }));
  }
  work.then(() => { DB.commit('thumbs-migrate'); });
}

/* ============================================================
   ROUTER
   ============================================================ */
let route = { view: 'jobs' };
function go(view, params = {}) {
  route = { view, ...params };
  render();
}

const NAV = [
  ['jobs', 'Jobs', 'jobs', null],
  ['inventory', 'Inventory', 'inventory', null],
  ['calendar', 'Calendar', 'calendar', null],
  ['invoices', 'Invoices', 'invoices', 'invoices'],
  ['revenue', 'Revenue', 'revenue', 'viewRates'],
  ['team', 'Team', 'team', 'manageTeam'],
  ['settings', 'Settings', 'settings', null],
];

function renderNav() {
  $('#navItems').innerHTML = NAV
    .filter(([, , , perm]) => !perm || can(perm))
    .map(([id, label, icon]) => `
      <button class="nav-btn ${route.view === id || (route.view === 'board' && id === 'jobs') ? 'active' : ''}" data-nav="${id}">
        ${ICONS[icon]}<span>${label}</span>
      </button>`).join('');
  $$('#navItems [data-nav]').forEach(b => b.onclick = () => go(b.dataset.nav));
  const u = currentUser;
  $('#navUser').innerHTML = u ? `<span class="avatar">${esc(u.name.slice(0, 2).toUpperCase())}</span><span>${esc(u.name)}</span>` : '';
  $('#navUser').onclick = () => { localStorage.removeItem('dppi_user'); sessionStorage.setItem('dppi_manual_gate', '1'); currentUser = null; boot(); };
  const dot = $('#syncDot');
  dot.className = 'sync-dot ' + (DB.sync.status === 'live' ? 'live' : DB.sync.status === 'error' ? 'error' : DB.sync.status === 'signed-out' ? 'signed-out' : '');
  dot.title = 'Sync: ' + DB.sync.status + (DB.sync.lastError ? ' — ' + DB.sync.lastError : '');
}

function render() {
  renderNav();
  const v = $('#view');
  v.classList.remove('hidden');
  const views = { jobs: viewJobs, board: viewBoard, inventory: viewInventory, calendar: viewCalendar, invoices: viewInvoices, revenue: viewRevenue, team: viewTeam, settings: viewSettings };
  (views[route.view] || viewJobs)(v);
  if (route.view !== 'board') window.scrollTo(0, 0);
}

/* ============================================================
   VIEW: JOBS
   ============================================================ */
function viewJobs(v) {
  const jobs = [...DB.state.jobs].sort((a, b) => (b.shootDays?.[0] || '').localeCompare(a.shootDays?.[0] || ''));
  const order = { active: 0, upcoming: 1, draft: 2, wrapped: 3 };
  jobs.sort((a, b) => order[jobStatus(a)] - order[jobStatus(b)]);

  v.innerHTML = `
    <div class="page-head">
      <div class="page-title"><h1>Jobs</h1><p>${jobs.length} job${jobs.length === 1 ? '' : 's'} · ${jobs.filter(j => jobStatus(j) === 'active').length} active today</p></div>
      <div class="page-actions">${can('manageJobs') ? `<button class="btn primary" id="newJob">${ICONS.plus} Set Up Job</button>` : ''}</div>
    </div>
    ${jobs.length ? `<div class="list">${jobs.map(j => {
      const st = jobStatus(j);
      const t = jobTotals(j);
      const tagCls = st === 'active' ? 'active' : st === 'upcoming' ? 'good' : st === 'wrapped' ? 'free' : 'warn';
      return `
      <div class="row-card glass" data-job="${j.id}">
        <span class="dot" style="background:${j.color}"></span>
        <div class="row-main">
          <div class="t">${esc(j.name)}</div>
          <div class="s">${esc(j.prodCo || 'No production company')} · ${j.shootDays?.length ? fmtDateShort(j.shootDays[0]) + ' – ' + fmtDateShort(j.shootDays[j.shootDays.length - 1]) + ` · ${t.days} day${t.days === 1 ? '' : 's'}` : 'no dates'}${j.po ? ` · PO ${esc(j.po)}` : ''}</div>
        </div>
        <div class="row-side">
          ${can('viewRates') ? `<span class="money big">${fmtMoney(t.net)}</span>` : ''}
          <span class="tag ${tagCls}">${st}</span>
        </div>
      </div>`;
    }).join('')}</div>`
    : `<div class="empty glass card"><div class="glyph">🎬</div><h3>No jobs yet</h3><p>Set up your first job — enter the production company, PO number and shoot days, then drag gear onto its board.</p>${can('manageJobs') ? `<button class="btn primary" id="newJob2">${ICONS.plus} Set Up Job</button>` : ''}</div>`}
  `;
  $$('[data-job]', v).forEach(el => el.onclick = () => go('board', { jobId: el.dataset.job }));
  const nj = $('#newJob', v) || $('#newJob2', v);
  if (nj) nj.onclick = () => jobModal();
}

function jobModal(job) {
  const isNew = !job;
  const j = job || { name: '', prodCo: '', billingAddress: '', contact: '', contactEmail: '', po: '', start: todayISO(), end: todayISO(), notes: '', discount: { type: 'pct', value: 0 } };
  const start = job ? job.shootDays?.[0] || todayISO() : j.start;
  const end = job ? job.shootDays?.[job.shootDays.length - 1] || start : j.end;
  openModal(`
    <div class="modal-head"><h2>${isNew ? 'Set Up Job' : 'Edit Job'}</h2><button class="icon-btn" id="mx">${ICONS.x}</button></div>
    <div class="modal-body">
      <div class="field"><label>Job name</label><input id="f_name" value="${esc(j.name)}" placeholder="e.g. Nike — Spring Spot"></div>
      <div class="form-row">
        <div class="field"><label>Production company</label><input id="f_prod" value="${esc(j.prodCo)}" placeholder="Company Inc."></div>
        <div class="field"><label>PO number</label><input id="f_po" value="${esc(j.po || '')}" placeholder="PO-00123"></div>
      </div>
      <div class="field"><label>Billing address</label><textarea id="f_addr" placeholder="123 Main St, Toronto ON">${esc(j.billingAddress || '')}</textarea></div>
      <div class="form-row">
        <div class="field"><label>Contact name</label><input id="f_contact" value="${esc(j.contact || '')}"></div>
        <div class="field"><label>Contact email</label><input id="f_email" type="email" value="${esc(j.contactEmail || '')}"></div>
      </div>
      <div class="form-row">
        <div class="field"><label>First shoot day</label><input id="f_start" type="date" value="${start}"></div>
        <div class="field"><label>Last shoot day</label><input id="f_end" type="date" value="${end}"></div>
      </div>
      <div class="field"><label>Job discount</label>
        <div style="display:flex;gap:10px;align-items:center">
          <div class="seg" id="discSeg"><button data-t="pct" class="${(j.discount?.type || 'pct') === 'pct' ? 'active' : ''}">%</button><button data-t="flat" class="${j.discount?.type === 'flat' ? 'active' : ''}">$</button></div>
          <input id="f_disc" type="number" min="0" step="0.01" value="${j.discount?.value || 0}" style="max-width:130px">
        </div>
        <span class="hint">Applied to the whole job total on the board and prefilled into invoices.</span>
      </div>
      <div class="field"><label>Notes</label><textarea id="f_notes">${esc(j.notes || '')}</textarea></div>
    </div>
    <div class="modal-foot">
      ${!isNew ? `<button class="btn danger" id="delJob" style="margin-right:auto">Delete</button>` : ''}
      <button class="btn ghost" id="mcancel">Cancel</button>
      <button class="btn primary" id="msave">${isNew ? 'Create Job' : 'Save'}</button>
    </div>
  `);
  let discType = j.discount?.type || 'pct';
  $$('#discSeg button').forEach(b => b.onclick = () => { discType = b.dataset.t; $$('#discSeg button').forEach(x => x.classList.toggle('active', x === b)); });
  $('#mx').onclick = $('#mcancel').onclick = closeModal;
  if (!isNew) $('#delJob').onclick = () => {
    if (!confirm(`Delete job "${job.name}"? This cannot be undone.`)) return;
    DB.state.jobs = DB.state.jobs.filter(x => x.id !== job.id);
    DB.commit('job-delete'); closeModal(); go('jobs'); toast('Job deleted');
  };
  $('#msave').onclick = () => {
    const name = $('#f_name').value.trim();
    if (!name) { $('#f_name').focus(); return; }
    let s = $('#f_start').value || todayISO(), e = $('#f_end').value || s;
    if (e < s) [s, e] = [e, s];
    const days = [];
    for (let d = new Date(s + 'T12:00:00'); iso(d) <= e; d.setDate(d.getDate() + 1)) days.push(iso(d));
    const data = {
      name, prodCo: $('#f_prod').value.trim(), po: $('#f_po').value.trim(),
      billingAddress: $('#f_addr').value.trim(), contact: $('#f_contact').value.trim(), contactEmail: $('#f_email').value.trim(),
      shootDays: days, notes: $('#f_notes').value.trim(),
      discount: { type: discType, value: +$('#f_disc').value || 0 },
    };
    if (isNew) {
      const nj = { id: DB.uid('job'), color: JOB_COLORS[DB.state.jobs.length % JOB_COLORS.length], nodes: [], createdAt: Date.now(), ...data };
      DB.state.jobs.push(nj);
      DB.commit('job-create'); closeModal(); go('board', { jobId: nj.id }); toast('Job created — drag gear onto the board');
    } else {
      Object.assign(job, data);
      DB.commit('job-edit'); closeModal(); render();
    }
  };
}

/* ============================================================
   VIEW: JOB BOARD (floating node canvas)
   ============================================================ */
function viewBoard(v) {
  const job = getJob(route.jobId);
  if (!job) { go('jobs'); return; }
  const t = jobTotals(job);
  const st = jobStatus(job);

  v.innerHTML = `
  <div class="board">
    <div class="board-top glass">
      <button class="btn sm ghost back" id="bBack">${ICONS.back} Jobs</button>
      <div class="board-title">
        <div class="t">${esc(job.name)}</div>
        <div class="s">
          <span>${esc(job.prodCo || '')}</span>
          ${job.po ? `<span>PO <b>${esc(job.po)}</b></span>` : ''}
          <span>${t.days} day${t.days === 1 ? '' : 's'} · ${job.shootDays.length ? fmtDateShort(job.shootDays[0]) + ' – ' + fmtDateShort(job.shootDays[job.shootDays.length - 1]) : ''}</span>
          <span class="tag ${st === 'active' ? 'active' : 'free'}">${st}</span>
        </div>
      </div>
      ${can('viewRates') ? `
      <div class="board-metrics">
        <div class="board-metric"><div class="k">Day rate</div><div class="v">${fmtMoney(t.dayRate)}</div></div>
        ${t.off ? `<div class="board-metric"><div class="k">Discount</div><div class="v" style="color:var(--warn)">−${fmtMoney(t.off)}</div></div>` : ''}
        <div class="board-metric"><div class="k">Job total</div><div class="v">${fmtMoney(t.net)}</div></div>
      </div>` : ''}
      <div class="page-actions">
        ${can('invoices') ? `<button class="btn sm" id="bInvoice">${ICONS.invoices} Invoice</button>` : ''}
        ${can('manageJobs') ? `<button class="btn sm ghost" id="bEdit">Edit</button>` : ''}
      </div>
    </div>
    <div class="board-body">
      <div class="canvas-wrap glass" id="canvasWrap">
        <div class="canvas" id="canvas">
          ${(job.nodes || []).map(n => nodeHTML(job, n)).join('')}
          ${!(job.nodes || []).length ? `<div class="canvas-empty"><div class="inner"><div class="big">No gear on this job yet</div><p>Drag items in from the gear drawer${window.matchMedia('(max-width:900px)').matches ? ' below' : ''} — or tap +</p></div></div>` : ''}
        </div>
      </div>
      ${can('manageJobs') ? `
      <aside class="drawer glass">
        <div class="drawer-head">
          <div class="t">Gear Drawer</div>
          <div class="searchbar">${ICONS.search}<input id="drawerSearch" placeholder="Search gear & kits…"></div>
        </div>
        <div class="drawer-list" id="drawerList"></div>
      </aside>` : ''}
    </div>
  </div>`;

  $('#bBack').onclick = () => go('jobs');
  if ($('#bEdit')) $('#bEdit').onclick = () => jobModal(job);
  if ($('#bInvoice')) $('#bInvoice').onclick = () => invoiceModal(null, job);

  /* node interactions */
  wireNodes(job);
  if (can('manageJobs')) {
    renderDrawer(job);
    let dT;
    $('#drawerSearch').oninput = () => { clearTimeout(dT); dT = setTimeout(() => renderDrawer(job), 120); };
  }
}

function nodeHTML(job, n) {
  const isKit = n.kind === 'kit';
  const ref = isKit ? getKit(n.refId) : getGear(n.refId);
  if (!ref) return '';
  const thumb = !isKit && thumbOf(ref) ? `<img src="${thumbOf(ref)}" alt="">` : (isKit ? ICONS.kit : ICONS.box);
  const rate = nodeDayRate(n);
  const avail = isKit ? kitAvailableAcross(ref, job.shootDays, job.id) : availableAcross(n.refId, job.shootDays, job.id);
  return `
  <div class="gnode ${isKit ? 'kit' : ''}" data-node="${n.id}" style="left:${n.x}px;top:${n.y}px">
    <div class="gnode-head" data-drag>
      <div class="gnode-thumb">${thumb}</div>
      <div class="gnode-name"><div class="t">${esc(ref.name)}</div><div class="s">${isKit ? 'Kit · ' + (ref.items?.length || 0) + ' items' : esc(ref.category || 'Gear')}</div></div>
      ${can('manageJobs') ? `<button class="icon-btn danger gnode-x" data-rm title="Remove from job">${ICONS.x}</button>` : ''}
    </div>
    <div class="gnode-body">
      ${can('manageJobs') ? `
      <div class="qty-step"><button data-q="-1" aria-label="Less">−</button><span class="q">${n.qty}</span><button data-q="1" aria-label="More" ${avail <= 0 ? 'disabled' : ''}>+</button></div>` : `<span class="tag free">×${n.qty}</span>`}
      ${can('viewRates') ? `<span class="gnode-rate">${fmtMoney(rate)}/day</span>` : ''}
    </div>
    ${isKit ? `<div class="gnode-kitlist">${(ref.items || []).slice(0, 4).map(it => `${it.qty}× ${esc(getGear(it.gearId)?.name || '?')}`).join('<br>')}${ref.items?.length > 4 ? '<br>…' : ''}</div>` : ''}
  </div>`;
}

function wireNodes(job) {
  const canvas = $('#canvas');
  if (!canvas) return;
  $$('.gnode', canvas).forEach(el => {
    const node = job.nodes.find(n => n.id === el.dataset.node);
    if (!node) return;
    const rm = $('[data-rm]', el);
    if (rm) rm.onclick = e => { e.stopPropagation(); job.nodes = job.nodes.filter(n => n.id !== node.id); DB.commit('node-rm'); render(); };
    $$('[data-q]', el).forEach(b => b.onclick = e => {
      e.stopPropagation();
      const d = +b.dataset.q;
      if (d > 0) {
        const avail = node.kind === 'kit' ? kitAvailableAcross(getKit(node.refId), job.shootDays, job.id) : availableAcross(node.refId, job.shootDays, job.id);
        if (avail <= 0) { toast('None left for these dates'); return; }
      }
      node.qty = Math.max(1, node.qty + d);
      if (node.qty === 0) job.nodes = job.nodes.filter(n => n.id !== node.id);
      DB.commit('node-qty'); render();
    });
    /* drag node around canvas */
    const head = $('[data-drag]', el);
    head.addEventListener('pointerdown', ev => {
      if (ev.target.closest('button')) return;
      if (!can('manageJobs')) return;
      ev.preventDefault();
      head.setPointerCapture(ev.pointerId);
      const startX = ev.clientX, startY = ev.clientY, ox = node.x, oy = node.y;
      el.classList.add('dragging');
      const move = e2 => {
        node.x = Math.max(0, Math.min(1980, ox + e2.clientX - startX));
        node.y = Math.max(0, Math.min(1310, oy + e2.clientY - startY));
        el.style.left = node.x + 'px'; el.style.top = node.y + 'px';
      };
      const up = () => {
        head.removeEventListener('pointermove', move);
        head.removeEventListener('pointerup', up);
        el.classList.remove('dragging');
        DB.commit('node-move');
      };
      head.addEventListener('pointermove', move);
      head.addEventListener('pointerup', up);
    });
  });
}

function renderDrawer(job) {
  const q = ($('#drawerSearch')?.value || '').toLowerCase();
  const list = $('#drawerList');
  const kits = DB.state.kits.filter(k => k.name.toLowerCase().includes(q));
  const gear = DB.state.gear.filter(g => (g.name + ' ' + (g.category || '')).toLowerCase().includes(q));
  const items = [
    ...kits.map(k => ({ kind: 'kit', ref: k, avail: kitAvailableAcross(k, job.shootDays, job.id) - jobKitCount(job, k.id) })),
    ...gear.map(g => ({ kind: 'gear', ref: g, avail: availableAcross(g.id, job.shootDays, job.id) - jobGearUnitsDirectAndKit(job, g.id) })),
  ];
  list.innerHTML = items.length ? items.map(it => `
    <div class="ditem ${it.avail <= 0 ? 'depleted' : ''}" data-kind="${it.kind}" data-ref="${it.ref.id}">
      <div class="row-thumb">${it.kind === 'gear' && thumbOf(it.ref) ? `<img src="${thumbOf(it.ref)}" alt="">` : (it.kind === 'kit' ? ICONS.kit : ICONS.box)}</div>
      <div class="m"><div class="t">${esc(it.ref.name)}</div><div class="s">${it.avail} available${can('viewRates') ? ' · ' + fmtMoney(it.kind === 'kit' ? kitDayRate(it.ref) : (it.ref.dailyRate || 0)) + '/day' : ''}</div></div>
      <button class="add" data-add title="Add to job">＋</button>
    </div>`).join('')
    : `<div class="empty" style="padding:24px"><p>${DB.state.gear.length ? 'No matches.' : 'No gear in inventory yet — add some in the Inventory tab.'}</p></div>`;

  $$('.ditem', list).forEach(el => {
    const kind = el.dataset.kind, refId = el.dataset.ref;
    const addNode = (x, y) => {
      const avail = kind === 'kit' ? kitAvailableAcross(getKit(refId), job.shootDays, job.id) - jobKitCount(job, refId)
        : availableAcross(refId, job.shootDays, job.id) - jobGearUnitsDirectAndKit(job, refId);
      if (avail <= 0) { toast('None available for these shoot days'); return; }
      job.nodes.push({ id: DB.uid('n'), kind, refId, qty: 1, x, y });
      DB.commit('node-add'); render();
    };
    $('[data-add]', el).onclick = e => {
      e.stopPropagation();
      const wrap = $('#canvasWrap');
      addNode(60 + wrap.scrollLeft + Math.random() * 220, 60 + wrap.scrollTop + Math.random() * 160);
    };
    /* drag from drawer to canvas */
    el.addEventListener('pointerdown', ev => {
      if (ev.target.closest('[data-add]')) return;
      if (el.classList.contains('depleted')) return;
      ev.preventDefault();
      const refName = (kind === 'kit' ? getKit(refId) : getGear(refId))?.name || '';
      let ghost = null;
      const startX = ev.clientX, startY = ev.clientY;
      el.setPointerCapture(ev.pointerId);
      const move = e2 => {
        if (!ghost && Math.hypot(e2.clientX - startX, e2.clientY - startY) > 8) {
          ghost = document.createElement('div');
          ghost.className = 'drag-ghost';
          ghost.innerHTML = `${kind === 'kit' ? ICONS.kit : ICONS.box}<span>${esc(refName)}</span>`;
          document.body.appendChild(ghost);
          $('#canvas').classList.add('drop-hot');
        }
        if (ghost) { ghost.style.left = e2.clientX + 'px'; ghost.style.top = e2.clientY + 'px'; }
      };
      const up = e2 => {
        el.removeEventListener('pointermove', move);
        el.removeEventListener('pointerup', up);
        $('#canvas')?.classList.remove('drop-hot');
        if (ghost) {
          ghost.remove();
          const wrap = $('#canvasWrap');
          const r = wrap.getBoundingClientRect();
          if (e2.clientX >= r.left && e2.clientX <= r.right && e2.clientY >= r.top && e2.clientY <= r.bottom) {
            const x = Math.max(0, e2.clientX - r.left + wrap.scrollLeft - 108);
            const y = Math.max(0, e2.clientY - r.top + wrap.scrollTop - 30);
            addNode(x, y);
          }
        }
      };
      el.addEventListener('pointermove', move);
      el.addEventListener('pointerup', up);
    });
  });
}
function jobKitCount(job, kitId) { return (job.nodes || []).filter(n => n.kind === 'kit' && n.refId === kitId).reduce((s, n) => s + n.qty, 0); }
function jobGearUnitsDirectAndKit(job, gearId) { return jobGearUnits(job, gearId); }

/* ============================================================
   VIEW: INVENTORY (gear + kits)
   ============================================================ */
let invTab = 'gear';
function viewInventory(v) {
  const t = todayISO();
  const q = (route.q || '').toLowerCase();
  const gear = DB.state.gear.filter(g => (g.name + ' ' + (g.category || '')).toLowerCase().includes(q));
  const kits = DB.state.kits.filter(k => k.name.toLowerCase().includes(q));
  const activeCount = DB.state.gear.filter(g => assignedOn(g.id, t) > 0).length;

  v.innerHTML = `
    <div class="page-head">
      <div class="page-title"><h1>Inventory</h1><p>${DB.state.gear.length} items · ${activeCount} active on jobs today</p></div>
      <div class="page-actions">
        <div class="searchbar">${ICONS.search}<input id="invSearch" placeholder="Search…" value="${esc(route.q || '')}"></div>
        ${can('manageGear') ? `<button class="btn" id="newKit">${ICONS.kit} New Kit</button><button class="btn primary" id="newGear">${ICONS.plus} Add Gear</button>` : ''}
      </div>
    </div>
    <div class="seg" style="margin-bottom:18px">
      <button id="tabGear" class="${invTab === 'gear' ? 'active' : ''}">Gear (${gear.length})</button>
      <button id="tabKits" class="${invTab === 'kits' ? 'active' : ''}">Kits (${kits.length})</button>
    </div>
    ${invTab === 'gear' ? renderGearList(gear, t) : renderKitList(kits)}
  `;
  let searchT;
  $('#invSearch').oninput = e => {
    clearTimeout(searchT);
    searchT = setTimeout(() => {
      route.q = e.target.value; render();
      const s = $('#invSearch'); s.focus(); s.setSelectionRange(s.value.length, s.value.length);
    }, 160);
  };
  $('#tabGear').onclick = () => { invTab = 'gear'; render(); };
  $('#tabKits').onclick = () => { invTab = 'kits'; render(); };
  if ($('#newGear')) $('#newGear').onclick = () => gearModal();
  if ($('#newKit')) $('#newKit').onclick = () => kitModal();
  $$('[data-gear]', v).forEach(el => el.onclick = () => gearProfile(el.dataset.gear));
  $$('[data-kit]', v).forEach(el => el.onclick = () => kitModal(getKit(el.dataset.kit)));
}

function renderGearList(gear, t) {
  if (!gear.length) return `<div class="empty glass card"><div class="glyph">📦</div><h3>No gear yet</h3><p>Add cameras, lenses, lights — anything you rent out. Each item gets a profile with photos, a day rate and quantity.</p></div>`;
  return `<div class="list">${gear.map(g => {
    const out = assignedOn(g.id, t);
    const avail = g.qty - out;
    return `
    <div class="row-card glass" data-gear="${g.id}">
      <div class="row-thumb">${thumbOf(g) ? `<img src="${thumbOf(g)}" alt="">` : ICONS.box}</div>
      <div class="row-main">
        <div class="t">${esc(g.name)}</div>
        <div class="s">${esc(g.category || 'Uncategorized')}${g.serial ? ' · SN ' + esc(g.serial) : ''}${can('viewRates') ? ' · ' + fmtMoney(g.dailyRate || 0) + '/day' : ''}</div>
      </div>
      <div class="row-side">
        ${out > 0 ? `<span class="tag active">${out} active</span>` : ''}
        <span class="tag ${avail <= 0 ? 'bad' : 'free'}">${avail} / ${g.qty} available</span>
      </div>
    </div>`;
  }).join('')}</div>`;
}
function renderKitList(kits) {
  if (!kits.length) return `<div class="empty glass card"><div class="glyph">🧰</div><h3>No kits yet</h3><p>Group gear into a kit — like a full camera package — and drop the whole thing onto a job in one move.</p></div>`;
  return `<div class="list">${kits.map(k => `
    <div class="row-card glass" data-kit="${k.id}">
      <div class="row-thumb">${ICONS.kit}</div>
      <div class="row-main">
        <div class="t">${esc(k.name)}</div>
        <div class="s">${(k.items || []).length} items — ${(k.items || []).slice(0, 3).map(i => esc(getGear(i.gearId)?.name || '?')).join(', ')}${(k.items || []).length > 3 ? '…' : ''}</div>
      </div>
      <div class="row-side">${can('viewRates') ? `<span class="money big">${fmtMoney(kitDayRate(k))}/day</span>` : ''}</div>
    </div>`).join('')}</div>`;
}

function gearProfile(gearId) {
  const g = getGear(gearId); if (!g) return;
  const t = todayISO();
  const jobsUsing = DB.state.jobs.filter(j => jobGearUnits(j, g.id) > 0 && jobStatus(j) !== 'wrapped');
  openModal(`
    <div class="modal-head"><h2>${esc(g.name)}</h2><button class="icon-btn" id="mx">${ICONS.x}</button></div>
    <div class="modal-body">
      ${g.photos?.length ? `<div class="photo-grid" style="margin-bottom:14px">${g.photos.map(p => `<div class="photo-cell"><img src="${p}" alt="${esc(g.name)}"></div>`).join('')}</div>` : ''}
      <div class="stat-row" style="grid-template-columns:1fr 1fr 1fr;margin-bottom:14px">
        <div class="stat glass"><div class="k">Owned</div><div class="v">${g.qty}</div></div>
        <div class="stat glass"><div class="k">Active today</div><div class="v">${assignedOn(g.id, t)}</div></div>
        <div class="stat glass accent"><div class="k">Available</div><div class="v">${g.qty - assignedOn(g.id, t)}</div></div>
      </div>
      <div style="font-size:13px;color:var(--ink-2);line-height:1.7">
        ${g.category ? `<div><b>Category:</b> ${esc(g.category)}</div>` : ''}
        ${g.serial ? `<div><b>Serial:</b> <span style="font-family:var(--mono)">${esc(g.serial)}</span></div>` : ''}
        ${can('viewRates') ? `<div><b>Day rate:</b> ${fmtMoney(g.dailyRate || 0)}</div>` : ''}
        ${can('viewRates') && g.replacementValue ? `<div><b>Replacement value:</b> ${fmtMoney(g.replacementValue)}</div>` : ''}
        ${g.notes ? `<div style="margin-top:8px">${esc(g.notes)}</div>` : ''}
      </div>
      ${jobsUsing.length ? `<div style="margin-top:16px"><div class="field"><label>On jobs</label></div><div class="list">${jobsUsing.map(j => `
        <div class="row-card glass" data-goto-job="${j.id}" style="padding:10px 14px">
          <span class="dot" style="background:${j.color}"></span>
          <div class="row-main"><div class="t" style="font-size:13px">${esc(j.name)}</div><div class="s">${jobGearUnits(j, g.id)} unit${jobGearUnits(j, g.id) === 1 ? '' : 's'} · ${jobStatus(j)}</div></div>
        </div>`).join('')}</div></div>` : ''}
    </div>
    <div class="modal-foot">
      ${can('manageGear') ? `<button class="btn" id="editGear">Edit</button>` : ''}
      <button class="btn ghost" id="mclose">Close</button>
    </div>
  `);
  $('#mx').onclick = $('#mclose').onclick = closeModal;
  $$('[data-goto-job]').forEach(el => el.onclick = () => { closeModal(); go('board', { jobId: el.dataset.gotoJob }); });
  if ($('#editGear')) $('#editGear').onclick = () => gearModal(g);
}

function gearModal(g) {
  const isNew = !g;
  const item = g || { name: '', category: '', serial: '', qty: 1, dailyRate: 0, replacementValue: '', notes: '', photos: [], thumbs: [] };
  const photos = [...(item.photos || [])];
  const thumbs = [...(item.thumbs || [])];
  while (thumbs.length < photos.length) thumbs.push(photos[thumbs.length]);
  const m = openModal(`
    <div class="modal-head"><h2>${isNew ? 'Add Gear' : 'Edit Gear'}</h2><button class="icon-btn" id="mx">${ICONS.x}</button></div>
    <div class="modal-body">
      <div class="field"><label>Name</label><input id="g_name" value="${esc(item.name)}" placeholder="e.g. ARRI SkyPanel S60-C"></div>
      <div class="form-row">
        <div class="field"><label>Category</label><input id="g_cat" value="${esc(item.category)}" list="catList" placeholder="Lighting">
          <datalist id="catList">${[...new Set(DB.state.gear.map(x => x.category).filter(Boolean))].map(c => `<option value="${esc(c)}">`).join('')}</datalist>
        </div>
        <div class="field"><label>Serial #</label><input id="g_serial" value="${esc(item.serial)}"></div>
      </div>
      <div class="form-row-3">
        <div class="field"><label>Quantity owned</label><input id="g_qty" type="number" min="1" value="${item.qty}"></div>
        <div class="field"><label>Day rate ($)</label><input id="g_rate" type="number" min="0" step="0.01" value="${item.dailyRate}"></div>
        <div class="field"><label>Replace value ($)</label><input id="g_repl" type="number" min="0" step="0.01" value="${item.replacementValue}"></div>
      </div>
      <div class="field"><label>Photos</label>
        <div class="photo-grid" id="photoGrid"></div>
        <input type="file" id="g_photo" accept="image/*" multiple hidden>
      </div>
      <div class="field"><label>Notes</label><textarea id="g_notes">${esc(item.notes)}</textarea></div>
    </div>
    <div class="modal-foot">
      ${!isNew ? `<button class="btn danger" id="delGear" style="margin-right:auto">Delete</button>` : ''}
      <button class="btn ghost" id="mcancel">Cancel</button>
      <button class="btn primary" id="msave">${isNew ? 'Add to Inventory' : 'Save'}</button>
    </div>
  `);
  const drawPhotos = () => {
    $('#photoGrid', m).innerHTML = photos.map((p, i) => `<div class="photo-cell"><img src="${thumbs[i] || p}"><button class="rm" data-i="${i}">×</button></div>`).join('')
      + `<div class="photo-add" id="photoAdd" role="button" tabindex="0" title="Add photo">＋</div>`;
    $$('#photoGrid .rm', m).forEach(b => b.onclick = () => { photos.splice(+b.dataset.i, 1); thumbs.splice(+b.dataset.i, 1); drawPhotos(); });
    $('#photoAdd', m).onclick = () => $('#g_photo', m).click();
  };
  drawPhotos();
  $('#g_photo', m).onchange = async e => {
    for (const f of e.target.files) {
      try { const r = await resizeImage(f); photos.push(r.full); thumbs.push(r.thumb); } catch { toast('Could not read that image'); }
    }
    e.target.value = ''; drawPhotos();
  };
  $('#mx', m).onclick = $('#mcancel', m).onclick = closeModal;
  if (!isNew) $('#delGear', m).onclick = () => {
    const inUse = DB.state.jobs.some(j => jobGearUnits(j, g.id) > 0);
    if (inUse && !confirm('This item is assigned to jobs — deleting removes it from them too. Continue?')) return;
    DB.state.gear = DB.state.gear.filter(x => x.id !== g.id);
    DB.state.jobs.forEach(j => j.nodes = (j.nodes || []).filter(n => !(n.kind === 'gear' && n.refId === g.id)));
    DB.state.kits.forEach(k => k.items = (k.items || []).filter(i => i.gearId !== g.id));
    DB.commit('gear-delete'); closeModal(); render(); toast('Gear deleted');
  };
  $('#msave', m).onclick = () => {
    const name = $('#g_name', m).value.trim();
    if (!name) { $('#g_name', m).focus(); return; }
    const data = {
      name, category: $('#g_cat', m).value.trim(), serial: $('#g_serial', m).value.trim(),
      qty: Math.max(1, +$('#g_qty', m).value || 1),
      dailyRate: +$('#g_rate', m).value || 0,
      replacementValue: +$('#g_repl', m).value || '',
      notes: $('#g_notes', m).value.trim(), photos, thumbs,
    };
    if (isNew) DB.state.gear.push({ id: DB.uid('g'), createdAt: Date.now(), ...data });
    else Object.assign(g, data);
    DB.commit('gear-save'); closeModal(); render(); toast(isNew ? 'Added to inventory' : 'Saved');
  };
}

function kitModal(k) {
  const isNew = !k;
  const kit = k || { name: '', dailyRate: '', items: [], notes: '' };
  const items = (kit.items || []).map(x => ({ ...x }));
  const m = openModal(`
    <div class="modal-head"><h2>${isNew ? 'New Kit' : 'Edit Kit'}</h2><button class="icon-btn" id="mx">${ICONS.x}</button></div>
    <div class="modal-body">
      <div class="field"><label>Kit name</label><input id="k_name" value="${esc(kit.name)}" placeholder="e.g. A-Cam Package"></div>
      <div class="field"><label>Contents</label><div id="kitItems"></div>
        <div style="display:flex;gap:8px;margin-top:8px">
          <select id="k_pick" style="flex:1;background:rgba(0,0,0,.28);border:1px solid var(--glass-border);border-radius:9px;padding:10px 12px">
            <option value="">Add gear to kit…</option>
            ${DB.state.gear.map(g => `<option value="${g.id}">${esc(g.name)}</option>`).join('')}
          </select>
          <button class="btn sm" id="k_add">${ICONS.plus}</button>
        </div>
      </div>
      <div class="field"><label>Kit day rate ($ — leave blank to use sum of contents)</label><input id="k_rate" type="number" min="0" step="0.01" value="${kit.dailyRate}" placeholder="${fmtMoney(items.reduce((s, it) => s + (getGear(it.gearId)?.dailyRate || 0) * it.qty, 0))} from contents"></div>
    </div>
    <div class="modal-foot">
      ${!isNew && can('manageGear') ? `<button class="btn danger" id="delKit" style="margin-right:auto">Delete</button>` : ''}
      <button class="btn ghost" id="mcancel">Cancel</button>
      ${can('manageGear') ? `<button class="btn primary" id="msave">${isNew ? 'Create Kit' : 'Save'}</button>` : ''}
    </div>
  `);
  const drawItems = () => {
    $('#kitItems', m).innerHTML = items.length ? items.map((it, i) => `
      <div style="display:flex;align-items:center;gap:10px;padding:7px 0;border-bottom:1px solid rgba(255,255,255,.05)">
        <span style="flex:1;font-size:13px;font-weight:600">${esc(getGear(it.gearId)?.name || '?')}</span>
        <div class="qty-step"><button data-ki="${i}" data-d="-1">−</button><span class="q">${it.qty}</span><button data-ki="${i}" data-d="1">+</button></div>
        <button class="icon-btn danger" data-krm="${i}">${ICONS.x}</button>
      </div>`).join('') : `<div style="font-size:12.5px;color:var(--ink-3);padding:6px 0">Empty — add gear below.</div>`;
    $$('[data-krm]', m).forEach(b => b.onclick = () => { items.splice(+b.dataset.krm, 1); drawItems(); });
    $$('[data-ki]', m).forEach(b => b.onclick = () => {
      const it = items[+b.dataset.ki];
      it.qty = Math.max(1, it.qty + (+b.dataset.d));
      drawItems();
    });
  };
  drawItems();
  $('#k_add', m).onclick = () => {
    const id = $('#k_pick', m).value; if (!id) return;
    const ex = items.find(i => i.gearId === id);
    if (ex) ex.qty++; else items.push({ gearId: id, qty: 1 });
    $('#k_pick', m).value = ''; drawItems();
  };
  $('#mx', m).onclick = $('#mcancel', m).onclick = closeModal;
  if ($('#delKit', m)) $('#delKit', m).onclick = () => {
    DB.state.kits = DB.state.kits.filter(x => x.id !== k.id);
    DB.state.jobs.forEach(j => j.nodes = (j.nodes || []).filter(n => !(n.kind === 'kit' && n.refId === k.id)));
    DB.commit('kit-delete'); closeModal(); render(); toast('Kit deleted');
  };
  if ($('#msave', m)) $('#msave', m).onclick = () => {
    const name = $('#k_name', m).value.trim();
    if (!name) { $('#k_name', m).focus(); return; }
    const rate = $('#k_rate', m).value;
    const data = { name, items, dailyRate: rate === '' ? '' : +rate, notes: '' };
    if (isNew) DB.state.kits.push({ id: DB.uid('k'), createdAt: Date.now(), ...data });
    else Object.assign(k, data);
    DB.commit('kit-save'); closeModal(); render(); toast('Kit saved');
  };
}

/* ============================================================
   VIEW: CALENDAR
   ============================================================ */
let calCursor = null; // Date at first of month
function viewCalendar(v) {
  if (!calCursor) { const n = new Date(); calCursor = new Date(n.getFullYear(), n.getMonth(), 1); }
  const y = calCursor.getFullYear(), mo = calCursor.getMonth();
  const monthName = calCursor.toLocaleDateString('en-CA', { month: 'long', year: 'numeric' });
  const first = new Date(y, mo, 1);
  const startDow = first.getDay();
  const gridStart = new Date(y, mo, 1 - startDow);
  const t = todayISO();
  const cells = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(gridStart); d.setDate(gridStart.getDate() + i);
    const di = iso(d);
    const inMonth = d.getMonth() === mo;
    const jobs = DB.state.jobs.filter(j => (j.shootDays || []).includes(di));
    cells.push(`
      <div class="cal-cell ${inMonth ? '' : 'other'} ${di === t ? 'today' : ''}">
        <div class="d">${d.getDate()}</div>
        ${jobs.map(j => `<button class="cal-chip" data-cjob="${j.id}" title="${esc(j.name)}"><span class="dot" style="background:${j.color}"></span><span>${esc(j.name)}</span></button>`).join('')}
      </div>`);
  }
  v.innerHTML = `
    <div class="page-head">
      <div class="page-title"><h1>Calendar</h1><p>Every job, every shoot day</p></div>
      <div class="page-actions">${can('manageJobs') ? `<button class="btn primary" id="newJobCal">${ICONS.plus} Set Up Job</button>` : ''}</div>
    </div>
    <div class="cal-head">
      <button class="btn sm" id="calPrev">‹</button>
      <div class="month">${monthName}</div>
      <button class="btn sm" id="calNext">›</button>
      <button class="btn sm ghost" id="calToday">Today</button>
    </div>
    <div class="cal-grid">
      ${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => `<div class="cal-dow">${d}</div>`).join('')}
      ${cells.join('')}
    </div>
  `;
  $('#calPrev').onclick = () => { calCursor = new Date(y, mo - 1, 1); render(); };
  $('#calNext').onclick = () => { calCursor = new Date(y, mo + 1, 1); render(); };
  $('#calToday').onclick = () => { calCursor = null; render(); };
  if ($('#newJobCal')) $('#newJobCal').onclick = () => jobModal();
  $$('[data-cjob]', v).forEach(el => el.onclick = () => go('board', { jobId: el.dataset.cjob }));
}

/* ============================================================
   VIEW: INVOICES
   ============================================================ */
function viewInvoices(v) {
  const invs = [...DB.state.invoices].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  v.innerHTML = `
    <div class="page-head">
      <div class="page-title"><h1>Invoices</h1><p>Quotes, estimates and final invoices</p></div>
      <div class="page-actions"><button class="btn primary" id="newInv">${ICONS.plus} New Document</button></div>
    </div>
    ${invs.length ? `<div class="list">${invs.map(inv => {
      const t = invoiceTotals(inv);
      const job = getJob(inv.jobId);
      const typeTag = inv.type === 'invoice' ? 'active' : inv.type === 'estimate' ? 'warn' : 'free';
      return `
      <div class="row-card glass" data-inv="${inv.id}">
        <div class="row-thumb">${ICONS.invoices}</div>
        <div class="row-main">
          <div class="t"><span style="font-family:var(--mono);font-size:13px;color:var(--teal-bright)">${esc(inv.number)}</span> — ${esc(job?.name || inv.clientName || 'No job')}</div>
          <div class="s">${fmtDate(inv.date)}${inv.po ? ' · PO ' + esc(inv.po) : ''}${job?.prodCo ? ' · ' + esc(job.prodCo) : ''}</div>
        </div>
        <div class="row-side">
          <span class="money big">${fmtMoney(t.total)}</span>
          <span class="tag ${typeTag}">${inv.type}</span>
          <span class="tag ${inv.status === 'paid' ? 'good' : inv.status === 'sent' ? 'warn' : 'free'}">${inv.status}</span>
        </div>
      </div>`;
    }).join('')}</div>`
    : `<div class="empty glass card"><div class="glyph">🧾</div><h3>No documents yet</h3><p>Create a quote, estimate or invoice — or generate one straight from a job board with all its gear prefilled.</p><button class="btn primary" id="newInv2">${ICONS.plus} New Document</button></div>`}
  `;
  const ni = $('#newInv', v) || $('#newInv2', v);
  if (ni) ni.onclick = () => invoiceModal();
  $$('[data-inv]', v).forEach(el => el.onclick = () => invoiceModal(DB.state.invoices.find(i => i.id === el.dataset.inv)));
}

function nextNumber(type) {
  const c = DB.state.settings.counters;
  c[type] = (c[type] || 0) + 1;
  const prefix = type === 'quote' ? 'Q' : type === 'estimate' ? 'EST' : 'INV';
  return `${prefix}-${new Date().getFullYear()}-${String(c[type]).padStart(3, '0')}`;
}

function invoiceModal(inv, fromJob) {
  const isNew = !inv;
  const job = fromJob || (inv ? getJob(inv.jobId) : null);
  let doc = inv ? JSON.parse(JSON.stringify(inv)) : {
    id: DB.uid('inv'), type: 'quote', number: '', jobId: job?.id || '', date: todayISO(),
    po: job?.po || '', clientName: job?.prodCo || '', billingAddress: job?.billingAddress || '',
    lineItems: [], discount: { type: job?.discount?.type || 'pct', value: job?.discount?.value || 0 },
    taxPct: DB.state.settings.taxPct, status: 'draft', notes: '',
  };
  if (isNew && job) {
    const days = (job.shootDays || []).length || 1;
    doc.lineItems = (job.nodes || []).map(n => {
      const ref = n.kind === 'kit' ? getKit(n.refId) : getGear(n.refId);
      return { desc: (ref?.name || '?') + (n.kind === 'kit' ? ' (kit)' : ''), qty: n.qty, days, rate: n.kind === 'kit' ? kitDayRate(ref) : (ref?.dailyRate || 0) };
    });
  }

  const m = openModal(`
    <div class="modal-head"><h2 id="invTitle">${isNew ? 'New Document' : esc(doc.number)}</h2><button class="icon-btn" id="mx">${ICONS.x}</button></div>
    <div class="modal-body">
      <div class="form-row-3">
        <div class="field"><label>Type</label>
          <select id="i_type">${['quote', 'estimate', 'invoice'].map(t => `<option value="${t}" ${doc.type === t ? 'selected' : ''}>${t[0].toUpperCase() + t.slice(1)}</option>`).join('')}</select>
        </div>
        <div class="field"><label>Date</label><input id="i_date" type="date" value="${doc.date}"></div>
        <div class="field"><label>Status</label>
          <select id="i_status">${['draft', 'sent', 'paid'].map(s => `<option value="${s}" ${doc.status === s ? 'selected' : ''}>${s[0].toUpperCase() + s.slice(1)}</option>`).join('')}</select>
        </div>
      </div>
      <div class="form-row">
        <div class="field"><label>Job</label>
          <select id="i_job"><option value="">— none —</option>${DB.state.jobs.map(j => `<option value="${j.id}" ${doc.jobId === j.id ? 'selected' : ''}>${esc(j.name)}</option>`).join('')}</select>
        </div>
        <div class="field"><label>PO number</label><input id="i_po" value="${esc(doc.po)}"></div>
      </div>
      <div class="form-row">
        <div class="field"><label>Bill to</label><input id="i_client" value="${esc(doc.clientName)}" placeholder="Production company"></div>
        <div class="field"><label>Billing address</label><input id="i_addr" value="${esc(doc.billingAddress)}"></div>
      </div>
      <div class="field"><label>Line items</label>
        <div class="table-wrap glass" style="border-radius:12px">
        <table class="data" id="liTable">
          <thead><tr><th>Description</th><th class="num">Qty</th><th class="num">Days</th><th class="num">Rate</th><th class="num">Amount</th><th></th></tr></thead>
          <tbody></tbody>
        </table>
        </div>
        <button class="btn sm" id="liAdd" style="margin-top:8px">${ICONS.plus} Add line</button>
      </div>
      <div class="form-row-3">
        <div class="field"><label>Discount</label>
          <div style="display:flex;gap:6px">
            <div class="seg" id="iDiscSeg"><button data-t="pct" class="${doc.discount.type === 'pct' ? 'active' : ''}">%</button><button data-t="flat" class="${doc.discount.type === 'flat' ? 'active' : ''}">$</button></div>
            <input id="i_disc" type="number" min="0" step="0.01" value="${doc.discount.value || 0}" style="min-width:70px">
          </div>
        </div>
        <div class="field"><label>${esc(DB.state.settings.taxLabel)} %</label><input id="i_tax" type="number" min="0" step="0.01" value="${doc.taxPct}"></div>
        <div class="field"><label>Totals</label><div id="iTotals" style="font-family:var(--mono);font-size:12.5px;line-height:1.8;color:var(--ink-2)"></div></div>
      </div>
      <div class="field"><label>Notes / terms</label><textarea id="i_notes">${esc(doc.notes)}</textarea></div>
    </div>
    <div class="modal-foot">
      ${!isNew ? `<button class="btn danger" id="delInv" style="margin-right:auto">Delete</button>` : ''}
      <button class="btn" id="printInv">${ICONS.print} Print / PDF</button>
      <button class="btn ghost" id="mcancel">Cancel</button>
      <button class="btn primary" id="msave">${isNew ? 'Create' : 'Save'}</button>
    </div>
  `, { wide: true });

  const readLines = () => {
    doc.lineItems = $$('#liTable tbody tr', m).map(tr => ({
      desc: $('[data-f=desc]', tr).value,
      qty: +$('[data-f=qty]', tr).value || 0,
      days: +$('[data-f=days]', tr).value || 1,
      rate: +$('[data-f=rate]', tr).value || 0,
    }));
  };
  const drawTotals = () => {
    doc.discount = { type: doc.discount.type, value: +$('#i_disc', m).value || 0 };
    doc.taxPct = +$('#i_tax', m).value || 0;
    const t = invoiceTotals(doc);
    $('#iTotals', m).innerHTML =
      `Sub ${fmtMoney(t.sub)}<br>${t.off ? `Disc −${fmtMoney(t.off)}<br>` : ''}Tax ${fmtMoney(t.tax)}<br><b style="color:var(--teal-bright)">Total ${fmtMoney(t.total)}</b>`;
  };
  const drawLines = () => {
    $('#liTable tbody', m).innerHTML = doc.lineItems.map((li, i) => `
      <tr>
        <td style="min-width:180px"><input data-f="desc" value="${esc(li.desc)}" style="width:100%;background:none;border:none;outline:none;color:var(--ink);font-size:13px"></td>
        <td class="num"><input data-f="qty" type="number" min="0" value="${li.qty}" style="width:52px;background:none;border:none;outline:none;color:var(--ink);text-align:right;font-family:var(--mono)"></td>
        <td class="num"><input data-f="days" type="number" min="0" value="${li.days}" style="width:52px;background:none;border:none;outline:none;color:var(--ink);text-align:right;font-family:var(--mono)"></td>
        <td class="num"><input data-f="rate" type="number" min="0" step="0.01" value="${li.rate}" style="width:76px;background:none;border:none;outline:none;color:var(--ink);text-align:right;font-family:var(--mono)"></td>
        <td class="num" data-amt>${fmtMoney(li.qty * li.days * li.rate)}</td>
        <td><button class="icon-btn danger" data-lrm="${i}">${ICONS.x}</button></td>
      </tr>`).join('');
    $$('#liTable input', m).forEach(inp => inp.oninput = () => { readLines(); $$('#liTable tbody tr', m).forEach((tr, i) => { const li = doc.lineItems[i]; $('[data-amt]', tr).textContent = fmtMoney(li.qty * li.days * li.rate); }); drawTotals(); });
    $$('[data-lrm]', m).forEach(b => b.onclick = () => { readLines(); doc.lineItems.splice(+b.dataset.lrm, 1); drawLines(); drawTotals(); });
  };
  drawLines(); drawTotals();

  $('#liAdd', m).onclick = () => { readLines(); doc.lineItems.push({ desc: '', qty: 1, days: 1, rate: 0 }); drawLines(); };
  $$('#iDiscSeg button', m).forEach(b => b.onclick = () => { doc.discount.type = b.dataset.t; $$('#iDiscSeg button', m).forEach(x => x.classList.toggle('active', x === b)); drawTotals(); });
  $('#i_disc', m).oninput = drawTotals;
  $('#i_tax', m).oninput = drawTotals;
  $('#i_job', m).onchange = () => {
    const j = getJob($('#i_job', m).value);
    if (j) { $('#i_po', m).value = j.po || ''; $('#i_client', m).value = j.prodCo || ''; $('#i_addr', m).value = j.billingAddress || ''; }
  };

  const collect = () => {
    readLines();
    doc.type = $('#i_type', m).value;
    doc.date = $('#i_date', m).value || todayISO();
    doc.status = $('#i_status', m).value;
    doc.jobId = $('#i_job', m).value;
    doc.po = $('#i_po', m).value.trim();
    doc.clientName = $('#i_client', m).value.trim();
    doc.billingAddress = $('#i_addr', m).value.trim();
    doc.discount.value = +$('#i_disc', m).value || 0;
    doc.taxPct = +$('#i_tax', m).value || 0;
    doc.notes = $('#i_notes', m).value.trim();
    if (!doc.number || (inv && inv.type !== doc.type && isNew)) doc.number = doc.number || nextNumber(doc.type);
  };
  const save = () => {
    collect();
    if (!doc.number) doc.number = nextNumber(doc.type);
    if (isNew) DB.state.invoices.push(doc);
    else Object.assign(inv, doc);
    DB.commit('invoice-save');
  };
  $('#mx', m).onclick = $('#mcancel', m).onclick = closeModal;
  if (!isNew) $('#delInv', m).onclick = () => {
    if (!confirm('Delete ' + inv.number + '?')) return;
    DB.state.invoices = DB.state.invoices.filter(x => x.id !== inv.id);
    DB.commit('invoice-delete'); closeModal(); render();
  };
  $('#printInv', m).onclick = () => { collect(); printInvoice(doc); };
  $('#msave', m).onclick = () => { save(); closeModal(); if (route.view === 'invoices') render(); toast(doc.number + ' saved'); };
}

function printInvoice(doc) {
  const co = DB.state.settings.company;
  const t = invoiceTotals(doc);
  const job = getJob(doc.jobId);
  const title = doc.type === 'quote' ? 'QUOTE' : doc.type === 'estimate' ? 'ESTIMATE' : 'INVOICE';
  $('#printRoot').innerHTML = `
  <div class="inv-sheet">
    <div class="inv-top">
      <div><h1>${title}</h1><div style="font-family:var(--mono);font-size:13px;margin-top:4px">${esc(doc.number || '(unsaved)')}</div></div>
      <div class="co"><b>${esc(co.name)}</b><br>${esc(co.address).replace(/\n/g, '<br>')}<br>${esc(co.email)}${co.phone ? '<br>' + esc(co.phone) : ''}</div>
    </div>
    <div class="inv-meta">
      <div class="blk"><div class="k">Bill To</div><div><b>${esc(doc.clientName)}</b><br>${esc(doc.billingAddress).replace(/\n/g, '<br>')}</div></div>
      <div class="blk"><div class="k">Details</div><div>
        Date: ${fmtDate(doc.date)}<br>
        ${doc.po ? 'PO #: ' + esc(doc.po) + '<br>' : ''}
        ${job ? 'Job: ' + esc(job.name) + '<br>' : ''}
        ${job?.shootDays?.length ? 'Shoot: ' + fmtDateShort(job.shootDays[0]) + ' – ' + fmtDateShort(job.shootDays[job.shootDays.length - 1]) : ''}
      </div></div>
    </div>
    <table class="inv-table">
      <thead><tr><th>Description</th><th class="num">Qty</th><th class="num">Days</th><th class="num">Rate</th><th class="num">Amount</th></tr></thead>
      <tbody>${doc.lineItems.map(li => `<tr><td>${esc(li.desc)}</td><td class="num">${li.qty}</td><td class="num">${li.days}</td><td class="num">${fmtMoney(li.rate)}</td><td class="num">${fmtMoney(li.qty * li.days * li.rate)}</td></tr>`).join('')}</tbody>
    </table>
    <div class="inv-totals">
      <div class="line"><span>Subtotal</span><span>${fmtMoney(t.sub)}</span></div>
      ${t.off ? `<div class="line"><span>Discount${doc.discount.type === 'pct' ? ' (' + doc.discount.value + '%)' : ''}</span><span>−${fmtMoney(t.off)}</span></div>` : ''}
      <div class="line"><span>${esc(DB.state.settings.taxLabel)} (${doc.taxPct}%)</span><span>${fmtMoney(t.tax)}</span></div>
      <div class="line total"><span>Total</span><span>${fmtMoney(t.total)}</span></div>
    </div>
    ${doc.notes ? `<div class="inv-notes"><b>Notes</b><br>${esc(doc.notes).replace(/\n/g, '<br>')}</div>` : ''}
  </div>`;
  window.print();
}

/* ============================================================
   VIEW: REVENUE
   ============================================================ */
let revShowTable = false;
function viewRevenue(v) {
  const t = todayISO();
  const now = new Date();
  const mStart = iso(new Date(now.getFullYear(), now.getMonth(), 1));
  const mEnd = iso(new Date(now.getFullYear(), now.getMonth() + 1, 0));
  const yStart = now.getFullYear() + '-01-01', yEnd = now.getFullYear() + '-12-31';
  const dayRev = revenueOn(t);
  const moRev = revenueRange(mStart, mEnd);
  const yrRev = revenueRange(yStart, yEnd);
  const invoiced = DB.state.invoices.filter(i => i.type === 'invoice' && i.status === 'paid').reduce((s, i) => s + invoiceTotals(i).total, 0);

  /* last 12 months */
  const months = [];
  for (let k = 11; k >= 0; k--) {
    const d = new Date(now.getFullYear(), now.getMonth() - k, 1);
    const e = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    months.push({ label: d.toLocaleDateString('en-CA', { month: 'short' }), full: d.toLocaleDateString('en-CA', { month: 'long', year: 'numeric' }), val: revenueRange(iso(d), iso(e)) });
  }
  const max = Math.max(...months.map(m => m.val), 1);

  const W = 660, H = 220, PAD = 34, bw = (W - PAD) / 12;
  const bars = months.map((mo, i) => {
    const bh = Math.max(mo.val > 0 ? 4 : 0, (mo.val / max) * (H - 46));
    const x = PAD + i * bw + 5, y = H - 26 - bh;
    return `
      <g class="bar-g" data-bi="${i}">
        <rect x="${x - 4}" y="0" width="${bw - 2}" height="${H - 26}" fill="transparent"></rect>
        <rect x="${x}" y="${y}" width="${bw - 12}" height="${bh}" rx="4" fill="var(--chart-teal)"></rect>
        <text x="${x + (bw - 12) / 2}" y="${H - 9}" text-anchor="middle" font-size="10" fill="var(--ink-3)">${mo.label}</text>
        ${mo.val === max && max > 1 ? `<text x="${x + (bw - 12) / 2}" y="${y - 7}" text-anchor="middle" font-size="10.5" font-weight="700" fill="var(--ink-2)">${fmtMoneyShort(mo.val)}</text>` : ''}
      </g>`;
  }).join('');

  v.innerHTML = `
    <div class="page-head">
      <div class="page-title"><h1>Revenue</h1><p>Booked gear revenue from job shoot days</p></div>
    </div>
    <div class="stat-row">
      <div class="stat glass accent"><div class="k">Today</div><div class="v">${fmtMoney(dayRev)}</div><div class="sub">${DB.state.jobs.filter(j => (j.shootDays || []).includes(t)).length} job(s) shooting</div></div>
      <div class="stat glass"><div class="k">This Month</div><div class="v">${fmtMoney(moRev)}</div><div class="sub">${now.toLocaleDateString('en-CA', { month: 'long' })}</div></div>
      <div class="stat glass"><div class="k">This Year</div><div class="v">${fmtMoney(yrRev)}</div><div class="sub">${now.getFullYear()}</div></div>
      <div class="stat glass"><div class="k">Invoiced &amp; Paid</div><div class="v">${fmtMoney(invoiced)}</div><div class="sub">from final invoices</div></div>
    </div>
    <div class="chart-card glass">
      <div style="display:flex;justify-content:space-between;align-items:flex-start">
        <div><div class="chart-title">Monthly booked revenue</div><div class="chart-sub">Last 12 months</div></div>
        <button class="btn sm ghost" id="revTable">${revShowTable ? 'Chart' : 'Table'}</button>
      </div>
      ${revShowTable ? `
        <div class="table-wrap"><table class="data"><thead><tr><th>Month</th><th class="num">Booked revenue</th></tr></thead>
        <tbody>${months.map(mo => `<tr><td>${mo.full}</td><td class="num">${fmtMoney(mo.val)}</td></tr>`).join('')}</tbody></table></div>`
      : `
      <div class="chart-svg-wrap">
        <svg viewBox="0 0 ${W} ${H}" width="100%" style="min-width:520px" role="img" aria-label="Monthly booked revenue, last 12 months">
          <line x1="${PAD - 4}" y1="${H - 26}" x2="${W}" y2="${H - 26}" stroke="rgba(255,255,255,.12)"></line>
          ${bars}
        </svg>
        <div class="chart-tip" id="chartTip"></div>
      </div>`}
    </div>
  `;
  $('#revTable').onclick = () => { revShowTable = !revShowTable; render(); };
  const tip = $('#chartTip');
  if (tip) $$('.bar-g', v).forEach(g => {
    const mo = months[+g.dataset.bi];
    g.addEventListener('pointerenter', () => { tip.style.display = 'block'; tip.innerHTML = `${mo.full}: <b>${fmtMoney(mo.val)}</b>`; });
    g.addEventListener('pointermove', e => {
      const wrap = $('.chart-svg-wrap', v).getBoundingClientRect();
      tip.style.left = (e.clientX - wrap.left) + 'px'; tip.style.top = (e.clientY - wrap.top) + 'px';
    });
    g.addEventListener('pointerleave', () => tip.style.display = 'none');
  });
}

/* ============================================================
   VIEW: TEAM
   ============================================================ */
function viewTeam(v) {
  v.innerHTML = `
    <div class="page-head">
      <div class="page-title"><h1>Team</h1><p>Accounts &amp; what each person can see</p></div>
      <div class="page-actions"><button class="btn primary" id="newUser">${ICONS.plus} Add Person</button></div>
    </div>
    <div class="list">
      ${DB.state.team.map(u => `
      <div class="row-card glass" data-user="${u.id}">
        <span class="avatar">${esc(u.name.slice(0, 2).toUpperCase())}</span>
        <div class="row-main">
          <div class="t">${esc(u.name)} ${u.id === currentUser.id ? '<span class="tag free" style="margin-left:6px">you</span>' : ''}</div>
          <div class="s">${u.email ? esc(u.email) + ' · ' : ''}<span style="text-transform:capitalize">${esc(u.role)}</span> — ${PERMS.filter(([k]) => u.perms[k]).length}/${PERMS.length} permissions</div>
        </div>
        <div class="row-side"><span class="tag ${u.role === 'owner' ? 'active' : 'free'}">${esc(u.role)}</span></div>
      </div>`).join('')}
    </div>
    <p style="margin-top:18px;font-size:12.5px;color:var(--ink-3);max-width:560px;line-height:1.6">
      People without “See pricing &amp; revenue” never see day rates, job totals, the Revenue tab or invoices.
      Once cloud sync is connected, each person signs in with their email on their own device.
    </p>
  `;
  $('#newUser').onclick = () => userModal();
  $$('[data-user]', v).forEach(el => el.onclick = () => userModal(DB.state.team.find(u => u.id === el.dataset.user)));
}

/** app role → database role (what they may actually read/write in the cloud) */
const DB_ROLE = { owner: 'owner', admin: 'admin', tech: 'editor', viewer: 'viewer' };

/** Record/refresh the invite in Supabase so this email gets the right access. */
async function pushInvite(email, appRole) {
  if (!email || !DB.sync.client || !DB.sync.session) return false;
  const role = DB_ROLE[appRole] || 'viewer';
  try {
    const { error } = await DB.sync.client.from('invites').upsert({ email: email.toLowerCase(), role });
    if (error) throw error;
    // if they've already signed up, update their live role too
    await DB.sync.client.from('profiles').update({ role }).eq('email', email.toLowerCase());
    return true;
  } catch (e) { console.warn('invite push', e); toast('Could not save invite: ' + (e.message || e)); return false; }
}

function inviteMailto(u) {
  const subject = 'You’ve been added to DPPI Inventory';
  const body = `Hi ${u.name},\n\nYou’ve been given access to DPPI Inventory.\n\n1. Open https://kristianwood.github.io/DPPI-inventory/ on your phone or computer\n2. Go to Settings → Cloud sync → Sign in\n3. Enter this email address (${u.email}) and the 6-digit code it sends you\n\nTip: in Safari on iPhone/iPad, tap Share → Add to Home Screen to install it like an app.`;
  window.location.href = `mailto:${encodeURIComponent(u.email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

function userModal(u) {
  const isNew = !u;
  const user = u || { name: '', email: '', role: 'tech', pin: '', perms: { ...ROLE_PRESETS.tech } };
  const perms = { ...user.perms };
  const m = openModal(`
    <div class="modal-head"><h2>${isNew ? 'Add Person' : 'Edit ' + esc(user.name)}</h2><button class="icon-btn" id="mx">${ICONS.x}</button></div>
    <div class="modal-body">
      <div class="form-row">
        <div class="field"><label>Name</label><input id="u_name" value="${esc(user.name)}"></div>
        <div class="field"><label>Email</label><input id="u_email" type="email" value="${esc(user.email || '')}" placeholder="them@example.com">
        </div>
      </div>
      <p style="font-size:12px;color:var(--ink-3);line-height:1.55;margin:-6px 0 14px">With an email set, they sign in on their own device with a 6-digit emailed code and automatically get exactly these permissions — you can send them the invite when you save.</p>
      <div class="form-row">
        <div class="field"><label>Role preset</label>
          <select id="u_role">${Object.keys(ROLE_PRESETS).map(r => `<option value="${r}" ${user.role === r ? 'selected' : ''}>${r[0].toUpperCase() + r.slice(1)}</option>`).join('')}</select>
        </div>
        <div class="field"><label>PIN (shared-device lock, optional)</label><input id="u_pin" inputmode="numeric" maxlength="4" value="${esc(user.pin || '')}" placeholder="Leave blank for none"></div>
      </div>
      <div class="field"><label>Permissions</label>
        <div id="permList" style="display:flex;flex-direction:column;gap:9px;margin-top:4px">
          ${PERMS.map(([k, label]) => `
            <label style="display:flex;align-items:center;gap:10px;font-size:13.5px;font-weight:600;color:var(--ink-2);text-transform:none;letter-spacing:0;cursor:pointer">
              <input type="checkbox" data-perm="${k}" ${perms[k] ? 'checked' : ''} style="width:17px;height:17px;accent-color:var(--teal)"> ${label}
            </label>`).join('')}
        </div>
      </div>
    </div>
    <div class="modal-foot">
      ${!isNew && user.role !== 'owner' ? `<button class="btn danger" id="delUser" style="margin-right:auto">Remove</button>` : ''}
      ${!isNew && user.email ? `<button class="btn" id="mailInvite">Email invite</button>` : ''}
      <button class="btn ghost" id="mcancel">Cancel</button>
      <button class="btn primary" id="msave">${isNew ? 'Add' : 'Save'}</button>
    </div>
  `);
  if ($('#mailInvite', m)) $('#mailInvite', m).onclick = () => inviteMailto(user);
  $('#u_role', m).onchange = () => {
    const preset = ROLE_PRESETS[$('#u_role', m).value];
    $$('[data-perm]', m).forEach(cb => cb.checked = !!preset[cb.dataset.perm]);
  };
  $('#mx', m).onclick = $('#mcancel', m).onclick = closeModal;
  if ($('#delUser', m)) $('#delUser', m).onclick = () => {
    if (!confirm('Remove ' + user.name + '?')) return;
    DB.state.team = DB.state.team.filter(x => x.id !== u.id);
    DB.commit('user-delete'); closeModal(); render();
  };
  $('#msave', m).onclick = async () => {
    const name = $('#u_name', m).value.trim();
    if (!name) { $('#u_name', m).focus(); return; }
    const email = $('#u_email', m).value.trim().toLowerCase();
    const pin = $('#u_pin', m).value.replace(/\D/g, '').slice(0, 4);
    const newPerms = {};
    $$('[data-perm]', m).forEach(cb => newPerms[cb.dataset.perm] = cb.checked);
    const data = { name, email, role: $('#u_role', m).value, pin, perms: newPerms };
    let person;
    if (isNew) { person = { id: DB.uid('u'), createdAt: Date.now(), ...data }; DB.state.team.push(person); }
    else {
      const roleChanged = u.role !== data.role || (u.email || '') !== email;
      Object.assign(u, data); person = u;
      if (currentUser.id === u.id) currentUser = u;
      person._roleChanged = roleChanged;
    }
    DB.commit('user-save'); closeModal(); render();
    if (email && (isNew || person._roleChanged)) {
      delete person._roleChanged;
      const ok = await pushInvite(email, data.role);
      if (ok && isNew && confirm(`Invite saved — ${name} can now sign in with ${email}.\n\nOpen an invite email to send them?`)) inviteMailto(person);
      else if (!DB.sync.session) toast('Sign in to cloud sync to activate their access');
      else toast('Saved');
    } else toast('Saved');
  };
}

/* ============================================================
   VIEW: SETTINGS
   ============================================================ */
function viewSettings(v) {
  const s = DB.state.settings;
  const sy = DB.sync;
  v.innerHTML = `
    <div class="page-head"><div class="page-title"><h1>Settings</h1><p>Company, tax &amp; cloud sync</p></div></div>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:16px;align-items:start">
      <div class="card glass">
        <h3 style="font-size:14px;margin-bottom:14px">Company (appears on invoices)</h3>
        <div class="field"><label>Company name</label><input id="s_name" value="${esc(s.company.name)}"></div>
        <div class="field"><label>Address</label><textarea id="s_addr">${esc(s.company.address)}</textarea></div>
        <div class="form-row">
          <div class="field"><label>Email</label><input id="s_email" value="${esc(s.company.email)}"></div>
          <div class="field"><label>Phone</label><input id="s_phone" value="${esc(s.company.phone)}"></div>
        </div>
        <div class="form-row-3">
          <div class="field"><label>Currency</label><select id="s_cur">${['CAD', 'USD', 'EUR', 'GBP'].map(c => `<option ${s.currency === c ? 'selected' : ''}>${c}</option>`).join('')}</select></div>
          <div class="field"><label>Tax label</label><input id="s_taxlabel" value="${esc(s.taxLabel)}"></div>
          <div class="field"><label>Tax %</label><input id="s_tax" type="number" min="0" step="0.01" value="${s.taxPct}"></div>
        </div>
        <button class="btn primary" id="saveCompany">Save</button>
      </div>

      <div class="card glass">
        <h3 style="font-size:14px;margin-bottom:6px">Cloud sync <span class="tag ${sy.status === 'live' ? 'good' : sy.status === 'error' ? 'bad' : 'free'}" style="margin-left:6px">${sy.status}</span></h3>
        <p style="font-size:12.5px;color:var(--ink-3);line-height:1.6;margin-bottom:14px">
          Syncs everything across iPhone, iPad and Mac. Create a free Supabase project, run the included
          <span style="font-family:var(--mono)">supabase-schema.sql</span>, then paste your project URL and anon key here
          (full steps in SYNC-SETUP.md).
        </p>
        <div class="field"><label>Supabase URL</label><input id="s_surl" value="${esc(s.sync.url)}" placeholder="https://xxxx.supabase.co"></div>
        <div class="field"><label>Anon key</label><input id="s_skey" value="${esc(s.sync.anonKey)}" placeholder="eyJhbGciOi…"></div>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <button class="btn primary" id="saveSync">Save &amp; Connect</button>
          ${sy.status === 'signed-out' ? `<button class="btn" id="syncSignIn">Sign in</button>` : ''}
          ${sy.session ? `<button class="btn" id="syncSignOut">Sign out (${esc(sy.session.user?.email || '')})</button>` : ''}
        </div>
        ${sy.lastError ? `<p style="margin-top:10px;font-size:12px;color:var(--bad)">${esc(sy.lastError)}</p>` : ''}
      </div>

      <div class="card glass">
        <h3 style="font-size:14px;margin-bottom:14px">Data</h3>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <button class="btn" id="exportBtn">Export backup</button>
          <button class="btn" id="importBtn">Import backup</button>
          <input type="file" id="importFile" accept=".json" hidden>
          ${!DB.state.gear.length ? `<button class="btn" id="demoBtn">Load sample data</button>` : ''}
        </div>
        <p style="font-size:12px;color:var(--ink-3);margin-top:12px;line-height:1.6">Backups include gear photos, jobs, invoices and team. Keep one before big changes.</p>
      </div>
    </div>
  `;
  $('#saveCompany').onclick = () => {
    Object.assign(s.company, { name: $('#s_name').value.trim() || 'DPPI', address: $('#s_addr').value.trim(), email: $('#s_email').value.trim(), phone: $('#s_phone').value.trim() });
    s.currency = $('#s_cur').value; s.taxLabel = $('#s_taxlabel').value.trim() || 'Tax'; s.taxPct = +$('#s_tax').value || 0;
    DB.commit('settings'); toast('Saved');
  };
  $('#saveSync').onclick = async () => {
    s.sync.url = $('#s_surl').value.trim().replace(/\/$/, '');
    s.sync.anonKey = $('#s_skey').value.trim();
    DB.commit('settings-sync');
    await DB.sync.init();
    render();
    if (DB.sync.status === 'signed-out') syncSignInModal();
  };
  if ($('#syncSignIn')) $('#syncSignIn').onclick = () => syncSignInModal();
  if ($('#syncSignOut')) $('#syncSignOut').onclick = async () => { await DB.sync.signOut(); render(); };
  $('#exportBtn').onclick = () => {
    const blob = new Blob([DB.exportJSON()], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'dppi-backup-' + todayISO() + '.json';
    a.click(); URL.revokeObjectURL(a.href);
  };
  $('#importBtn').onclick = () => $('#importFile').click();
  $('#importFile').onchange = async e => {
    const f = e.target.files[0]; if (!f) return;
    if (!confirm('Importing replaces ALL current data with the backup. Continue?')) { e.target.value = ''; return; }
    try { DB.importJSON(await f.text()); toast('Backup imported'); boot(); }
    catch (err) { alert('Import failed: ' + err.message); }
    e.target.value = '';
  };
  if ($('#demoBtn')) $('#demoBtn').onclick = loadDemo;
}

function syncSignInModal() {
  const m = openModal(`
    <div class="modal-head"><h2>Sign in to sync</h2><button class="icon-btn" id="mx">${ICONS.x}</button></div>
    <div class="modal-body">
      <div class="field"><label>Email</label><input id="sy_email" type="email" placeholder="you@dppi.com"></div>
      <div id="sy_step2" class="hidden">
        <div class="field"><label>6-digit code (check your email)</label><input id="sy_code" inputmode="numeric" maxlength="6" placeholder="123456"></div>
      </div>
      <p style="font-size:12px;color:var(--ink-3);line-height:1.6">We email you a one-time code — no password to remember.</p>
    </div>
    <div class="modal-foot">
      <button class="btn ghost" id="mcancel">Cancel</button>
      <button class="btn primary" id="sy_send">Send code</button>
    </div>
  `);
  $('#mx', m).onclick = $('#mcancel', m).onclick = closeModal;
  let sent = false;
  $('#sy_send', m).onclick = async () => {
    const email = $('#sy_email', m).value.trim();
    if (!email) return;
    try {
      if (!sent) {
        await DB.sync.sendOtp(email);
        sent = true;
        $('#sy_step2', m).classList.remove('hidden');
        $('#sy_send', m).textContent = 'Verify code';
        $('#sy_code', m).focus();
        toast('Code sent — check your email');
      } else {
        await DB.sync.verifyOtp(email, $('#sy_code', m).value.trim());
        closeModal(); toast('Connected — syncing'); render();
      }
    } catch (e) { alert(e.message || e); }
  };
}

/* ---------------- demo data ---------------- */
function loadDemo() {
  const g = (name, category, qty, rate, extra = {}) => ({ id: DB.uid('g'), name, category, qty, dailyRate: rate, serial: '', notes: '', photos: [], createdAt: Date.now(), ...extra });
  const cam = g('Sony FX9', 'Camera', 2, 650), lens = g('Canon CN-E Prime Set', 'Lenses', 2, 400),
    sky = g('ARRI SkyPanel S60-C', 'Lighting', 6, 180), tube = g('Astera Titan Tube (8-kit)', 'Lighting', 3, 220),
    mon = g('SmallHD Cine 13"', 'Monitors', 4, 95), sticks = g("O'Connor 2560 Tripod", 'Support', 3, 120),
    wire = g('Teradek Bolt 6 XT', 'Wireless', 3, 150);
  DB.state.gear.push(cam, lens, sky, tube, mon, sticks, wire);
  DB.state.kits.push({ id: DB.uid('k'), name: 'A-Cam Package', items: [{ gearId: cam.id, qty: 1 }, { gearId: lens.id, qty: 1 }, { gearId: mon.id, qty: 1 }, { gearId: sticks.id, qty: 1 }], dailyRate: '', createdAt: Date.now() });
  const d0 = new Date(); const days = [];
  for (let i = 0; i < 3; i++) { const d = new Date(d0); d.setDate(d0.getDate() + i); days.push(iso(d)); }
  DB.state.jobs.push({
    id: DB.uid('job'), name: 'Aurora — Brand Spot', prodCo: 'Northlight Films', po: 'PO-4471',
    billingAddress: '400 Richmond St W, Toronto ON', contact: 'Sam Perez', contactEmail: 'sam@northlight.ca',
    shootDays: days, color: JOB_COLORS[0], discount: { type: 'pct', value: 10 }, notes: '',
    nodes: [
      { id: DB.uid('n'), kind: 'gear', refId: sky.id, qty: 4, x: 90, y: 80 },
      { id: DB.uid('n'), kind: 'gear', refId: wire.id, qty: 1, x: 360, y: 210 },
      { id: DB.uid('n'), kind: 'kit', refId: DB.state.kits[0].id, qty: 1, x: 160, y: 330 },
    ], createdAt: Date.now(),
  });
  DB.commit('demo'); render(); toast('Sample data loaded');
}

/* ============================================================
   GATE (local profiles)
   ============================================================ */
function showGate() {
  const gate = $('#gate');
  $('#shell').classList.add('hidden');
  gate.classList.remove('hidden');
  const team = DB.state.team;

  if (!team.length) {
    gate.innerHTML = `
      <div class="gate-card glass">
        <div class="brand-mark"><svg viewBox="0 0 32 32" width="30" height="30"><circle cx="10" cy="10" r="5" fill="var(--teal)"/><circle cx="23" cy="14" r="3.5" fill="var(--teal-dim)"/><circle cx="14" cy="24" r="3" fill="var(--teal-dim)"/><path d="M13 12l7 2M12 14l2 7" stroke="var(--teal-line)" stroke-width="1.5"/></svg></div>
        <h1>Welcome to DPPI Inventory</h1>
        <p class="sub">Create the owner account for this workspace.</p>
        <div class="field" style="text-align:left"><label>Your name</label><input id="ownerName" placeholder="e.g. Kristian"></div>
        <div class="field" style="text-align:left"><label>PIN (4 digits, optional)</label><input id="ownerPin" inputmode="numeric" maxlength="4" placeholder="Optional"></div>
        <button class="btn primary" id="createOwner" style="width:100%;justify-content:center">Create Workspace</button>
      </div>`;
    $('#createOwner').onclick = () => {
      const name = $('#ownerName').value.trim();
      if (!name) { $('#ownerName').focus(); return; }
      const u = { id: DB.uid('u'), name, role: 'owner', pin: $('#ownerPin').value.replace(/\D/g, '').slice(0, 4), perms: { ...ROLE_PRESETS.owner }, createdAt: Date.now() };
      DB.state.team.push(u);
      DB.commit('owner-create');
      enter(u);
    };
    return;
  }

  gate.innerHTML = `
    <div class="gate-card glass">
      <div class="brand-mark"><svg viewBox="0 0 32 32" width="30" height="30"><circle cx="10" cy="10" r="5" fill="var(--teal)"/><circle cx="23" cy="14" r="3.5" fill="var(--teal-dim)"/><circle cx="14" cy="24" r="3" fill="var(--teal-dim)"/><path d="M13 12l7 2M12 14l2 7" stroke="var(--teal-line)" stroke-width="1.5"/></svg></div>
      <h1>DPPI Inventory</h1>
      <p class="sub">Who's working?</p>
      <div class="gate-users">
        ${team.map(u => `
          <button class="gate-user" data-uid="${u.id}">
            <span class="avatar">${esc(u.name.slice(0, 2).toUpperCase())}</span>
            <span class="m"><span class="t">${esc(u.name)}</span><span class="s">${esc(u.role)}</span></span>
            ${u.pin ? '<span style="color:var(--ink-3)">🔒</span>' : ''}
          </button>`).join('')}
      </div>
    </div>`;
  $$('.gate-user', gate).forEach(b => b.onclick = () => {
    const u = team.find(x => x.id === b.dataset.uid);
    if (!u.pin) { enter(u); return; }
    gate.innerHTML = `
      <div class="gate-card glass">
        <h1>Hi, ${esc(u.name)}</h1>
        <p class="sub">Enter your PIN</p>
        <div class="pin-row">${[0, 1, 2, 3].map(i => `<input inputmode="numeric" maxlength="1" data-pin="${i}">`).join('')}</div>
        <button class="btn ghost" id="pinBack">Back</button>
      </div>`;
    const inputs = $$('[data-pin]', gate);
    inputs[0].focus();
    inputs.forEach((inp, i) => {
      inp.oninput = () => {
        inp.value = inp.value.replace(/\D/g, '').slice(0, 1);
        if (inp.value && i < 3) inputs[i + 1].focus();
        const code = inputs.map(x => x.value).join('');
        if (code.length === 4) {
          if (code === u.pin) enter(u);
          else { inputs.forEach(x => x.value = ''); inputs[0].focus(); toast('Wrong PIN'); }
        }
      };
      inp.onkeydown = e => { if (e.key === 'Backspace' && !inp.value && i > 0) inputs[i - 1].focus(); };
    });
    $('#pinBack').onclick = showGate;
  });
}

/** When a cloud session exists and the gate is showing, sign the matching
    team member straight in (creating a viewer entry for unknown emails). */
function tryAutoEnter() {
  if (currentUser || sessionStorage.getItem('dppi_manual_gate')) return;
  if ($('#gate').classList.contains('hidden')) return;
  const email = DB.sync.session?.user?.email?.toLowerCase();
  if (!email) return;
  let u = DB.state.team.find(t => (t.email || '').toLowerCase() === email);
  if (!u) {
    u = { id: DB.uid('u'), name: email.split('@')[0], email, role: 'viewer', pin: '', perms: { ...ROLE_PRESETS.viewer }, createdAt: Date.now() };
    DB.state.team.push(u);
    DB.commit('user-autocreate');
  }
  enter(u);
}

function enter(user) {
  currentUser = user;
  sessionStorage.removeItem('dppi_manual_gate');
  localStorage.setItem('dppi_user', user.id);
  $('#gate').classList.add('hidden');
  $('#shell').classList.remove('hidden');
  route = { view: 'jobs' };
  render();
}

/* ============================================================
   BOOT
   ============================================================ */
function boot() {
  DB.load();
  const savedUser = DB.state.team.find(u => u.id === localStorage.getItem('dppi_user'));
  if (savedUser) {
    currentUser = savedUser;
    $('#gate').classList.add('hidden');
    $('#shell').classList.remove('hidden');
    render();
  } else {
    showGate();
  }
  DB.sync.init();
  setTimeout(ensureThumbs, 800);
}

DB.onChange(reason => {
  if (reason === 'remote' || reason === 'import') {
    const me = DB.state.team.find(u => u.id === currentUser?.id);
    if (me) { currentUser = me; render(); toast('Synced from cloud'); }
    else boot();
  } else if (reason === 'sync') {
    if (currentUser) renderNav();
    tryAutoEnter();
  }
});

boot();
