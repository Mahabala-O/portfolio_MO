// Shared engine for /sql-lab (the diagnostic) and /sql-practice (the problem set).
// Runs SQLite through sql.js, rewrites MySQL functions, judges a query against a task's tests,
// and renders the task workspace (editor, test tabs, step runner, hints, solution).
// Also loads in Node (module.exports) so scripts/sql-lab/*.js can check the task banks.
(function (root) {
'use strict';

/* ---------- MySQL functions ---------- */
function parseD(v) {
  if (v === null || v === undefined) return null;
  const m = String(v).match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?/);
  if (!m) return null;
  return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], +(m[4] || 0), +(m[5] || 0), +(m[6] || 0)));
}
const pad = n => String(n).padStart(2, '0');
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
// Functions that return numbers or dates are rewritten into native SQLite expressions before a query runs
// (sql.js hands JS numbers back as floats, so CONCAT('Q', QUARTER(d)) would give 'Q2.0').
const int = e => `CAST(${e} AS INTEGER)`;
const UNITS = { DAY: ['days', 1], WEEK: ['days', 7], MONTH: ['months', 1], YEAR: ['years', 1], HOUR: ['hours', 1], MINUTE: ['minutes', 1], SECOND: ['seconds', 1] };
function shift(d, iv, sign) {
  const m = iv.match(/^\s*INTERVAL\s+([\s\S]+?)\s+(DAY|WEEK|MONTH|YEAR|HOUR|MINUTE|SECOND)S?\s*$/i);
  const [unit, mult] = m ? UNITS[m[2].toUpperCase()] : UNITS.DAY;
  const n = `(${sign}(${m ? m[1] : iv})${mult === 1 ? '' : ' * ' + mult})`;
  return `${['hours', 'minutes', 'seconds'].includes(unit) ? 'datetime' : 'date'}(${d}, ${n} || ' ${unit}')`;
}
const MACROS = {
  YEAR: [1, a => int(`strftime('%Y', ${a[0]})`)],
  MONTH: [1, a => int(`strftime('%m', ${a[0]})`)],
  DAY: [1, a => int(`strftime('%d', ${a[0]})`)],
  DAYOFMONTH: [1, a => int(`strftime('%d', ${a[0]})`)],
  HOUR: [1, a => int(`strftime('%H', ${a[0]})`)],
  MINUTE: [1, a => int(`strftime('%M', ${a[0]})`)],
  QUARTER: [1, a => `((${int(`strftime('%m', ${a[0]})`)} + 2) / 3)`],
  DAYOFWEEK: [1, a => `(${int(`strftime('%w', ${a[0]})`)} + 1)`],
  WEEKDAY: [1, a => `((${int(`strftime('%w', ${a[0]})`)} + 6) % 7)`],
  DATEDIFF: [2, a => int(`(julianday(date(${a[0]})) - julianday(date(${a[1]})))`)],
  DATE_ADD: [2, a => shift(a[0], a[1], '')],
  ADDDATE: [2, a => shift(a[0], a[1], '')],
  DATE_SUB: [2, a => shift(a[0], a[1], '-')],
  SUBDATE: [2, a => shift(a[0], a[1], '-')],
  LAST_DAY: [1, a => `date(${a[0]}, 'start of month', '+1 month', '-1 day')`],
  IF: [3, a => `iif(${a[0]}, ${a[1]}, ${a[2]})`],
  LEFT: [2, a => `substr(${a[0]}, 1, ${a[1]})`],
  RIGHT: [2, a => `substr(${a[0]}, -(${a[1]}))`],
  GREATEST: [0, a => `max(${a.join(', ')})`],
  LEAST: [0, a => `min(${a.join(', ')})`]
};
// Index just past a string literal, quoted identifier or comment starting at i, or -1.
function skipQuoted(s, i) {
  const c = s[i];
  if (c === "'" || c === '"' || c === '`') {
    let j = i + 1;
    while (j < s.length) { if (s[j] === c) { if (s[j + 1] === c) { j += 2; continue; } return j + 1; } j++; }
    return s.length;
  }
  if (c === '-' && s[i + 1] === '-') { const j = s.indexOf('\n', i); return j < 0 ? s.length : j; }
  if (c === '/' && s[i + 1] === '*') { const j = s.indexOf('*/', i + 2); return j < 0 ? s.length : j + 2; }
  return -1;
}
// Index of the ")" that closes the "(" at position p, or -1.
function closeParen(s, p) {
  let depth = 0;
  for (let j = p; j < s.length; j++) {
    const q = skipQuoted(s, j); if (q >= 0) { j = q - 1; continue; }
    if (s[j] === '(') depth++;
    else if (s[j] === ')' && --depth === 0) return j;
  }
  return -1;
}
function splitArgs(s) {
  const out = []; let depth = 0, start = 0;
  for (let i = 0; i < s.length; i++) {
    const k = skipQuoted(s, i); if (k >= 0) { i = k - 1; continue; }
    if (s[i] === '(') depth++; else if (s[i] === ')') depth--;
    else if (s[i] === ',' && depth === 0) { out.push(s.slice(start, i)); start = i + 1; }
  }
  out.push(s.slice(start));
  return out.map(a => a.trim());
}
function expandMacros(sql) {
  let out = '', i = 0;
  while (i < sql.length) {
    const k = skipQuoted(sql, i);
    if (k >= 0) { out += sql.slice(i, k); i = k; continue; }
    const w = /^[A-Za-z_][A-Za-z0-9_]*/.exec(sql.slice(i, i + 64));
    if (!w || (i > 0 && /[A-Za-z0-9_$]/.test(sql[i - 1]))) { out += sql[i++]; continue; }
    const name = w[0].toUpperCase(), macro = MACROS[name];
    let p = i + w[0].length;
    while (/\s/.test(sql[p] || '')) p++;
    if (!macro || sql[p] !== '(' || /\.\s*$/.test(out)) { out += w[0]; i += w[0].length; continue; }
    const j = closeParen(sql, p);
    if (j < 0) { out += sql.slice(i); break; }
    const inner = sql.slice(p + 1, j);
    const args = inner.trim() ? splitArgs(inner).map(expandMacros) : [];
    if (macro[0] && args.length !== macro[0]) throw new Error(`${name}() takes ${macro[0]} argument${macro[0] > 1 ? 's' : ''}, got ${args.length}.`);
    out += macro[1](args);
    i = j + 1;
  }
  return out;
}
// String-returning helpers can stay as JavaScript functions.
function addCompat(db) {
  const f = (name, fn) => db.create_function(name, fn);
  f('DAYNAME', v => { const d = parseD(v); return d ? DAYS[d.getUTCDay()] : null; });
  f('MONTHNAME', v => { const d = parseD(v); return d ? MONTHS[d.getUTCMonth()] : null; });
  f('DATE_FORMAT', (v, fmt) => { const d = parseD(v); if (!d || fmt === null) return null;
    const map = { Y: d.getUTCFullYear(), y: String(d.getUTCFullYear()).slice(2), m: pad(d.getUTCMonth() + 1), c: d.getUTCMonth() + 1,
      d: pad(d.getUTCDate()), e: d.getUTCDate(), M: MONTHS[d.getUTCMonth()], b: MONTHS[d.getUTCMonth()].slice(0, 3),
      W: DAYS[d.getUTCDay()], a: DAYS[d.getUTCDay()].slice(0, 3), H: pad(d.getUTCHours()), i: pad(d.getUTCMinutes()), s: pad(d.getUTCSeconds()), '%': '%' };
    return String(fmt).replace(/%(.)/g, (m, k) => (k in map ? map[k] : m)); });
}

/* ---------- Reading the shape of a query ---------- */
// The query with strings, comments and everything inside parentheses removed.
function topLevel(sql) {
  let out = '', depth = 0;
  for (let i = 0; i < sql.length; i++) {
    const k = skipQuoted(sql, i); if (k >= 0) { i = k - 1; out += ' '; continue; }
    if (sql[i] === '(') { depth++; continue; }
    if (sql[i] === ')') { depth--; out += ' '; continue; }
    if (depth === 0) out += sql[i];
  }
  return out;
}
// True when the outermost query has its own ORDER BY (one inside OVER (...) or a subquery does not count).
const hasTopLevelOrderBy = sql => /\border\s+by\b/i.test(topLevel(sql));
function skipSpace(s, i) {
  for (;;) {
    while (/\s/.test(s[i] || '')) i++;
    const k = (s[i] === '-' && s[i + 1] === '-') || (s[i] === '/' && s[i + 1] === '*') ? skipQuoted(s, i) : -1;
    if (k < 0) return i;
    i = k;
  }
}
// The CTEs of a WITH query, in order. Each has a query that shows that step's rows.
function cteSteps(sql) {
  const steps = [];
  let i = skipSpace(sql, 0);
  if (!/^with\b/i.test(sql.slice(i, i + 5))) return steps;
  i = skipSpace(sql, i + 4);
  if (/^recursive\b/i.test(sql.slice(i, i + 10))) i = skipSpace(sql, i + 9);
  for (;;) {
    const m = /^(`[^`]+`|"[^"]+"|[A-Za-z_][A-Za-z0-9_]*)/.exec(sql.slice(i));
    if (!m) break;
    const name = m[1];
    i = skipSpace(sql, i + name.length);
    if (sql[i] === '(') { const c = closeParen(sql, i); if (c < 0) break; i = skipSpace(sql, c + 1); }
    if (!/^as\b/i.test(sql.slice(i, i + 3))) break;
    i = skipSpace(sql, i + 2);
    const mat = /^(not\s+)?materialized\b/i.exec(sql.slice(i));
    if (mat) i = skipSpace(sql, i + mat[0].length);
    if (sql[i] !== '(') break;
    const end = closeParen(sql, i);
    if (end < 0) break;
    steps.push({ name: name.replace(/^[`"]|[`"]$/g, ''), sql: sql.slice(0, end + 1) + '\nSELECT * FROM ' + name });
    i = skipSpace(sql, end + 1);
    if (sql[i] !== ',') break;
    i = skipSpace(sql, i + 1);
  }
  return steps;
}

/* ---------- Running and judging ---------- */
let SQL = null;
function makeDb(task, extra) {
  const db = new SQL.Database();
  addCompat(db);
  db.exec(task.setup);
  if (extra) db.exec(extra);
  return db;
}
function runQuery(db, sql) {
  let last = null;
  for (const st of db.iterateStatements(expandMacros(sql))) {
    const columns = st.getColumnNames();
    const rows = [];
    while (st.step()) rows.push(st.get());
    if (columns.length) last = { columns, rows };
  }
  if (!last) throw new Error('No result set. Write a SELECT (or WITH … SELECT) query.');
  return last;
}
// Numbers are compared to 6 decimals: enough to absorb float noise, tight enough that a missing ROUND shows.
function norm(v) {
  if (v === null || v === undefined) return null;
  if (typeof v === 'number') return Math.round(v * 1e6) / 1e6;
  if (typeof v === 'string' && /^-?\d+(\.\d+)?$/.test(v.trim())) return Math.round(Number(v) * 1e6) / 1e6;
  return String(v);
}
const rowKey = r => JSON.stringify(r.map(norm));
// Column names (any letter case) and their order must match, as on LeetCode. Returns { ok, kind, msg, bad }.
function compare(user, exp, ordered) {
  const lc = a => a.map(c => String(c).toLowerCase());
  const ue = lc(user.columns), ee = lc(exp.columns);
  if (ue.length !== ee.length)
    return { ok: false, kind: 'columns', msg: `Expected ${ee.length} column${ee.length > 1 ? 's' : ''} (${exp.columns.join(', ')}), got ${ue.length} (${user.columns.join(', ')}).` };
  if (ue.join('\u0001') !== ee.join('\u0001')) {
    const sameSet = [...ue].sort().join('\u0001') === [...ee].sort().join('\u0001');
    return { ok: false, kind: 'columns', msg: sameSet
      ? `Right columns, wrong order. Expected: ${exp.columns.join(', ')}.`
      : `Column names must match the prompt. Expected: ${exp.columns.join(', ')}. Yours: ${user.columns.join(', ')}. Name computed columns with AS.` };
  }
  const ek = exp.rows.map(rowKey), uk = user.rows.map(rowKey);
  const bad = new Set();
  if (ordered) {
    uk.forEach((k, i) => { if (k !== ek[i]) bad.add(i); });
  } else {
    const pool = new Map();
    ek.forEach(k => pool.set(k, (pool.get(k) || 0) + 1));
    uk.forEach((k, i) => { const n = pool.get(k) || 0; if (n) pool.set(k, n - 1); else bad.add(i); });
  }
  if (uk.length !== ek.length) return { ok: false, kind: 'rows', msg: `Expected ${ek.length} row${ek.length === 1 ? '' : 's'}, got ${uk.length}.`, bad };
  if (bad.size) {
    if (ordered && [...uk].sort().join('|') === [...ek].sort().join('|'))
      return { ok: false, kind: 'order', msg: 'Right rows, wrong order. Check your ORDER BY against the prompt.', bad };
    return { ok: false, kind: 'rows', msg: `${bad.size} row${bad.size === 1 ? '' : 's'} differ from the expected output (highlighted).`, bad };
  }
  return { ok: true };
}
function expectedFor(task, extra) {
  const db = makeDb(task, extra);
  try { return runQuery(db, task.ref); } finally { db.close(); }
}
function userFor(task, extra, sql) {
  const db = makeDb(task, extra);
  try { return runQuery(db, sql); } finally { db.close(); }
}
const NO_ORDER_BY = 'The prompt asks for a specific order, but your final SELECT has no ORDER BY. Without one, a database may return rows in any order, even if they happen to look sorted here.';
// One query against one data set. Returns { ok, kind, msg, bad, got, exp }; kind is error | columns | rows | order.
function judge(task, sql, extra) {
  const exp = expectedFor(task, extra);
  let got;
  try { got = userFor(task, extra, sql); } catch (e) { return { ok: false, kind: 'error', msg: e.message, exp }; }
  const c = compare(got, exp, task.ordered);
  if (c.ok && task.ordered && !hasTopLevelOrderBy(sql)) return { ok: false, kind: 'order', msg: NO_ORDER_BY, got, exp, bad: new Set() };
  return Object.assign(c, { got, exp });
}
// The sample data plus every hidden test.
const casesOf = task => [{ name: 'Sample data', sql: null, skill: (task.skills || [])[0] }].concat(task.hidden || []);

/* ---------- Rendering ---------- */
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const inl = s => esc(s).replace(/`([^`]+)`/g, '<code>$1</code>');
function gridHTML(res, bad) {
  if (!res) return '';
  const head = '<tr>' + res.columns.map(c => `<th>${esc(c)}</th>`).join('') + '</tr>';
  const body = res.rows.map((r, i) => `<tr${bad && bad.has(i) ? ' class="bad"' : ''}>` + r.map(v =>
    v === null ? '<td class="null">null</td>' : `<td${typeof v === 'number' ? ' class="num"' : ''}>${esc(typeof v === 'number' ? +v.toFixed(6) : v)}</td>`).join('') + '</tr>').join('');
  return `<div class="scroll"><table class="grid"><thead>${head}</thead><tbody>${body}</tbody></table>${res.rows.length ? '' : '<div class="empty">(no rows)</div>'}</div>`;
}
function tablesHTML(task, extra) {
  const db = makeDb(task, extra);
  try {
    const names = runQuery(db, "SELECT name FROM sqlite_master WHERE type='table' ORDER BY rowid").rows.map(r => r[0]);
    return names.map(n => {
      const cols = runQuery(db, `PRAGMA table_info(${n})`).rows.map(r => `${r[1]} ${String(r[2]).toLowerCase()}`);
      return `<div class="tbl"><div class="cap">${esc(n)} <span>(${esc(cols.join(', '))})</span></div>${gridHTML(runQuery(db, `SELECT * FROM ${n}`))}</div>`;
    }).join('');
  } finally { db.close(); }
}
const STATUS = { untouched: 'Not started', attempted: 'Attempted', passed: 'Solved', gaveup: 'Saw solution' };
const isDone = st => st.status === 'passed' || st.status === 'gaveup';
const clock = ms => { const s = Math.floor(ms / 1000); return Math.floor(s / 60) + ':' + pad(s % 60); };
const fmtMin = ms => (ms < 60000 ? '< 1 min' : Math.round(ms / 60000) + ' min');
function blankState() {
  return { sql: '', status: 'untouched', runs: 0, submits: 0, hints: 0, ms: 0, feel: null, failedCases: [], opened: [], custom: '', solvedSubmits: null, lastSubmitted: null };
}

/* ---------- The task workspace ----------
   mount(el, task, st, o): st is the saved state for this task (see blankState).
   o: { save(), onStatus(), meta (html), nextLabel, onNext(), targetMin, onReset() } */
function mount(el, task, st, o) {
  Object.keys(blankState()).forEach(k => { if (st[k] === undefined) st[k] = blankState()[k]; });
  if (!st.sql && task.starter && st.status === 'untouched') st.sql = task.starter;
  const hidden = task.hidden || [];
  let sel = 'sample'; // 'sample' | index into hidden | 'custom'
  let customErr = null;

  el.innerHTML = `<div class="card">
    <div class="meta">${o.meta || ''}</div>
    <h2>${esc(task.title)}</h2>
    <div class="prompt">${task.prompt}</div>
    <div class="casebar" id="casebar"></div>
    <div class="casepanel" id="casepanel"></div>
    <div class="editor-wrap">
      <div class="editor-bar"><span>query.sql</span><span><span class="timer" id="timer"></span> · <span id="tstat"></span></span></div>
      <textarea class="sql" id="sql" spellcheck="false" autocapitalize="off" autocomplete="off" autocorrect="off" aria-label="Your SQL query" placeholder="-- Write your query here"></textarea>
    </div>
    <div class="actions">
      <button class="btn" type="button" id="run">Run <span class="k">⌘↵</span></button>
      <select class="stepsel" id="step" aria-label="Which step of the query to show" hidden></select>
      <button class="btn primary" type="button" id="submit">Submit <span class="k">⇧⌘↵</span></button>
      <button class="btn" type="button" id="hint"></button>
      <span class="spacer"></span>
      <button class="btn" type="button" id="giveup">Show solution</button>
      ${o.onReset ? '<button class="btn" type="button" id="again" hidden>Solve again</button>' : ''}
      ${o.onNext ? `<button class="btn" type="button" id="next">${esc(o.nextLabel || 'Next →')}</button>` : ''}
    </div>
    <div id="hints" class="out"></div>
    <div id="out" class="out" aria-live="polite"></div>
    <div id="after" class="out"></div>
  </div>`;
  const $ = id => el.querySelector('#' + id);
  const ta = $('sql'), out = $('out'), stepSel = $('step');
  ta.value = st.sql || '';

  const extra = () => (sel === 'sample' ? null : sel === 'custom' ? (st.custom || null) : hidden[sel].sql);
  const caseName = () => (sel === 'sample' ? 'the sample data' : sel === 'custom' ? 'your custom data' : `the test "${hidden[sel].name}"`);
  const visible = i => isDone(st) || st.opened.includes(hidden[i].name);

  function renderCases() {
    const tab = (id, label, cls) => `<button type="button" class="casetab ${cls || ''}" data-case="${id}" aria-pressed="${String(sel) === String(id)}" title="${esc(label)}">${esc(label)}</button>`;
    let h = '<span class="label">Run against</span>' + tab('sample', 'Sample data');
    hidden.forEach((c, i) => { if (visible(i)) h += tab(i, c.name, st.failedCases.includes(c.name) && st.status !== 'passed' ? 'failed' : ''); });
    h += tab('custom', 'Custom data');
    const locked = hidden.filter((c, i) => !visible(i)).length;
    if (locked) h += `<span class="muted" style="font-size:12.5px">+ ${locked} hidden test${locked > 1 ? 's' : ''} (a test opens here once it fails)</span>`;
    $('casebar').innerHTML = h;
    let p = '';
    if (sel === 'custom') {
      p += `<h3>Your rows</h3><p class="note">Write INSERT statements. They are added on top of the sample data, and the expected output is worked out for you.</p>
        <textarea class="custom" id="custom" spellcheck="false" autocapitalize="off" autocomplete="off" autocorrect="off" aria-label="Custom rows" placeholder="INSERT INTO table_name VALUES (...);">${esc(st.custom || '')}</textarea>
        <div class="actions"><button class="btn" type="button" id="apply">Apply rows</button></div>`;
    } else if (sel !== 'sample') {
      p += `<h3>Rows this test adds</h3><pre class="solution">${esc(hidden[sel].sql.trim())}</pre>`;
    }
    try {
      customErr = null;
      const t = tablesHTML(task, extra()), e = gridHTML(expectedFor(task, extra()));
      p += `<h3>Tables${sel === 'sample' ? ' (sample data)' : ''}</h3><div class="tables">${t}</div><h3>Expected output</h3><div class="tables"><div class="tbl">${e}</div></div>`;
    } catch (err) {
      customErr = err.message;
      p += `<div class="msg fail"><b>Those rows didn't load.</b> ${esc(err.message)}</div>`;
    }
    $('casepanel').innerHTML = p;
  }
  $('casebar').addEventListener('click', e => {
    const b = e.target.closest('[data-case]'); if (!b) return;
    sel = /^\d+$/.test(b.dataset.case) ? +b.dataset.case : b.dataset.case;
    renderCases(); out.innerHTML = '';
  });
  $('casepanel').addEventListener('click', e => {
    if (e.target.id !== 'apply') return;
    st.custom = $('custom').value; o.save(); renderCases();
  });

  function renderSteps() {
    const steps = cteSteps(ta.value), keep = stepSel.value;
    stepSel.hidden = !steps.length;
    stepSel.innerHTML = '<option value="">Show: final result</option>' + steps.map(s => `<option value="${esc(s.name)}">Show step: ${esc(s.name)}</option>`).join('');
    if (steps.some(s => s.name === keep)) stepSel.value = keep;
  }
  let stepTimer = null;
  ta.addEventListener('input', () => { st.sql = ta.value; o.save(); clearTimeout(stepTimer); stepTimer = setTimeout(renderSteps, 300); });
  ta.addEventListener('keydown', e => {
    if (e.key === 'Tab' && !e.shiftKey) { e.preventDefault(); const s = ta.selectionStart; ta.setRangeText('  ', s, ta.selectionEnd, 'end'); st.sql = ta.value; }
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); e.shiftKey ? submit() : run(); }
  });

  const hintBtn = $('hint');
  function renderHints() {
    $('hints').innerHTML = task.hints.slice(0, st.hints).map((h, k) => `<div class="hint"><b>Hint ${k + 1}.</b> ${h}</div>`).join('');
    const left = task.hints.length - st.hints;
    hintBtn.textContent = left ? `Hint (${left} left)` : 'No hints left';
    hintBtn.disabled = !left;
  }
  function renderStat() {
    $('tstat').textContent = `${STATUS[st.status]}${st.submits ? ` · ${st.submits} submit${st.submits > 1 ? 's' : ''}` : ''}${st.hints ? ` · ${st.hints} hint${st.hints > 1 ? 's' : ''}` : ''}`;
    const again = $('again'); if (again) again.hidden = !isDone(st);
  }
  function renderAfter() {
    const a = $('after');
    if (!isDone(st)) { a.innerHTML = ''; return; }
    a.innerHTML = `<div><div class="label">Reference solution</div><pre class="solution">${esc(task.ref)}</pre><p class="note">${task.explain}</p></div>
      <div class="feel"><span class="muted">How did this one feel?</span>${['Easy', 'OK', 'Hard'].map(f => `<button type="button" data-feel="${f}" aria-pressed="${st.feel === f}">${f}</button>`).join('')}</div>`;
    a.querySelectorAll('[data-feel]').forEach(b => b.addEventListener('click', () => { st.feel = b.dataset.feel; o.save(); renderAfter(); }));
  }
  function changed() { o.save(); renderStat(); renderCases(); renderAfter(); if (o.onStatus) o.onStatus(); }

  /* Timer: counts while the tab is visible and the task is not finished. */
  let last = Date.now();
  function tick() {
    const now = Date.now();
    if (!document.hidden && !isDone(st)) st.ms += Math.min(now - last, 60000);
    last = now;
    const t = $('timer'); if (!t) return;
    t.textContent = clock(st.ms) + (o.targetMin ? ` / ${o.targetMin}:00` : '');
    t.classList.toggle('over', !!o.targetMin && st.ms > o.targetMin * 60000);
  }
  const iv = setInterval(tick, 1000);
  let ticks = 0;
  const saver = setInterval(() => { if (++ticks % 5 === 0) o.save(); }, 1000);
  const onVis = () => { last = Date.now(); };
  document.addEventListener('visibilitychange', onVis);

  const pair = (got, exp, bad) => `<div class="pair"><div><div class="label">Your output</div>${gridHTML(got, bad)}</div><div><div class="label">Expected</div>${gridHTML(exp)}</div></div>`;
  function run() {
    tick(); st.runs++; o.save();
    if (sel === 'custom' && customErr) { out.innerHTML = `<div class="msg fail"><b>Fix the custom rows first.</b> ${esc(customErr)}</div>`; return; }
    const step = stepSel.value && cteSteps(ta.value).find(s => s.name === stepSel.value);
    if (step) {
      try {
        const db = makeDb(task, extra());
        let res; try { res = runQuery(db, step.sql); } finally { db.close(); }
        out.innerHTML = `<div class="msg"><b>Step ${esc(step.name)}</b> on ${esc(caseName())}: ${res.rows.length} row${res.rows.length === 1 ? '' : 's'}. This is what the next step receives.</div>${gridHTML(res)}`;
      } catch (err) { out.innerHTML = `<div class="msg fail"><b>SQL error in step ${esc(step.name)}.</b> ${esc(err.message)}</div>`; }
      return;
    }
    let r;
    try { r = judge(task, ta.value, extra()); } catch (err) { out.innerHTML = `<div class="msg fail">${esc(err.message)}</div>`; return; }
    if (r.kind === 'error') { out.innerHTML = `<div class="msg fail"><b>SQL error.</b> ${esc(r.msg)}</div>`; return; }
    out.innerHTML = `<div class="msg ${r.ok ? 'pass' : 'warn'}">${r.ok ? `<b>Matches the expected output for ${esc(caseName())}.</b>${sel === 'sample' ? ' Submit to run the hidden tests.' : ''}` : `<b>Doesn't match yet.</b> ${esc(r.msg)}`}</div>${pair(r.got, r.exp, r.bad)}`;
  }
  function submit() {
    tick();
    const sql = ta.value;
    if (!sql.trim()) { out.innerHTML = '<div class="msg warn">Write a query first.</div>'; return; }
    st.submits++;
    const results = casesOf(task).map(cs => { let r; try { r = judge(task, sql, cs.sql); } catch (err) { r = { ok: false, kind: 'error', msg: err.message }; } return { cs, r }; });
    const passed = results.every(x => x.r.ok);
    results.forEach(x => {
      if (x.r.ok || !x.cs.sql) return;
      if (!st.failedCases.includes(x.cs.name)) st.failedCases.push(x.cs.name);
      if (!st.opened.includes(x.cs.name)) st.opened.push(x.cs.name);
    });
    if (passed && st.status !== 'passed' && st.status !== 'gaveup') { st.status = 'passed'; st.solvedSubmits = st.submits; if (o.onSolved) o.onSolved(); }
    else if (!passed && st.status === 'untouched') st.status = 'attempted';
    st.lastSubmitted = sql;
    const first = results.find(x => !x.r.ok);
    let h = `<div class="msg ${passed ? 'pass' : 'fail'}"><b>${passed ? `All ${results.length} tests passed.` : `${results.filter(x => x.r.ok).length} of ${results.length} tests passed.`}</b>${!passed && results.some(x => !x.r.ok && x.cs.sql) ? ' Each failed test is now a tab above: pick it and use Run to work on it.' : ''}</div>`;
    h += '<div class="cases">' + results.map(x => `<div class="case"><span class="dot ${x.r.ok ? 'pass' : 'fail'}"></span><span>${esc(x.cs.name)}${x.r.ok ? '' : ` — <span class="muted">${esc(x.r.kind === 'error' ? 'SQL error: ' + x.r.msg : x.r.msg)}</span>`}</span></div>`).join('') + '</div>';
    if (first && first.r.got) h += `${first.cs.sql ? `<div><div class="label">Rows added by "${esc(first.cs.name)}"</div><pre class="solution">${esc(first.cs.sql.trim())}</pre></div>` : ''}${pair(first.r.got, first.r.exp, first.r.bad)}`;
    changed();
    out.innerHTML = h;
  }
  $('run').addEventListener('click', run);
  $('submit').addEventListener('click', submit);
  hintBtn.addEventListener('click', () => { if (st.hints < task.hints.length) { st.hints++; if (st.status === 'untouched') st.status = 'attempted'; o.save(); renderHints(); renderStat(); if (o.onStatus) o.onStatus(); } });
  $('giveup').addEventListener('click', () => {
    if (!isDone(st) && !confirm('Show the reference solution? This will be recorded as not solved.')) return;
    tick();
    if (!isDone(st)) st.status = 'gaveup';
    changed();
    $('after').scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
  if ($('again')) $('again').addEventListener('click', () => { if (confirm('Clear your query and solve this one again? Earlier solves stay in your history.')) o.onReset(); });
  if ($('next')) $('next').addEventListener('click', o.onNext);

  renderCases(); renderSteps(); renderHints(); renderStat(); renderAfter(); tick();
  return { destroy() { clearInterval(iv); clearInterval(saver); clearTimeout(stepTimer); document.removeEventListener('visibilitychange', onVis); tick(); o.save(); } };
}

/* ---------- Loading the engine in a browser ---------- */
const CDN = 'https://cdn.jsdelivr.net/npm/sql.js@1.10.3/dist/';
function load() {
  if (typeof root.initSqlJs !== 'function') return Promise.reject(new Error('cdn.jsdelivr.net may be blocked on this network'));
  return root.initSqlJs({ locateFile: f => CDN + f }).then(S => {
    SQL = S;
    const db = new SQL.Database();
    const v = db.exec('SELECT sqlite_version()')[0].values[0][0];
    db.close();
    return v;
  });
}

const api = { load, ready: () => !!SQL, setSQL: S => { SQL = S; }, expandMacros, addCompat, splitArgs, closeParen, skipQuoted, hasTopLevelOrderBy, cteSteps,
  makeDb, runQuery, compare, judge, casesOf, expectedFor, userFor, esc, inl, gridHTML, tablesHTML, mount, blankState, isDone, STATUS, clock, fmtMin };
if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.SQLLab = api;
})(typeof window !== 'undefined' ? window : globalThis);
