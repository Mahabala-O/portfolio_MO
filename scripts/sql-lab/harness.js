// Usage: node harness.js   (exits 1 on any problem)
// Checks that every reference solution passes all of its tests, that each wrong answer in probes.js is caught by the
// test meant to catch it, and that each alternative correct answer is accepted.
const load = require('./load.js');
const probes = require('./probes.js');
load().then(({ core, tasks }) => {
  let problems = 0;
  const bad = m => { problems++; console.log('!! ' + m); };
  for (const t of tasks) {
    const cases = core.casesOf(t);
    const run = sql => cases.map(cs => { try { return core.judge(t, sql, cs.sql); } catch (e) { return { ok: false, kind: 'error', msg: e.message }; } });
    const refRes = run(t.ref);
    refRes.forEach((r, i) => { if (!r.ok) bad(`${t.id}: reference fails "${cases[i].name}": ${r.msg}`); });
    if (process.argv.includes('-v')) cases.forEach((cs, i) => console.log(`   ${t.id} [${cs.name}] ${JSON.stringify(refRes[i].exp && refRes[i].exp.rows)}`));
    if (!t.hints || !t.hints.length || !t.explain || !t.prompt) bad(`${t.id}: missing hints, explain or prompt`);
    const p = probes[t.id] || {};
    for (const [label, sql] of Object.entries(p.good || {})) {
      const res = run(sql), f = res.findIndex(r => !r.ok);
      if (f >= 0) bad(`${t.id}: correct answer "${label}" rejected on "${cases[f].name}": ${res[f].msg}`);
    }
    for (const [label, [sql, expectCase]] of Object.entries(p.bad || {})) {
      const failed = cases.filter((c, i) => !run(sql)[i].ok).map(c => c.name);
      const caught = expectCase ? failed.some(n => n.startsWith(expectCase)) : failed.length > 0;
      if (!caught) bad(`${t.id}: wrong answer "${label}" not caught${expectCase ? ` by "${expectCase}…"` : ''} (failed: ${failed.join(' | ') || 'nothing'})`);
    }
    console.log(`ok ${t.where.padEnd(20)} ${t.id.padEnd(20)} ${cases.length} tests, ${Object.keys(p.good || {}).length} correct + ${Object.keys(p.bad || {}).length} wrong answers checked`);
  }
  for (const id of Object.keys(probes)) if (!tasks.some(t => t.id === id)) bad(`probes.js has answers for unknown task "${id}"`);
  console.log(`\nproblems: ${problems}`);
  process.exit(problems ? 1 : 0);
});
