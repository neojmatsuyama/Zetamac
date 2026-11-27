(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const DEFAULTS = {
    add: true, sub: true, mul: true, div: true,
    addA: [2, 100], addB: [2, 100],
    mulA: [2, 12], mulB: [2, 100],
    duration: 120,
    haptics: true,
  };
  const SETTINGS_KEY = 'zm-settings-v1';
  const HISTORY_KEY = 'zm-history-v1';

  // ---------- storage ----------
  const store = {
    get(key, fallback) {
      try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; }
      catch { return fallback; }
    },
    set(key, value) {
      try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* ignore */ }
    },
  };

  // ---------- settings ----------
  const fields = {
    add: $('op-add'), sub: $('op-sub'), mul: $('op-mul'), div: $('op-div'),
    addAmin: $('add-a-min'), addAmax: $('add-a-max'), addBmin: $('add-b-min'), addBmax: $('add-b-max'),
    mulAmin: $('mul-a-min'), mulAmax: $('mul-a-max'), mulBmin: $('mul-b-min'), mulBmax: $('mul-b-max'),
    duration: $('duration'), haptics: $('opt-haptics'),
  };

  function writeForm(s) {
    fields.add.checked = s.add; fields.sub.checked = s.sub;
    fields.mul.checked = s.mul; fields.div.checked = s.div;
    [fields.addAmin.value, fields.addAmax.value] = s.addA;
    [fields.addBmin.value, fields.addBmax.value] = s.addB;
    [fields.mulAmin.value, fields.mulAmax.value] = s.mulA;
    [fields.mulBmin.value, fields.mulBmax.value] = s.mulB;
    fields.duration.value = String(s.duration);
    fields.haptics.checked = s.haptics;
  }

  function readForm() {
    const n = (el) => parseInt(el.value, 10);
    return {
      add: fields.add.checked, sub: fields.sub.checked,
      mul: fields.mul.checked, div: fields.div.checked,
      addA: [n(fields.addAmin), n(fields.addAmax)],
      addB: [n(fields.addBmin), n(fields.addBmax)],
      mulA: [n(fields.mulAmin), n(fields.mulAmax)],
      mulB: [n(fields.mulBmin), n(fields.mulBmax)],
      duration: parseInt(fields.duration.value, 10),
      haptics: fields.haptics.checked,
    };
  }

  function validate(s) {
    if (!s.add && !s.sub && !s.mul && !s.div) return 'Pick at least one operation.';
    const ranges = [];
    if (s.add || s.sub) ranges.push(['Addition', s.addA], ['Addition', s.addB]);
    if (s.mul || s.div) ranges.push(['Multiplication', s.mulA], ['Multiplication', s.mulB]);
    for (const [name, [lo, hi]] of ranges) {
      if (!Number.isFinite(lo) || !Number.isFinite(hi)) return `${name}: fill in every range.`;
      if (lo > hi) return `${name}: each range's first number must be ≤ the second.`;
      if (lo < 0 || hi > 100000) return `${name}: use numbers from 0 to 100000.`;
    }
    if ((s.div) && s.mulA[0] === 0 && s.mulA[1] === 0) return 'Division: the divisor range cannot be only 0.';
    return '';
  }

  // Settings that change the difficulty; used to group history and bests.
  function configKey(s) {
    const ops = ['add', 'sub', 'mul', 'div'].filter((k) => s[k]).join(',');
    const parts = [ops, `${s.duration}s`];
    if (s.add || s.sub) parts.push(`A${s.addA.join('-')}x${s.addB.join('-')}`);
    if (s.mul || s.div) parts.push(`M${s.mulA.join('-')}x${s.mulB.join('-')}`);
    return parts.join('|');
  }

  function configLabel(s) {
    const sym = { add: '+', sub: '−', mul: '×', div: '÷' };
    const ops = ['add', 'sub', 'mul', 'div'].filter((k) => s[k]).map((k) => sym[k]).join(' ');
    const isDefaultRanges =
      s.addA.join() === '2,100' && s.addB.join() === '2,100' &&
      s.mulA.join() === '2,12' && s.mulB.join() === '2,100';
    let label = `${s.duration}s · ${ops}`;
    if (!isDefaultRanges) {
      const r = [];
      if (s.add || s.sub) r.push(`(${s.addA.join('–')})+(${s.addB.join('–')})`);
      if (s.mul || s.div) r.push(`(${s.mulA.join('–')})×(${s.mulB.join('–')})`);
      label += ` · ${r.join(' ')}`;
    } else {
      label += ' · default ranges';
    }
    return label;
  }

  // ---------- history ----------
  const loadHistory = () => store.get(HISTORY_KEY, []);
  const saveHistory = (h) => store.set(HISTORY_KEY, h);
  function bestFor(key, history = loadHistory()) {
    let best = null;
    for (const r of history) if (r.key === key && (best === null || r.score > best)) best = r.score;
    return best;
  }

  function updateSettingsBest() {
    const s = readForm();
    if (validate(s)) { $('settings-best').textContent = ''; return; }
    const history = loadHistory();
    const key = configKey(s);
    const best = bestFor(key, history);
    const games = history.filter((r) => r.key === key).length;
    $('settings-best').textContent = best === null
      ? 'No games yet with these settings.'
      : `Best with these settings: ${best} · ${games} game${games === 1 ? '' : 's'} played`;
  }

  // ---------- problem generation ----------
  const randInt = (lo, hi) => lo + Math.floor(Math.random() * (hi - lo + 1));

  function makeProblem(s) {
    const ops = ['add', 'sub', 'mul', 'div'].filter((k) => s[k]);
    const op = ops[Math.floor(Math.random() * ops.length)];
    if (op === 'add' || op === 'sub') {
      const a = randInt(...s.addA), b = randInt(...s.addB);
      return op === 'add'
        ? { text: `${a} + ${b}`, answer: a + b }
        : { text: `${a + b} − ${a}`, answer: b };
    }
    let a = randInt(...s.mulA);
    const b = randInt(...s.mulB);
    if (op === 'mul') return { text: `${a} × ${b}`, answer: a * b };
    let guard = 0;
    while (a === 0 && guard++ < 50) a = randInt(...s.mulA);
    if (a === 0) a = 1;
    return { text: `${a * b} ÷ ${a}`, answer: b };
  }

  // ---------- feedback ----------
  const hapticLabel = $('haptic-label');
  let flashTimer = 0;
  function feedback() {
    if (!game.settings.haptics) return;
    // iOS Safari 17.4+: toggling a <input switch> via its label fires a system haptic.
    try { hapticLabel.click(); } catch { /* ignore */ }
    if (navigator.vibrate) { try { navigator.vibrate(12); } catch { /* ignore */ } }
    const area = $('problem-area');
    area.classList.add('flash');
    clearTimeout(flashTimer);
    flashTimer = setTimeout(() => area.classList.remove('flash'), 90);
  }

  // ---------- screens ----------
  function show(id) {
    for (const el of document.querySelectorAll('.screen')) el.classList.toggle('active', el.id === id);
  }

  // ---------- game ----------
  const game = {
    settings: null, problem: null, input: '', score: 0,
    endAt: 0, raf: 0, running: false, startedAt: 0, lastText: '',
  };

  function renderAnswer() {
    $('answer').innerHTML = `${game.input}<span class="caret"></span>`;
  }

  function nextProblem() {
    let p, tries = 0;
    do { p = makeProblem(game.settings); } while (p.text === game.lastText && tries++ < 10);
    game.problem = p;
    game.lastText = p.text;
    game.input = '';
    $('problem').textContent = p.text;
    renderAnswer();
  }

  function startGame() {
    const s = readForm();
    const err = validate(s);
    $('settings-error').textContent = err;
    if (err) return;
    store.set(SETTINGS_KEY, s);
    game.settings = s;
    game.score = 0;
    game.lastText = '';
    game.running = true;
    game.startedAt = performance.now();
    game.endAt = game.startedAt + s.duration * 1000;
    $('score').textContent = '0';
    $('time-left').textContent = String(s.duration);
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
    nextProblem();
    show('screen-game');
    tick();
  }

  function tick() {
    if (!game.running) return;
    const remaining = game.endAt - performance.now();
    if (remaining <= 0) { endGame(); return; }
    $('time-left').textContent = String(Math.ceil(remaining / 1000));
    game.raf = requestAnimationFrame(tick);
  }

  function press(k) {
    if (!game.running) return;
    if (k === 'C') game.input = '';
    else if (k === 'B') game.input = game.input.slice(0, -1);
    else if (/^[0-9]$/.test(k)) {
      if (game.input.length >= 9) return;
      game.input = game.input === '0' ? k : game.input + k;
    }
    renderAnswer();
    // Zetamac behaviour: the answer is accepted the moment it is correct — no Enter key.
    if (game.input !== '' && parseInt(game.input, 10) === game.problem.answer) {
      game.score++;
      $('score').textContent = String(game.score);
      feedback();
      nextProblem();
    }
  }

  function quitGame() {
    game.running = false;
    cancelAnimationFrame(game.raf);
    show('screen-settings');
    updateSettingsBest();
  }

  function endGame() {
    game.running = false;
    cancelAnimationFrame(game.raf);
    const s = game.settings;
    const key = configKey(s);
    const history = loadHistory();
    const prevBest = bestFor(key, history);
    history.push({ key, label: configLabel(s), score: game.score, duration: s.duration, t: Date.now() });
    if (history.length > 2000) history.splice(0, history.length - 2000);
    saveHistory(history);

    $('final-score').textContent = String(game.score);
    const badge = $('end-badge');
    if (prevBest === null) badge.textContent = game.score > 0 ? 'First game with these settings' : '';
    else if (game.score > prevBest) badge.textContent = `New best! (previous ${prevBest})`;
    else badge.textContent = `Best: ${prevBest}`;

    const per = game.score > 0 ? (s.duration / game.score).toFixed(2) : '—';
    const per60 = Math.round((game.score / s.duration) * 60);
    $('end-stats').textContent = `${per} s per problem · ${per60} per minute`;

    drawChart(history.filter((r) => r.key === key).slice(-20).map((r) => r.score));
    show('screen-end');
  }

  function drawChart(scores) {
    const svg = $('chart');
    const W = 300, H = 100, pad = 8;
    if (scores.length < 2) {
      svg.innerHTML = `<text x="150" y="55" text-anchor="middle" font-size="12" fill="var(--muted)">Play more games to see a trend</text>`;
      return;
    }
    const max = Math.max(...scores), min = Math.min(...scores);
    const span = Math.max(1, max - min);
    const x = (i) => pad + (i * (W - 2 * pad)) / (scores.length - 1);
    const y = (v) => H - pad - ((v - min) * (H - 2 * pad)) / span;
    const pts = scores.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
    const last = scores.length - 1;
    svg.innerHTML =
      `<polyline points="${pts}" fill="none" stroke="var(--accent)" stroke-width="2" vector-effect="non-scaling-stroke" stroke-linejoin="round"/>` +
      `<circle cx="${x(last)}" cy="${y(scores[last])}" r="3.5" fill="var(--accent)"/>`;
  }

  // ---------- history screen ----------
  function renderHistory() {
    const list = $('history-list');
    const history = loadHistory();
    if (!history.length) { list.innerHTML = '<p class="empty">No games yet.</p>'; return; }
    const groups = new Map();
    for (const r of history) {
      if (!groups.has(r.key)) groups.set(r.key, { label: r.label, rows: [], last: 0 });
      const g = groups.get(r.key);
      g.rows.push(r);
      g.last = Math.max(g.last, r.t);
    }
    const sorted = [...groups.values()].sort((a, b) => b.last - a.last);
    const fmt = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
    const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    list.innerHTML = sorted.map((g) => {
      const best = Math.max(...g.rows.map((r) => r.score));
      const avg = (g.rows.reduce((a, r) => a + r.score, 0) / g.rows.length).toFixed(1);
      const rows = g.rows.slice(-30).reverse().map((r) =>
        `<div class="hist-row"><span>${esc(fmt.format(new Date(r.t)))}</span><span class="${r.score === best ? 'best' : ''}">${r.score}</span></div>`
      ).join('');
      return `<div class="hist-group"><h2>${esc(g.label)} — best ${best}, avg ${avg}, ${g.rows.length} games</h2>${rows}</div>`;
    }).join('');
  }

  // ---------- wiring ----------
  const keypad = $('keypad');
  keypad.addEventListener('pointerdown', (e) => {
    const btn = e.target.closest('button[data-k]');
    if (!btn) return;
    e.preventDefault();
    btn.classList.add('pressed');
    setTimeout(() => btn.classList.remove('pressed'), 80);
    press(btn.dataset.k);
  });
  keypad.addEventListener('contextmenu', (e) => e.preventDefault());

  document.addEventListener('keydown', (e) => {
    if (!game.running) return;
    if (/^[0-9]$/.test(e.key)) press(e.key);
    else if (e.key === 'Backspace') press('B');
    else if (e.key === 'Escape') press('C');
    else return;
    e.preventDefault();
  });

  // Stop the timer if the app is backgrounded mid-game? Zetamac keeps running; we do too.

  $('btn-start').addEventListener('click', startGame);
  $('btn-again').addEventListener('click', () => { writeForm(game.settings); startGame(); });
  $('btn-change').addEventListener('click', () => { show('screen-settings'); updateSettingsBest(); });
  $('btn-quit').addEventListener('click', quitGame);
  $('btn-history').addEventListener('click', () => { renderHistory(); show('screen-history'); });
  $('btn-history-back').addEventListener('click', () => { show('screen-settings'); updateSettingsBest(); });
  $('btn-history-clear').addEventListener('click', () => {
    if (confirm('Delete all saved scores?')) { saveHistory([]); renderHistory(); }
  });
  $('btn-defaults').addEventListener('click', () => {
    writeForm(DEFAULTS); store.set(SETTINGS_KEY, DEFAULTS);
    $('settings-error').textContent = ''; updateSettingsBest();
  });
  $('screen-settings').addEventListener('input', () => { $('settings-error').textContent = ''; updateSettingsBest(); });
  $('screen-settings').addEventListener('change', () => {
    const s = readForm();
    if (!validate(s)) store.set(SETTINGS_KEY, s);
  });

  writeForm({ ...DEFAULTS, ...store.get(SETTINGS_KEY, {}) });
  updateSettingsBest();

  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
  }
})();
