# SQL Lab: rules, structure and what's next

Two standalone pages that run SQLite in the browser:

- **`/sql-lab`**: the diagnostic. 14 tasks and 11 concept checks, ending in a skill report.
- **`/sql-practice`**: the problem set. Topics, each with a lesson, quick checks and problems from Easy to Hard. Solved problems stay available to solve again.

Both use the MySQL dialect, as LeetCode's database problems do.

## 1. How answers are checked

The aim is to check the way LeetCode and an interviewer would.

- **Column names and their order must match the prompt.** Letter case doesn't matter. An unnamed computed column such as `count(*)` fails.
- **A requested order needs an `ORDER BY` on the final query.** An answer without one fails even when the rows happen to come out sorted, because a database guarantees no order without it. An `ORDER BY` inside `OVER (…)` or a subquery doesn't count.
- **Rounding is checked.** Numbers are compared to 6 decimals, so leaving out `ROUND(…, 1)` fails.
- **Every prompt names every output column**, since names are checked.

## 2. Rules for writing a task

### 2.1 Every requirement in a prompt is backed by a test

If a prompt asks for something, at least one test must fail when an answer leaves it out. `scripts/sql-lab/mutate.js` enforces this: it breaks the reference solution one requirement at a time and fails unless some test returns a **wrong result** (an SQL error doesn't count).

Checked on every task automatically:

- **Remove the final `ORDER BY`.**
- **Flip each `ORDER BY` key.** So every sort key, including each tie-break, needs data where it matters.
- **Remove each `ROUND`.** So at least one expected value needs more decimals than the rounding allows.

Listed per task in `muts` as `[label, find, replace]`:

- each filter (dates, ranges), and each boundary (`>=` vs `>`, the edges of every CASE bucket)
- each tie-break inside a window's `ORDER BY`
- the choice of DENSE_RANK, RANK or ROW_NUMBER
- `DISTINCT`, the `PARTITION BY`, the join type, and what the query groups by

A tie-break chain has to end in one of two ways: a key the data really tests, or a stated guarantee ("no two reps tie on both"). A tie-break that matches the order rows come out in anyway can't be tested, so don't ask for it. Two common cases:

- **Alphabetical by name** is only testable when the query groups by an id whose order differs from the names' order.
- **"The earlier month"** matches the natural order of a GROUP BY on month. Ask for the later one, or break the tie on a second measure.

### 2.2 Each hidden test checks one thing and says what it is

- Each test's `name` is the concrete situation: "Two different managers both named Uma (ids 4 and 9), each with one report", not "managers who share a name".
- In the lab, each test has a `skill`. A failed test counts toward that skill only, so failing a grouping test doesn't mark joins as weak.

### 2.3 Known mistakes become wrong-answer checks

`scripts/sql-lab/probes.js` lists, per task, wrong answers that must fail on a named test and alternative correct answers that must pass. Mistakes seen in real attempts go in here. Examples:

- `NOT IN` with a NULL in the list
- `COALESCE(x, 0)` as a stand-in for a missing id
- grouping by a name instead of an id
- filtering to a year after `LAG` instead of before
- `GROUP BY bucket` with `MAX` and no ranking step

### 2.4 Practice problems go from easy to hard

Within a topic:

1. The lesson works one example and shows the output of each step.
2. Quick checks ask for a prediction before any writing.
3. Early problems are Easy: rank rows that need no totals, then fill in one step of a query that is otherwise written (`starter`).
4. Then full queries at Medium, adding one new element each (a join, a bucket built with CASE, a second tie-break, a second window).
5. The last problem is Hard and combines the topic with an earlier skill.

Hints come in three steps: the approach, the skeleton, the key line.

## 3. What the workspace does

Shared by both pages (`public/sql/core.js`):

- **Run** against the selected data; **Submit** against the sample data and every hidden test.
- **A hidden test that fails opens as a tab.** Selecting it shows the rows it adds, the full tables and the expected output, and Run then uses that data. Tests that haven't failed stay hidden until the task is solved or the solution is shown.
- **Custom data.** INSERT statements added on top of the sample data. The expected output comes from running the reference solution on the same data.
- **Show one step.** If the query has CTEs, a menu next to Run shows the rows any one of them produces.
- **Timer**, with a target on practice problems (Easy 10, Medium 15, Hard 25 minutes).
- **Solve again** (practice): clears the query, keeps the history of solves and the best time.
- **Export / Import progress** (practice), to move between devices.

## 4. Topics

| # | Topic | Covers | Status |
|---|---|---|---|
| 1 | Aggregate, then rank | Ranking aggregated rows inside groups; tie-break chains; ROW_NUMBER vs RANK vs DENSE_RANK; buckets built with CASE | Built: lesson, 4 checks, 8 problems |
| 2 | NULLs and anti-joins | `NOT IN` vs `NOT EXISTS` vs `LEFT JOIN … IS NULL`; filters in `ON` vs `WHERE`; what `COUNT` and `AVG` skip | Next |
| 3 | First and last events, date arithmetic | MIN/MAX per entity then join back; "N days after the first"; month and leap-year boundaries; filter before LAG | Next |
| 4 | Consecutive runs | date − ROW_NUMBER; removing duplicates first; streak length | Planned |
| 5 | Window details | Default frame and tied rows; ROWS vs RANGE; LAG/LEAD defaults | Planned |

Grouping by the key rather than the label, and finishing the output (names, order, rounding), are worked into every topic's tests instead of being a topic of their own.

Still to build after the topics: a view that shows how a window function partitions, orders and frames the rows; mixed review across topics; a re-test.

## 5. Files and checks

```
public/sql-lab.html          the diagnostic page
public/sql-practice.html     the practice page
public/sql/core.js           engine, answer checking, the task workspace
public/sql/core.css          shared styles
public/sql/lab-bank.js       diagnostic tasks and concept checks
public/sql/practice-bank.js  topics, lessons and problems
scripts/sql-lab/             the checks below
```

Run all four after changing a task or the engine:

```bash
npm install --no-save sql.js@1.10.3
```

```bash
node scripts/sql-lab/harness.js
```

```bash
node scripts/sql-lab/mutate.js
```

```bash
node scripts/sql-lab/macros.js
```

```bash
node scripts/sql-lab/e2e.js
```

- `harness.js`: every reference solution passes its tests; wrong answers are caught; alternative answers are accepted.
- `mutate.js`: every stated requirement has a test behind it (section 2.1).
- `macros.js`: the MySQL function rewriter, ORDER BY detection, CTE steps and result comparison.
- `e2e.js`: both pages in a headless browser (needs Playwright with Chromium).

Current state: 134 requirements across 22 tasks, all covered; 33 browser checks pass.
