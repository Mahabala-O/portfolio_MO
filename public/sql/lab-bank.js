// Tasks and concept checks for the diagnostic (sql-lab.html).
// Each task: setup (schema + sample rows), ref (the reference query that defines the right answer), ordered (row order matters),
// hidden (tests: extra SQL run on top of setup, each tagged with the skill it checks), and muts: [label, find, replace] edits that
// each break one stated requirement of ref. The mutate.js check fails unless some test catches every one of them.
(function (root) {
const SKILLS = {
  joins:   'Joins, self-joins & anti-joins',
  agg:     'GROUP BY, HAVING & conditional aggregation',
  sub:     'Subqueries & CTEs',
  nulls:   'NULLs & edge cases',
  rank:    'Window: ROW_NUMBER / RANK / DENSE_RANK',
  winagg:  'Window: aggregates with PARTITION BY',
  laglead: 'Window: LAG / LEAD',
  frames:  'Window: frames, running & moving calcs',
  dates:   'Dates & time',
  islands: 'Consecutive runs (gaps & islands)'
};

const TASKS = [
{
  id: 'never-ordered', title: 'Customers who never ordered', level: 'Warm-up', skills: ['joins', 'nulls'],
  prompt: `<p>Return the <code>name</code> of every customer who has never placed an order, in any order.</p>`,
  setup: `
CREATE TABLE customers (id INTEGER PRIMARY KEY, name TEXT);
CREATE TABLE orders (id INTEGER PRIMARY KEY, customer_id INTEGER, amount INTEGER);
INSERT INTO customers VALUES (1,'Ana'),(2,'Ben'),(3,'Cai'),(4,'Dee'),(5,'Eli');
INSERT INTO orders VALUES (1,1,30),(2,3,25),(3,1,40),(4,5,12);`,
  ref: `SELECT c.name
FROM customers c
LEFT JOIN orders o ON o.customer_id = c.id
WHERE o.id IS NULL;`,
  hidden: [
    { name: 'A guest order with customer_id NULL', skill: 'nulls', sql: `INSERT INTO orders VALUES (5, NULL, 18);` },
    { name: 'A guest order with customer_id NULL, and a customer whose id is 0 (Zed) who never ordered', skill: 'nulls', sql: `INSERT INTO customers VALUES (0,'Zed'); INSERT INTO orders VALUES (5, NULL, 18);` },
    { name: 'Ben and Dee order too, so every customer has ordered and the result is empty', skill: 'joins', sql: `INSERT INTO orders VALUES (6,2,10),(7,4,5);` }
  ],
  muts: [],
  hints: [
    'Two common shapes: LEFT JOIN orders and keep rows where the order side is NULL, or WHERE NOT EXISTS (…).',
    '<code>NOT IN (SELECT customer_id …)</code> looks right but returns nothing if the subquery contains a single NULL, because <code>x NOT IN (…, NULL)</code> is never true.'
  ],
  explain: 'The anti-join. LEFT JOIN + IS NULL and NOT EXISTS are NULL-safe; NOT IN is not, which is what the guest-checkout test catches.'
},
{
  id: 'dept-high-earners', title: 'High earners by department', level: 'Easy', skills: ['agg'],
  prompt: `<p>For each department, report <code>dept</code>, <code>headcount</code>, <code>high_earners</code> (employees with salary of at least 100000) and <code>pct_high</code>: the percentage of the department that are high earners, rounded to 1 decimal.</p><p>Order by <code>dept</code>.</p>`,
  setup: `
CREATE TABLE employees (id INTEGER PRIMARY KEY, name TEXT, dept TEXT, salary INTEGER);
INSERT INTO employees VALUES
 (1,'Ava','Eng',120000),(2,'Bo','Eng',95000),(3,'Cy','Eng',100000),(4,'Di','Eng',130000),
 (5,'Ed','Sales',60000),(6,'Fay','Sales',105000),(7,'Gus','Sales',70000),
 (8,'Hal','Ops',50000),(9,'Ida','Ops',55000);`,
  ref: `SELECT dept,
       COUNT(*) AS headcount,
       SUM(CASE WHEN salary >= 100000 THEN 1 ELSE 0 END) AS high_earners,
       ROUND(100.0 * SUM(CASE WHEN salary >= 100000 THEN 1 ELSE 0 END) / COUNT(*), 1) AS pct_high
FROM employees
GROUP BY dept
ORDER BY dept;`,
  ordered: true,
  hidden: [
    { name: 'Legal has one employee, Jo, on 150000 (100% high earners)', skill: 'agg', sql: `INSERT INTO employees VALUES (10,'Jo','Legal',150000);` },
    { name: 'Kim joins Ops on 99999, just under the line', skill: 'agg', sql: `INSERT INTO employees VALUES (11,'Kim','Ops',99999);` }
  ],
  muts: [['salary of at least 100000 (>=, not >)', 'salary >= 100000', 'salary > 100000']],
  hints: [
    'Conditional aggregation: <code>SUM(CASE WHEN … THEN 1 ELSE 0 END)</code> counts the rows that match inside each group.',
    'If Sales shows 33.0 instead of 33.3, that is integer division. Multiply by <code>100.0</code> before dividing.'
  ],
  explain: 'SUM(CASE …) inside GROUP BY lets one pass compute several counts per group. The 100.0 forces decimal division.'
},
{
  id: 'bought-all', title: 'Customers who bought every product', level: 'Medium', skills: ['agg', 'sub'],
  prompt: `<p>Return the <code>customer_id</code> of every customer who has bought <em>every</em> product in the <code>product</code> table, in any order.</p>`,
  setup: `
CREATE TABLE product (product_key INTEGER PRIMARY KEY);
CREATE TABLE customer_purchases (customer_id INTEGER, product_key INTEGER);
INSERT INTO product VALUES (5),(6),(7);
INSERT INTO customer_purchases VALUES (1,5),(1,6),(1,7),(2,5),(2,6),(3,6),(3,7),(3,5);`,
  ref: `SELECT customer_id
FROM customer_purchases
GROUP BY customer_id
HAVING COUNT(DISTINCT product_key) = (SELECT COUNT(*) FROM product);`,
  hidden: [
    { name: 'Customer 4 bought product 5 twice and product 6 once, but never product 7', skill: 'agg', sql: `INSERT INTO customer_purchases VALUES (4,5),(4,5),(4,6);` },
    { name: 'Product 8 is added and nobody has bought it, so the result is empty', skill: 'sub', sql: `INSERT INTO product VALUES (8);` }
  ],
  muts: [['count each product once', 'COUNT(DISTINCT product_key)', 'COUNT(product_key)'], ['compare with the number of products in the table', '(SELECT COUNT(*) FROM product)', '3']],
  hints: [
    'Group purchases by customer and compare how many products each customer covers with how many products exist.',
    'Count <code>DISTINCT product_key</code>, and get the total from a subquery rather than typing 3.'
  ],
  explain: '"Has all of X" is usually COUNT(DISTINCT …) = (SELECT COUNT(*) …) in HAVING. DISTINCT handles repeat purchases; the subquery keeps it correct when the catalog changes.'
},
{
  id: 'above-dept-avg', title: 'Paid above the department average', level: 'Medium', skills: ['winagg', 'sub'],
  prompt: `<p>Return <code>name</code>, <code>dept</code>, <code>salary</code> and <code>dept_avg</code> (the department's average salary, rounded to 2 decimals) for every employee paid <em>strictly more</em> than their department's average.</p><p>Order by <code>dept</code>, then <code>salary</code> descending.</p>`,
  setup: `
CREATE TABLE employees (id INTEGER PRIMARY KEY, name TEXT, dept TEXT, salary INTEGER);
INSERT INTO employees VALUES
 (1,'Ava','Eng',120000),(2,'Bo','Eng',95000),(3,'Cy','Eng',100000),(4,'Di','Eng',130000),
 (5,'Ed','Sales',60000),(6,'Fay','Sales',105000),(7,'Gus','Sales',70000),
 (8,'Hal','Ops',50000),(9,'Ida','Ops',55000);`,
  ref: `WITH e AS (
  SELECT name, dept, salary, AVG(salary) OVER (PARTITION BY dept) AS dept_avg
  FROM employees
)
SELECT name, dept, salary, ROUND(dept_avg, 2) AS dept_avg
FROM e
WHERE salary > dept_avg
ORDER BY dept, salary DESC;`,
  ordered: true,
  hidden: [
    { name: 'Legal: Jo and Kai both earn 90000, so neither is above the average', skill: 'winagg', sql: `INSERT INTO employees VALUES (10,'Jo','Legal',90000),(11,'Kai','Legal',90000);` },
    { name: 'HR has one employee, Lu, who cannot be above their own average', skill: 'winagg', sql: `INSERT INTO employees VALUES (12,'Lu','HR',70000);` }
  ],
  muts: [['strictly more than the average', 'salary > dept_avg', 'salary >= dept_avg'], ['average per department', 'OVER (PARTITION BY dept)', 'OVER ()']],
  hints: [
    'You need each row next to an aggregate of its group. Options: join to a GROUP BY subquery, a correlated subquery, or <code>AVG(salary) OVER (PARTITION BY dept)</code>.',
    'A window function cannot go in WHERE. Compute it in a CTE, then filter in the outer query.'
  ],
  explain: 'AVG(...) OVER (PARTITION BY dept) keeps every row and adds the group average beside it, which GROUP BY cannot do. Because WHERE runs before window functions, the filter goes one level out.'
},
{
  id: 'manager-reports', title: 'Managers with two or more reports', level: 'Medium', skills: ['joins', 'agg'],
  prompt: `<p>Each employee's <code>manager_id</code> is another employee's <code>id</code>. Return the <code>name</code> of every manager with at least two direct reports, and their <code>report_count</code>.</p><p>Order by <code>report_count</code> descending, then <code>name</code>.</p>`,
  setup: `
CREATE TABLE employee (id INTEGER PRIMARY KEY, name TEXT, manager_id INTEGER);
INSERT INTO employee VALUES (1,'Rita',NULL),(2,'Sam',1),(3,'Tom',1),(4,'Uma',2),(5,'Vic',2),(6,'Wes',2),(7,'Xi',3),(8,'Yan',3);`,
  ref: `SELECT m.name, COUNT(*) AS report_count
FROM employee e
JOIN employee m ON m.id = e.manager_id
GROUP BY m.id, m.name
HAVING COUNT(*) >= 2
ORDER BY report_count DESC, m.name;`,
  ordered: true,
  hidden: [
    { name: 'Two different managers both named Uma (ids 4 and 9), each with one report', skill: 'agg', sql: `INSERT INTO employee VALUES (9,'Uma',1),(10,'Zed',4),(11,'Abe',9);` },
    { name: 'Zoe and Ari report to manager id 99, who is not in the table', skill: 'joins', sql: `INSERT INTO employee VALUES (12,'Zoe',99),(13,'Ari',99);` }
  ],
  muts: [['one group per manager, not per name', 'GROUP BY m.id, m.name', 'GROUP BY m.name'], ['at least two reports', 'COUNT(*) >= 2', 'COUNT(*) > 2']],
  hints: [
    'Join the table to itself: one copy plays the employee, the other the manager.',
    'Group by the manager\'s <code>id</code>, not just their name. Names are not unique.'
  ],
  explain: 'A self-join turns manager_id into a name. Grouping by the key (id) rather than a label (name) is the habit the duplicate-name test checks.'
},
{
  id: 'latest-login', title: 'Each user\'s latest login', level: 'Medium', skills: ['rank'],
  prompt: `<p>For each user, return their most recent login: <code>user_id</code>, <code>login_at</code>, <code>device</code>. If two of a user's logins share the same timestamp, take the one with the larger <code>login_id</code>.</p><p>Order by <code>user_id</code>.</p>`,
  setup: `
CREATE TABLE logins (login_id INTEGER PRIMARY KEY, user_id INTEGER, login_at TEXT, device TEXT);
INSERT INTO logins VALUES
 (1,1,'2025-03-01 09:00:00','web'),(2,1,'2025-03-02 18:30:00','ios'),
 (3,2,'2025-03-01 07:15:00','android'),(4,2,'2025-02-27 22:00:00','web'),
 (5,3,'2025-03-03 12:00:00','web');`,
  ref: `WITH r AS (
  SELECT *, ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY login_at DESC, login_id DESC) AS rn
  FROM logins
)
SELECT user_id, login_at, device
FROM r
WHERE rn = 1
ORDER BY user_id;`,
  ordered: true,
  hidden: [
    { name: 'User 3 has two logins at exactly 2025-03-03 12:00:00 (login_id 5 and 6)', skill: 'rank', sql: `INSERT INTO logins VALUES (6,3,'2025-03-03 12:00:00','ipad');` },
    { name: 'Login 7 is the highest login_id but has the oldest timestamp for user 1', skill: 'rank', sql: `INSERT INTO logins VALUES (7,1,'2025-01-01 08:00:00','android');` }
  ],
  muts: [['same timestamp: larger login_id wins', 'login_at DESC, login_id DESC', 'login_at DESC, login_id'], ['most recent by time, not by id', 'ORDER BY login_at DESC, login_id DESC', 'ORDER BY login_id DESC']],
  hints: [
    'Number each user\'s logins from newest to oldest and keep number 1.',
    '<code>ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY login_at DESC, login_id DESC)</code>. The second ORDER BY key breaks ties.'
  ],
  explain: '"Latest row per group" is ROW_NUMBER() + PARTITION BY + filter rn = 1. Joining back on MAX(login_at) returns two rows when timestamps tie; MAX(login_id) assumes ids follow time.'
},
{
  id: 'top-three', title: 'Top three salaries per department', level: 'Medium', skills: ['rank'],
  prompt: `<p>A high earner is anyone whose salary is among the top three <em>distinct</em> salaries in their department. Return <code>dept</code>, <code>name</code>, <code>salary</code> for every high earner.</p><p>Order by <code>dept</code>, <code>salary</code> descending, then <code>name</code>.</p>`,
  setup: `
CREATE TABLE employee (id INTEGER PRIMARY KEY, name TEXT, dept TEXT, salary INTEGER);
INSERT INTO employee VALUES
 (1,'Ben','Eng',90000),(2,'Ann','Eng',90000),(3,'Zoe','Eng',85000),(4,'Cat','Eng',80000),(5,'Eve','Eng',70000),
 (6,'Fox','Sales',60000),(7,'Gil','Sales',55000),(8,'Hap','Sales',50000),(9,'Ivy','Sales',45000);`,
  ref: `WITH r AS (
  SELECT dept, name, salary, DENSE_RANK() OVER (PARTITION BY dept ORDER BY salary DESC) AS rnk
  FROM employee
)
SELECT dept, name, salary
FROM r
WHERE rnk <= 3
ORDER BY dept, salary DESC, name;`,
  ordered: true,
  hidden: [
    { name: 'IT has only two people, Jay and Kit', skill: 'rank', sql: `INSERT INTO employee VALUES (10,'Jay','IT',70000),(11,'Kit','IT',65000);` },
    { name: 'Abe joins Sales on 50000, tying Hap for the third-highest salary', skill: 'rank', sql: `INSERT INTO employee VALUES (12,'Abe','Sales',50000);` }
  ],
  muts: [['top three distinct salaries (ties share a place, no gaps)', 'DENSE_RANK()', 'RANK()'], ['ties are all included', 'DENSE_RANK()', 'ROW_NUMBER()'], ['top three, not two', 'rnk <= 3', 'rnk <= 2'], ['highest salary first within a department', 'ORDER BY dept, salary DESC, name', 'ORDER BY dept, name']],
  hints: [
    '"Top three distinct salaries" means ties share a position and the next salary is still #2 or #3, not skipped.',
    'Compare what ROW_NUMBER, RANK and DENSE_RANK give Eng: 90000, 90000, 85000, 80000. Only one returns 1, 1, 2, 3.'
  ],
  explain: 'DENSE_RANK leaves no gaps after ties (1,1,2,3); RANK does (1,1,3,4); ROW_NUMBER ignores ties (1,2,3,4). The wording "distinct salaries" picks DENSE_RANK.'
},
{
  id: 'category-share', title: 'Product share of category revenue', level: 'Medium', skills: ['winagg'],
  prompt: `<p>Each row in <code>order_lines</code> is one sale. For every product return <code>category</code>, <code>product</code>, <code>product_revenue</code> (its total revenue), <code>category_revenue</code> (its category's total revenue) and <code>share_pct</code> = product revenue as a percentage of category revenue, rounded to 1 decimal.</p><p>Order by <code>category</code>, then <code>share_pct</code> descending.</p>`,
  setup: `
CREATE TABLE order_lines (line_id INTEGER PRIMARY KEY, product TEXT, category TEXT, revenue INTEGER);
INSERT INTO order_lines VALUES
 (1,'Laptop','Electronics',1200),(2,'Laptop','Electronics',800),(3,'Phone','Electronics',900),
 (4,'Phone','Electronics',600),(5,'Cable','Electronics',50),
 (6,'Desk','Furniture',300),(7,'Desk','Furniture',300),(8,'Chair','Furniture',200);`,
  ref: `SELECT category,
       product,
       SUM(revenue) AS product_revenue,
       SUM(SUM(revenue)) OVER (PARTITION BY category) AS category_revenue,
       ROUND(100.0 * SUM(revenue) / SUM(SUM(revenue)) OVER (PARTITION BY category), 1) AS share_pct
FROM order_lines
GROUP BY category, product
ORDER BY category, share_pct DESC;`,
  ordered: true,
  hidden: [
    { name: 'Kitchen has a single product, Mug (100% share)', skill: 'winagg', sql: `INSERT INTO order_lines VALUES (9,'Mug','Kitchen',12);` },
    { name: 'Furniture also sells a product called Cable, a different product from the Electronics Cable', skill: 'agg', sql: `INSERT INTO order_lines VALUES (9,'Cable','Furniture',100);` }
  ],
  muts: [['one row per product within its category', 'GROUP BY category, product', 'GROUP BY product'], ['share of its own category', 'ROUND(100.0 * SUM(revenue) / SUM(SUM(revenue)) OVER (PARTITION BY category), 1)', 'ROUND(100.0 * SUM(revenue) / SUM(SUM(revenue)) OVER (), 1)']],
  hints: [
    'Two levels of totals: first per product (GROUP BY), then per category across those product rows.',
    'A window function can wrap an aggregate: <code>SUM(SUM(revenue)) OVER (PARTITION BY category)</code>. Or do the GROUP BY in a CTE and window over the CTE.'
  ],
  explain: 'Window functions run after GROUP BY, so they can aggregate the aggregated rows. This "percent of total" pattern is the core of most share and mix questions.'
},
{
  id: 'mom-revenue', title: 'Month-over-month revenue', level: 'Medium', skills: ['laglead', 'dates'],
  prompt: `<p>Using only orders placed in 2025, return one row per month: <code>month</code> as <code>'YYYY-MM'</code>, <code>revenue</code> (sum of <code>amount</code>), <code>prev_revenue</code> (the previous month's revenue; NULL for the first month) and <code>pct_change</code> = percentage change from the previous month, rounded to 1 decimal (NULL for the first month).</p><p>Assume every month in range has at least one order. Order by <code>month</code>.</p>`,
  setup: `
CREATE TABLE orders (order_id INTEGER PRIMARY KEY, order_date TEXT, amount INTEGER);
INSERT INTO orders VALUES
 (1,'2025-01-05',100),(2,'2025-01-20',200),(3,'2025-02-03',450),
 (4,'2025-03-11',160),(5,'2025-03-28',200),(6,'2025-04-02',350);`,
  ref: `WITH m AS (
  SELECT strftime('%Y-%m', order_date) AS month, SUM(amount) AS revenue
  FROM orders
  WHERE order_date >= '2025-01-01' AND order_date < '2026-01-01'
  GROUP BY month
)
SELECT month,
       revenue,
       LAG(revenue) OVER (ORDER BY month) AS prev_revenue,
       ROUND(100.0 * (revenue - LAG(revenue) OVER (ORDER BY month)) / LAG(revenue) OVER (ORDER BY month), 1) AS pct_change
FROM m
ORDER BY month;`,
  ordered: true,
  hidden: [
    { name: 'An order on 2024-12-30 and one on 2026-01-02, both outside 2025', skill: 'dates', sql: `INSERT INTO orders VALUES (7,'2024-12-30',500),(8,'2026-01-02',50);` },
    { name: 'Orders for May to December 2025, so the year has all 12 months', skill: 'laglead', sql: `INSERT INTO orders VALUES (9,'2025-05-09',300),(10,'2025-06-14',330),(11,'2025-07-01',300),(12,'2025-08-21',420),(13,'2025-09-30',420),(14,'2025-10-02',210),(15,'2025-11-17',630),(16,'2025-12-24',700);` }
  ],
  muts: [['only orders placed in 2025', "WHERE order_date >= '2025-01-01' AND order_date < '2026-01-01'", ''], ['change from the previous month', 'LAG(revenue) OVER (ORDER BY month) AS prev_revenue', 'LEAD(revenue) OVER (ORDER BY month) AS prev_revenue']],
  hints: [
    'Step 1: total per month in a CTE (<code>DATE_FORMAT(order_date, \'%Y-%m\')</code> or <code>strftime(\'%Y-%m\', order_date)</code>). Step 2: look back one row.',
    '<code>LAG(revenue) OVER (ORDER BY month)</code> gives the previous row\'s value. Filter to 2025 before the LAG, so January has nothing to look back to.'
  ],
  explain: 'Aggregate first, then LAG over the aggregated rows. Filtering in the CTE matters: if December 2024 were still there, January\'s prev_revenue would be 500 instead of NULL.'
},
{
  id: 'moving-avg', title: 'Running total and 3-day moving average', level: 'Medium+', skills: ['frames', 'winagg'],
  prompt: `<p>Each row in <code>sales</code> is one transaction; a store can have several on the same day. For each store and each day it had sales, return <code>store</code>, <code>sale_date</code>, <code>daily_total</code>, <code>running_total</code> (the store's cumulative total through that day) and <code>avg_3day</code>: the average <code>daily_total</code> of that day and the store's two previous sales days (fewer at the start), rounded to 2 decimals.</p><p>Days with no sales are not rows and do not count. Order by <code>store</code>, <code>sale_date</code>.</p>`,
  setup: `
CREATE TABLE sales (sale_id INTEGER PRIMARY KEY, store TEXT, sale_date TEXT, amount INTEGER);
INSERT INTO sales VALUES
 (1,'A','2025-01-01',100),(2,'A','2025-01-01',50),(3,'A','2025-01-02',200),(4,'A','2025-01-04',101),
 (5,'A','2025-01-05',250),(6,'A','2025-01-05',50),(7,'B','2025-01-01',80),(8,'B','2025-01-03',120);`,
  ref: `WITH d AS (
  SELECT store, sale_date, SUM(amount) AS daily_total
  FROM sales
  GROUP BY store, sale_date
)
SELECT store,
       sale_date,
       daily_total,
       SUM(daily_total) OVER (PARTITION BY store ORDER BY sale_date) AS running_total,
       ROUND(AVG(daily_total) OVER (PARTITION BY store ORDER BY sale_date
                                    ROWS BETWEEN 2 PRECEDING AND CURRENT ROW), 2) AS avg_3day
FROM d
ORDER BY store, sale_date;`,
  ordered: true,
  hidden: [
    { name: 'Store C has five sales days in a row, so the 3-day window has to drop the oldest days', skill: 'frames', sql: `INSERT INTO sales VALUES (9,'C','2025-02-01',10),(10,'C','2025-02-02',20),(11,'C','2025-02-03',30),(12,'C','2025-02-04',40),(13,'C','2025-02-05',50);` },
    { name: 'Store D has sales on one day only', skill: 'frames', sql: `INSERT INTO sales VALUES (14,'D','2025-03-01',99);` }
  ],
  muts: [['one row per store per day', 'GROUP BY store, sale_date', 'GROUP BY sale_id'], ['that day and the two before it', 'ROWS BETWEEN 2 PRECEDING AND CURRENT ROW', 'ROWS BETWEEN 3 PRECEDING AND CURRENT ROW'], ['a moving window, not a running average', '\n                                    ROWS BETWEEN 2 PRECEDING AND CURRENT ROW', ''], ['running total restarts for each store', 'SUM(daily_total) OVER (PARTITION BY store ORDER BY sale_date)', 'SUM(daily_total) OVER (ORDER BY store, sale_date)']],
  hints: [
    'Get to one row per store per day first (GROUP BY in a CTE). Windows over raw transactions count the same day twice.',
    'Running total: <code>SUM(…) OVER (PARTITION BY store ORDER BY sale_date)</code>. Moving average: add the frame <code>ROWS BETWEEN 2 PRECEDING AND CURRENT ROW</code>.'
  ],
  explain: 'The frame clause decides which rows a window sees. With ORDER BY and no frame you get "everything up to here" (running total); ROWS BETWEEN 2 PRECEDING AND CURRENT ROW gives a fixed 3-row window.'
},
{
  id: 'day1-retention', title: 'Next-day retention', level: 'Medium', skills: ['dates'],
  prompt: `<p>Return the <code>fraction</code> of players who logged in again on the day right after their <em>first</em> login, rounded to 2 decimals. Each row in <code>activity</code> is one day a player logged in.</p>`,
  setup: `
CREATE TABLE activity (player_id INTEGER, event_date TEXT, games_played INTEGER, PRIMARY KEY (player_id, event_date));
INSERT INTO activity VALUES
 (1,'2025-03-01',5),(1,'2025-03-02',6),
 (2,'2025-03-05',1),
 (3,'2025-03-01',3),(3,'2025-03-04',2),(3,'2025-03-05',4);`,
  ref: `WITH f AS (
  SELECT player_id, MIN(event_date) AS first_day
  FROM activity
  GROUP BY player_id
)
SELECT ROUND(1.0 * COUNT(a.player_id) / (SELECT COUNT(*) FROM f), 2) AS fraction
FROM f
LEFT JOIN activity a
  ON a.player_id = f.player_id AND a.event_date = date(f.first_day, '+1 day');`,
  hidden: [
    { name: 'Player 4 first logs in on 2025-02-28 and again on 2025-03-01, the next day', skill: 'dates', sql: `INSERT INTO activity VALUES (4,'2025-02-28',1),(4,'2025-03-01',1);` },
    { name: 'Leap year 2024: player 5 returns on Feb 29 (the next day), player 6 returns on Mar 1 (two days later)', skill: 'dates', sql: `INSERT INTO activity VALUES (5,'2024-02-28',1),(5,'2024-02-29',1),(6,'2024-02-28',1),(6,'2024-03-01',1);` }
  ],
  muts: [['the day right after the first login', "'+1 day'", "'+2 day'"], ['out of all players', '(SELECT COUNT(*) FROM f)', '(SELECT COUNT(*) FROM activity)']],
  hints: [
    'Find each player\'s first day (MIN per player), then check whether they have a row exactly one day later.',
    'Use real date arithmetic: <code>DATEDIFF(a, b) = 1</code>, <code>DATE_ADD(d, INTERVAL 1 DAY)</code>. Divide by the number of players, with <code>1.0 *</code> to avoid integer division.'
  ],
  explain: 'Anchor on the first day, then test the very next calendar day. Player 3 has two consecutive days, but not right after their first, so they do not count.'
},
{
  id: 'order-gaps', title: 'Average days between orders', level: 'Medium', skills: ['laglead', 'dates'],
  prompt: `<p>For each customer with at least two orders, return <code>customer_id</code> and <code>avg_gap_days</code>: the average number of days between one order and that customer's next order, rounded to 1 decimal.</p><p>Order by <code>customer_id</code>.</p>`,
  setup: `
CREATE TABLE orders (order_id INTEGER PRIMARY KEY, customer_id INTEGER, order_date TEXT);
INSERT INTO orders VALUES
 (1,1,'2025-01-01'),(2,1,'2025-01-11'),(3,1,'2025-01-31'),(10,1,'2025-02-05'),
 (4,2,'2025-02-01'),(5,2,'2025-03-01'),
 (6,3,'2025-01-15');`,
  ref: `WITH g AS (
  SELECT customer_id,
         julianday(order_date) - julianday(LAG(order_date) OVER (PARTITION BY customer_id ORDER BY order_date)) AS gap
  FROM orders
)
SELECT customer_id, ROUND(AVG(gap), 1) AS avg_gap_days
FROM g
WHERE gap IS NOT NULL
GROUP BY customer_id
ORDER BY customer_id;`,
  ordered: true,
  hidden: [
    { name: 'Customer 4 orders twice on 2025-03-10 (a gap of 0 days) and again on 2025-03-16', skill: 'laglead', sql: `INSERT INTO orders VALUES (7,4,'2025-03-10'),(8,4,'2025-03-10'),(9,4,'2025-03-16');` },
    { name: "Customer 5's order ids are not in date order (order 20 is their latest order)", skill: 'laglead', sql: `INSERT INTO orders VALUES (20,5,'2025-05-20'),(21,5,'2025-05-01'),(22,5,'2025-05-10');` }
  ],
  muts: [['previous order by date', 'PARTITION BY customer_id ORDER BY order_date', 'PARTITION BY customer_id ORDER BY order_id'], ['only customers with at least two orders', 'WHERE gap IS NOT NULL', ''], ['previous order of the same customer', 'OVER (PARTITION BY customer_id ORDER BY order_date)', 'OVER (ORDER BY customer_id, order_date)']],
  hints: [
    'Put each order next to the customer\'s previous order: <code>LAG(order_date) OVER (PARTITION BY customer_id ORDER BY order_date)</code>.',
    'The gap is <code>DATEDIFF(order_date, prev_date)</code>. The first order has no previous one (NULL), and AVG skips NULLs.'
  ],
  explain: 'LAG with PARTITION BY compares each row with the previous row of the same customer. Ordering by date, not id, is what the second test checks. (Shortcut: (last − first) / (n − 1) gives the same average.)'
},
{
  id: 'longest-streak', title: 'Longest login streak', level: 'Hard', skills: ['islands'],
  prompt: `<p>For each user, return <code>user_id</code> and <code>longest_streak</code>: the most consecutive calendar days on which they logged in at least once. A user can log in more than once a day.</p><p>Order by <code>user_id</code>.</p>`,
  setup: `
CREATE TABLE logins (user_id INTEGER, login_date TEXT);
INSERT INTO logins VALUES
 (1,'2025-01-01'),(1,'2025-01-02'),(1,'2025-01-03'),(1,'2025-01-05'),(1,'2025-01-06'),
 (2,'2025-01-10'),
 (3,'2025-01-02'),(3,'2025-01-04'),(3,'2025-01-05'),(3,'2025-01-06'),(3,'2025-01-07');`,
  ref: `WITH d AS (
  SELECT DISTINCT user_id, login_date FROM logins
), g AS (
  SELECT user_id,
         julianday(login_date) - ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY login_date) AS grp
  FROM d
), runs AS (
  SELECT user_id, COUNT(*) AS len FROM g GROUP BY user_id, grp
)
SELECT user_id, MAX(len) AS longest_streak
FROM runs
GROUP BY user_id
ORDER BY user_id;`,
  ordered: true,
  hidden: [
    { name: 'Users 1, 2 and 3 each log in twice on one of their days', skill: 'islands', sql: `INSERT INTO logins VALUES (1,'2025-01-02'),(3,'2025-01-05'),(2,'2025-01-10');` },
    { name: 'User 4 logs in Jan 30, Jan 31, Feb 1 and Feb 2: one streak of 4 across the month boundary', skill: 'dates', sql: `INSERT INTO logins VALUES (4,'2025-01-30'),(4,'2025-01-31'),(4,'2025-02-01'),(4,'2025-02-02'),(4,'2025-02-05');` }
  ],
  muts: [['a day counts once however many logins it has', 'SELECT DISTINCT user_id, login_date FROM logins', 'SELECT user_id, login_date FROM logins'], ['consecutive calendar days, across months', 'julianday(login_date) - ROW_NUMBER()', "CAST(strftime('%d', login_date) AS INTEGER) - ROW_NUMBER()"], ['the longest streak', 'MAX(len)', 'MIN(len)']],
  hints: [
    'Classic trick: for consecutive dates, <em>date minus its row number</em> stays constant. Each constant value is one streak.',
    'Remove duplicate days first (SELECT DISTINCT), then <code>julianday(login_date) - ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY login_date)</code> (or <code>DATE_SUB(login_date, INTERVAL rn DAY)</code>), group by it, count, take the max.'
  ],
  explain: 'Gaps and islands: on consecutive days, the date and the row number both go up by one, so their difference labels the run. Duplicates break the trick, which is why DISTINCT comes first.'
},
{
  id: 'quarter-champion', title: 'Top store each quarter', level: 'Medium+', skills: ['rank', 'agg'],
  prompt: `<p>Revenue is <code>quantity * unit_price</code>. For each quarter of 2025 that has sales, return <code>quarter</code> (<code>'Q1'</code> to <code>'Q4'</code>), the <code>store</code> with the highest revenue that quarter, and that <code>revenue</code>.</p><p>If stores tie on revenue, the one with more total <code>quantity</code> wins; if still tied, the store that comes first alphabetically. Order by <code>quarter</code>.</p>`,
  setup: `
CREATE TABLE sales (sale_id INTEGER PRIMARY KEY, sale_date TEXT, store TEXT, quantity INTEGER, unit_price INTEGER);
INSERT INTO sales VALUES
 (1,'2025-01-15','Downtown',10,20),(2,'2025-02-02','Downtown',5,10),(3,'2025-03-09','Harbor',20,10),(4,'2025-03-30','Mall',3,100),
 (5,'2025-04-11','Downtown',20,20),(6,'2025-06-20','Harbor',40,10),
 (7,'2025-07-04','Harbor',25,20),(8,'2025-09-12','Mall',10,10);`,
  ref: `WITH q AS (
  SELECT 'Q' || ((CAST(strftime('%m', sale_date) AS INTEGER) + 2) / 3) AS quarter,
         store,
         SUM(quantity * unit_price) AS revenue,
         SUM(quantity) AS qty
  FROM sales
  WHERE sale_date >= '2025-01-01' AND sale_date < '2026-01-01'
  GROUP BY quarter, store
), r AS (
  SELECT *, ROW_NUMBER() OVER (PARTITION BY quarter ORDER BY revenue DESC, qty DESC, store) AS rn
  FROM q
)
SELECT quarter, store, revenue
FROM r
WHERE rn = 1
ORDER BY quarter;`,
  ordered: true,
  hidden: [
    { name: 'A large Mall sale on 2024-11-10 and a large Harbor sale on 2026-02-01, both outside 2025', skill: 'dates', sql: `INSERT INTO sales VALUES (9,'2024-11-10','Mall',100,100),(10,'2026-02-01','Harbor',100,10);` },
    { name: 'In Q4, Pier and Bay tie on revenue (100) and on quantity (10), so Bay wins alphabetically', skill: 'rank', sql: `INSERT INTO sales VALUES (11,'2025-10-05','Pier',10,10),(12,'2025-11-20','Bay',10,10);` }
  ],
  muts: [['only 2025', "WHERE sale_date >= '2025-01-01' AND sale_date < '2026-01-01'", ''], ['revenue tie: more quantity wins', 'revenue DESC, qty DESC, store', 'revenue DESC, store'], ['still tied: first alphabetically', 'qty DESC, store)', 'qty DESC, store DESC)'], ['highest revenue, not lowest', 'ORDER BY revenue DESC, qty DESC', 'ORDER BY revenue, qty DESC'], ['one winner per quarter', 'PARTITION BY quarter ORDER BY', 'ORDER BY']],
  hints: [
    'Three steps: label each sale with its quarter (<code>QUARTER(sale_date)</code> or a CASE on the month), total revenue and quantity per quarter and store, then pick one store per quarter.',
    'Picking one per group with tie-breaks is <code>ROW_NUMBER() OVER (PARTITION BY quarter ORDER BY revenue DESC, qty DESC, store)</code>, filtered to 1.'
  ],
  explain: 'This is the shape of Seasonal Sales Analysis: bucket → aggregate → rank inside each bucket with tie-breaks → keep #1. PARTITION BY restarts the numbering for each quarter.'
}
];

const CONCEPTS = [
{ id: 'c-rank', skill: 'rank',
  q: 'Salaries ordered from highest: 300, 300, 200, 100. Which function numbers them 1, 1, 2, 3?',
  choices: ['ROW_NUMBER()', 'RANK()', 'DENSE_RANK()', 'NTILE(3)'], answer: 2,
  why: 'DENSE_RANK gives 1, 1, 2, 3. RANK gives 1, 1, 3, 4 (it skips after a tie). ROW_NUMBER gives 1, 2, 3, 4 (ties get arbitrary order).' },
{ id: 'c-partition', skill: 'winagg',
  q: '`emp` has 10 rows across 3 departments. How many rows does this return?',
  code: 'SELECT dept, SUM(salary) OVER (PARTITION BY dept) AS dept_total\nFROM emp;',
  choices: ['3', '10', '1', 'It depends on ORDER BY'], answer: 1,
  why: 'Window functions never collapse rows: every one of the 10 rows comes back, each carrying its department total. GROUP BY dept would return 3.' },
{ id: 'c-frame', skill: 'frames',
  q: 'Rows (day, amt): (1, 10), (2, 20), (2, 30), (3, 40). What is the running_total on the row (2, 20)?',
  code: 'SELECT day, amt, SUM(amt) OVER (ORDER BY day) AS running_total\nFROM t;',
  choices: ['30', '60', '20', 'Error: day is not unique'], answer: 1,
  why: 'With ORDER BY and no frame, the default is RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW, which includes every row that ties with the current one. Both day-2 rows get 10 + 20 + 30 = 60. Use ROWS BETWEEN … for row-by-row behavior, or aggregate per day first.' },
{ id: 'c-order', skill: 'sub',
  q: 'Why does this fail?',
  code: 'SELECT name, ROW_NUMBER() OVER (PARTITION BY dept ORDER BY salary DESC) AS rn\nFROM emp\nWHERE rn = 1;',
  choices: ['ROW_NUMBER needs an explicit frame', 'WHERE is evaluated before SELECT, so rn (and any window function) does not exist yet', 'You must write HAVING rn = 1 instead', 'PARTITION BY cannot be combined with ORDER BY'], answer: 1,
  why: 'Logical order is FROM → WHERE → GROUP BY → HAVING → SELECT (window functions run here) → ORDER BY → LIMIT. To filter on a window result, compute it in a CTE or subquery and filter outside.' },
{ id: 'c-logical', skill: 'agg',
  q: 'Which is the logical order a query is evaluated in?',
  choices: ['SELECT → FROM → WHERE → GROUP BY → HAVING → ORDER BY', 'FROM → WHERE → GROUP BY → HAVING → SELECT → ORDER BY', 'FROM → GROUP BY → WHERE → HAVING → SELECT → ORDER BY', 'FROM → WHERE → SELECT → GROUP BY → HAVING → ORDER BY'], answer: 1,
  why: 'FROM/JOIN, then WHERE filters rows, GROUP BY forms groups, HAVING filters groups, SELECT computes columns (and windows), ORDER BY sorts, LIMIT cuts. This order explains most "why can\'t I use that here" errors.' },
{ id: 'c-count', skill: 'nulls',
  q: 'Column `bonus` holds 100, NULL, 200, NULL. What are COUNT(*), COUNT(bonus) and AVG(bonus)?',
  choices: ['4, 4, 75', '4, 2, 150', '2, 2, 150', '4, 2, 75'], answer: 1,
  why: 'COUNT(*) counts rows; COUNT(col) and AVG(col) skip NULLs. So AVG is (100 + 200) / 2 = 150. If NULL should mean 0, use AVG(COALESCE(bonus, 0)) = 75.' },
{ id: 'c-leftwhere', skill: 'joins',
  q: 'What happens to customers who have no orders?',
  code: 'SELECT c.name, o.amount\nFROM customers c\nLEFT JOIN orders o ON o.customer_id = c.id\nWHERE o.amount > 50;',
  choices: ['They appear with amount = NULL', 'They are dropped: the WHERE on o.amount turns this into an inner join', 'They appear once per order', 'Error: you cannot filter a LEFT JOIN'], answer: 1,
  why: 'For customers with no orders, o.amount is NULL, and NULL > 50 is not true, so WHERE removes them. To keep them, move the condition into the join: ON o.customer_id = c.id AND o.amount > 50.' },
{ id: 'c-notin', skill: 'nulls',
  q: 'Some employees have manager_id = NULL. What does this return?',
  code: 'SELECT name FROM employee\nWHERE id NOT IN (SELECT manager_id FROM employee);',
  choices: ['Everyone who manages no one', 'No rows at all', 'An error', 'Everyone except the NULL rows'], answer: 1,
  why: 'id NOT IN (1, 2, NULL) means id <> 1 AND id <> 2 AND id <> NULL. The last part is unknown, so the whole thing is never true. Use NOT EXISTS, or filter NULLs out of the subquery.' },
{ id: 'c-lag', skill: 'laglead',
  q: 'What does this return on each customer\'s first order?',
  code: 'LAG(amount, 1, 0) OVER (PARTITION BY customer_id ORDER BY order_date)',
  choices: ['NULL', '0', 'The previous customer\'s last amount', 'The row\'s own amount'], answer: 1,
  why: 'LAG(expr, offset, default): when there is no row `offset` back inside the partition, it returns the default, here 0. Without a default you get NULL. PARTITION BY stops it from reaching into another customer.' },
{ id: 'c-movavg', skill: 'frames',
  q: 'Which frame gives a 3-row moving average that ends at the current row?',
  code: 'AVG(x) OVER (ORDER BY d  ???  )',
  choices: ['ROWS BETWEEN 3 PRECEDING AND CURRENT ROW', 'ROWS BETWEEN 1 PRECEDING AND 1 FOLLOWING', 'ROWS BETWEEN 2 PRECEDING AND CURRENT ROW', 'RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW'], answer: 2,
  why: '2 preceding + the current row = 3 rows. 3 PRECEDING is 4 rows; 1 PRECEDING AND 1 FOLLOWING is centered; UNBOUNDED PRECEDING is a running average.' },
{ id: 'c-islands', skill: 'islands',
  q: 'Login days 1, 2, 3, 5, 6 get ROW_NUMBER() 1, 2, 3, 4, 5. What is day − row_number for each, and how many streaks is that?',
  choices: ['0, 0, 0, 1, 1: two streaks', '1, 1, 1, 1, 1: one streak', '0, 0, 0, 0, 0: one streak', '1, 2, 3, 4, 5: five streaks'], answer: 0,
  why: 'Within a run of consecutive days, day and row number both rise by 1, so the difference is constant. A gap bumps it. Group by the difference to get each streak.' }
];
const bank = { SKILLS, TASKS, CONCEPTS };
if (typeof module !== 'undefined' && module.exports) module.exports = bank; else root.LAB_BANK = bank;
})(typeof window !== 'undefined' ? window : globalThis);
