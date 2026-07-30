/* ============================================================
   DPPI Inventory — data layer
   Offline-first: every change persists to localStorage instantly.
   When Supabase is configured in Settings, the same state blob
   syncs to the cloud (last-write-wins, realtime pull).
   ============================================================ */

const DB = (() => {
  const KEY = 'dppi_state_v1';
  // DPPI's own Supabase project (public/publishable key — safe to embed).
  const DEFAULT_SYNC = {
    url: 'https://jftjdswxhjfvfiskclku.supabase.co',
    anonKey: 'sb_publishable_Uqz6KiniwHzYpeAFK-FoPA_wTv_j0Ru'
  };
  const DEVICE_ID = (() => {
    let d = localStorage.getItem('dppi_device');
    if (!d) { d = 'dev_' + Math.random().toString(36).slice(2, 10); localStorage.setItem('dppi_device', d); }
    return d;
  })();

  const uid = (p = 'id') => p + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

  function defaultState() {
    return {
      meta: { version: 1, updatedAt: 0, updatedBy: DEVICE_ID },
      gear: [],
      kits: [],
      jobs: [],
      invoices: [],
      team: [],
      settings: {
        company: { name: 'DPPI', address: '', email: '', phone: '', logoDataUri: '' },
        currency: 'CAD',
        taxLabel: 'HST',
        taxPct: 13,
        counters: { quote: 0, estimate: 0, invoice: 0 },
        sync: { ...DEFAULT_SYNC }
      }
    };
  }

  let state = null;
  let saveTimer = null;
  let pushTimer = null;
  const listeners = new Set();

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      state = raw ? JSON.parse(raw) : defaultState();
    } catch (e) {
      console.error('DB load failed, starting fresh', e);
      state = defaultState();
    }
    // forward-compat: fill any missing top-level keys
    const d = defaultState();
    for (const k of Object.keys(d)) if (state[k] === undefined) state[k] = d[k];
    for (const k of Object.keys(d.settings)) if (state.settings[k] === undefined) state.settings[k] = d.settings[k];
    // adopt the built-in sync config on devices that predate it (or were left blank)
    if (!state.settings.sync || !state.settings.sync.url) state.settings.sync = { ...DEFAULT_SYNC };
    return state;
  }

  function persistNow() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); }
    catch (e) {
      console.error('DB persist failed', e);
      if (String(e).includes('Quota')) alert('Local storage is full — remove some gear photos or connect cloud sync.');
    }
  }

  /** Call after any mutation. Persists locally, notifies UI, schedules cloud push. */
  function commit(reason = '') {
    state.meta.updatedAt = Date.now();
    state.meta.updatedBy = DEVICE_ID;
    clearTimeout(saveTimer);
    // serialize during idle time — stringifying a workspace full of photos on the
    // interaction path makes every tap feel heavy
    saveTimer = setTimeout(() => {
      if ('requestIdleCallback' in window) requestIdleCallback(persistNow, { timeout: 1000 });
      else persistNow();
    }, 250);
    listeners.forEach(fn => { try { fn(reason); } catch (e) { console.error(e); } });
    if (sync.client && sync.session) {
      clearTimeout(pushTimer);
      pushTimer = setTimeout(() => sync.push(), 1500);
    }
  }

  function onChange(fn) { listeners.add(fn); return () => listeners.delete(fn); }

  function replaceState(next, opts = {}) {
    state = next;
    const d = defaultState();
    for (const k of Object.keys(d)) if (state[k] === undefined) state[k] = d[k];
    persistNow();
    listeners.forEach(fn => { try { fn(opts.reason || 'replace'); } catch (e) { console.error(e); } });
  }

  /* ---------------- Supabase sync (optional) ---------------- */
  const sync = {
    client: null,
    session: null,
    status: 'off',           // off | connecting | signed-out | live | error
    lastError: '',
    channel: null,

    configured() {
      const s = state.settings.sync;
      return !!(s && s.url && s.anonKey);
    },

    async loadLib() {
      if (window.supabase) return true;
      await new Promise((res, rej) => {
        const s = document.createElement('script');
        s.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js';
        s.onload = res; s.onerror = () => rej(new Error('Could not load Supabase library (offline?)'));
        document.head.appendChild(s);
      });
      return true;
    },

    async init() {
      if (!this.configured()) { this.status = 'off'; return; }
      try {
        this.status = 'connecting';
        await this.loadLib();
        const { url, anonKey } = state.settings.sync;
        this.client = window.supabase.createClient(url, anonKey);
        const { data } = await this.client.auth.getSession();
        this.session = data.session || null;
        this.client.auth.onAuthStateChange((_e, sess) => {
          this.session = sess;
          this.status = sess ? 'live' : 'signed-out';
          if (sess) { this.pull(); this.subscribe(); }
          listeners.forEach(fn => fn('sync'));
        });
        if (this.session) {
          this.status = 'live';
          await this.pull();
          this.subscribe();
        } else {
          this.status = 'signed-out';
        }
      } catch (e) {
        this.status = 'error';
        this.lastError = e.message || String(e);
        console.error('sync init', e);
      }
      listeners.forEach(fn => fn('sync'));
    },

    async sendOtp(email) {
      const { error } = await this.client.auth.signInWithOtp({ email, options: { shouldCreateUser: true } });
      if (error) throw error;
    },

    async verifyOtp(email, token) {
      const { error } = await this.client.auth.verifyOtp({ email, token, type: 'email' });
      if (error) throw error;
    },

    async signOut() {
      if (this.client) await this.client.auth.signOut();
      this.session = null;
      this.status = this.configured() ? 'signed-out' : 'off';
      listeners.forEach(fn => fn('sync'));
    },

    /** Pull remote state; adopt it if newer than local. */
    async pull() {
      if (!this.client || !this.session) return;
      try {
        const { data, error } = await this.client.from('app_state').select('data, updated_at_ms').eq('id', 1).maybeSingle();
        if (error) throw error;
        // A device with no real content yet must adopt the cloud workspace even if
        // its (trivial) local edits are newer — otherwise a fresh phone could
        // overwrite the whole company's data with an empty state.
        const virgin = !state.gear.length && !state.jobs.length && !state.invoices.length && state.team.length <= 1;
        if (data && data.data && ((data.updated_at_ms || 0) > (state.meta.updatedAt || 0) || virgin)) {
          replaceState(data.data, { reason: 'remote' });
        } else if (!data) {
          await this.push(); // first device seeds the cloud row
        }
      } catch (e) {
        this.status = 'error'; this.lastError = e.message || String(e);
        listeners.forEach(fn => fn('sync'));
      }
    },

    async push() {
      if (!this.client || !this.session) return;
      try {
        const { error } = await this.client.from('app_state').upsert({
          id: 1, data: state, updated_at_ms: state.meta.updatedAt, updated_by: DEVICE_ID
        });
        if (error) throw error;
        if (this.status !== 'live') { this.status = 'live'; listeners.forEach(fn => fn('sync')); }
      } catch (e) {
        this.status = 'error'; this.lastError = e.message || String(e);
        listeners.forEach(fn => fn('sync'));
      }
    },

    subscribe() {
      if (!this.client || this.channel) return;
      this.channel = this.client
        .channel('app_state_changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'app_state' }, payload => {
          const row = payload.new;
          if (row && row.updated_by !== DEVICE_ID && (row.updated_at_ms || 0) > (state.meta.updatedAt || 0)) {
            replaceState(row.data, { reason: 'remote' });
          }
        })
        .subscribe();
    }
  };

  return {
    uid, load, commit, onChange, replaceState, sync,
    get state() { return state; },
    exportJSON() { return JSON.stringify(state, null, 2); },
    importJSON(text) {
      const parsed = JSON.parse(text);
      if (!parsed || typeof parsed !== 'object' || !parsed.meta) throw new Error('Not a DPPI backup file');
      parsed.meta.updatedAt = Date.now();
      replaceState(parsed, { reason: 'import' });
    }
  };
})();
