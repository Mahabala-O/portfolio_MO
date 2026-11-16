// Usage: node mutate.js   (exits 1 if any stated requirement has no test behind it)
// For every task, breaks the reference solution one requirement at a time and checks that some test gives a wrong result.
// Standard breaks: remove the final ORDER BY, flip each ORDER BY key, remove each ROUND. Task-specific ones come from the task's `muts`.
const load = require('./load.js');

// Position of the outermost query's ORDER BY, or -1.
function finalOrderBy(core, sql) {
  let depth = 0, pos = -1;
  for (let i = 0; i < sql.length; i++) {
    const k = core.skipQuoted(sql, i); if (k >= 0) { i = k - 1; continue; }
    if (sql[i] === '(') depth++; else if (sql[i] === ')') depth--;
    else if (depth === 0 && /^order\s+by\b/i.test(sql.slice(i, i + 12)) && !/[A-Za-z0-9_]/.test(sql[i - 1] || ' ')) pos = i;
  }
  return pos;
}
function standard(core, t) {
  const out = [], ref = t.ref.trim().replace(/;\s*$/, '');
  if (t.ordered) {
    const p = finalOrderBy(core, ref);
    if (p < 0) throw new Error(`${t.id}: ordered task whose reference has no final ORDER BY`);
    const head = ref.slice(0, p), keys = core.splitArgs(ref.slice(p).replace(/^order\s+by/i, ''));
    out.push(['final ORDER BY is required', head.trimEnd() + ';']);
    keys.forEach((k, i) => {
      const flipped = /\sdesc$/i.test(k) ? k.replace(/\s+desc$/i, '') : /\sasc$/i.test(k) ? k.replace(/\s+asc$/i, ' DESC') : k + ' DESC';
      out.push([`ORDER BY key ${i + 1} (${k}) matters`, head + 'ORDER BY ' + keys.map((x, j) => (j === i ? flipped : x)).join(', ') + ';']);
    });
  }
  let from = 0, n = 0;
  for (;;) {
    const m = /\bROUND\s*\(/i.exec(ref.slice(from)); if (!m) break;
    const start = from + m.index, open = start + m[0].length - 1, close = core.closeParen(ref, open);
    const args = core.splitArgs(ref.slice(open + 1, close));
    out.push([`ROUND #${++n} (to ${args[1] || 0} decimals) is required`, ref.slice(0, start) + '(' + args[0] + ')' + ref.slice(close + 1) + ';']);
    from = open + 1;
  }
  return out;
}

load().then(({ core, tasks }) => {
  let total = 0; const gaps = [];
  for (const t of tasks) {
    const muts = standard(core, t);
    for (const [label, find, rep] of t.muts || []) {
      if (!t.ref.includes(find)) { gaps.push(`${t.id}: "${label}" does not apply (text not found in ref)`); continue; }
      muts.push([label, t.ref.split(find).join(rep)]);
    }
    for (const [label, sql] of muts) {
      total++;
      const res = core.casesOf(t).map(cs => [cs.name, core.judge(t, sql, cs.sql)]);
      const caught = res.filter(([, r]) => !r.ok && r.kind !== 'error');
      const errs = res.filter(([, r]) => r.kind === 'error');
      if (caught.length) console.log(`covered  ${t.id.padEnd(20)} ${label.padEnd(58)} <- ${caught[0][0]}`);
      else if (errs.length) gaps.push(`${t.id}: "${label}" only produced an SQL error (${errs[0][1].msg})`);
      else gaps.push(`${t.id}: "${label}" is not checked by any test`);
    }
  }
  console.log(`\n${total} requirements checked across ${tasks.length} tasks; ${gaps.length} problem${gaps.length === 1 ? '' : 's'}`);
  gaps.forEach(g => console.log('GAP  ' + g));
  process.exit(gaps.length ? 1 : 0);
});
