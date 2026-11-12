// Usage: node macros.js   Spot-checks the MySQL-to-SQLite function rewriter and the query-shape helpers in core.js.
const assert = require('assert');
require('./load.js')().then(({ core }) => {
  const db = core.makeDb({ setup: 'CREATE TABLE t (x)' });
  const one = sql => core.runQuery(db, sql).rows[0];
  assert.deepStrictEqual(one(`SELECT YEAR('2025-03-01 10:00:00'), MONTH('2025-03-01'), DAY('2025-03-09'), HOUR('2025-03-09 04:59:00'), QUARTER('2025-11-30'), CONCAT('Q', QUARTER('2025-05-01'))`), [2025, 3, 9, 4, 4, 'Q2']);
  assert.deepStrictEqual(one(`SELECT DATEDIFF('2025-03-01','2025-02-28'), DATEDIFF('2024-03-01','2024-02-28'), DATEDIFF('2025-01-01 23:00:00','2025-01-02 01:00:00')`), [1, 2, -1]);
  assert.deepStrictEqual(one(`SELECT DATE_ADD('2025-01-31', INTERVAL 1 DAY), DATE_SUB('2025-03-01', INTERVAL 1 day), DATE_ADD('2025-01-15', INTERVAL 2 MONTH), date_add('2025-01-01', interval 1 week), DATE_ADD('2025-01-01 10:00:00', INTERVAL 3 HOUR)`),
    ['2025-02-01', '2025-02-28', '2025-03-15', '2025-01-08', '2025-01-01 13:00:00']);
  assert.deepStrictEqual(one(`SELECT LAST_DAY('2024-02-10'), IF(1>2,'a','b'), LEFT('hello', 2), RIGHT('hello', 3), GREATEST(1,5,3), LEAST(4,2), DATE_FORMAT('2025-03-07','%Y-%m %b'), DAYNAME('2025-11-05')`),
    ['2024-02-29', 'b', 'he', 'llo', 5, 2, '2025-03 Mar', 'Wednesday']);
  assert.deepStrictEqual(one(`SELECT 'YEAR(x)' AS "quoted YEAR(", year(  '2020-01-01' ) -- YEAR(\n , IF(MONTH('2025-02-01') IN (1,2), CONCAT('Q', QUARTER(DATE_ADD('2025-03-31', INTERVAL 1 DAY))), 'x')`), ['YEAR(x)', 2020, 'Q2']);
  assert.throws(() => core.expandMacros(`SELECT YEAR('2025-01-01', 2)`), /takes 1 argument/);
  // ORDER BY inside OVER (...) or a subquery is not the query's own ORDER BY.
  assert.strictEqual(core.hasTopLevelOrderBy('SELECT ROW_NUMBER() OVER (ORDER BY x) FROM t'), false);
  assert.strictEqual(core.hasTopLevelOrderBy('SELECT * FROM (SELECT x FROM t ORDER BY x) s'), false);
  assert.strictEqual(core.hasTopLevelOrderBy("SELECT 'order by' FROM t -- order by x"), false);
  assert.strictEqual(core.hasTopLevelOrderBy('WITH a AS (SELECT x FROM t) SELECT x FROM a\nORDER  BY x'), true);
  // CTE steps.
  const steps = core.cteSteps('-- c\nWITH a AS (SELECT 1 AS x), `b` (y) AS (SELECT x + 1 FROM a /* ) */), c AS (SELECT \')\' AS z)\nSELECT * FROM b');
  assert.deepStrictEqual(steps.map(s => s.name), ['a', 'b', 'c']);
  assert.deepStrictEqual(core.runQuery(db, steps[1].sql).rows, [[2]]);
  assert.deepStrictEqual(core.cteSteps('SELECT 1'), []);
  // Comparison: names, order, rounding.
  const exp = { columns: ['a', 'b'], rows: [[1, 2.5]] };
  assert.strictEqual(core.compare({ columns: ['A', 'B'], rows: [[1, 2.5]] }, exp, true).ok, true);
  assert.strictEqual(core.compare({ columns: ['a', 'count(*)'], rows: [[1, 2.5]] }, exp, true).kind, 'columns');
  assert.strictEqual(core.compare({ columns: ['b', 'a'], rows: [[2.5, 1]] }, exp, true).kind, 'columns');
  assert.strictEqual(core.compare({ columns: ['a', 'b'], rows: [[1, 2.5004]] }, exp, true).kind, 'rows');
  assert.strictEqual(core.compare({ columns: ['a', 'b'], rows: [[1, 2.5000000001]] }, exp, true).ok, true);
  console.log('macros.js: all checks passed');
}).catch(e => { console.error(e); process.exit(1); });
