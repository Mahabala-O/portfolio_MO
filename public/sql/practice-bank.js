// Topics and problems for the practice page (sql-practice.html). A topic has a lesson (a worked example whose steps are run live),
// quick checks, problems ordered from easiest to hardest, and LeetCode problems to try afterwards.
// Problems use the same shape as the lab's tasks (see lab-bank.js): setup, ref, ordered, hidden, hints, explain, muts.
// The rules for writing them are in the project's docs (writing tasks); the mutate.js check enforces the main one.
(function (root) {
const TOPICS = [
{
  id: 'agg-rank',
  title: 'Aggregate, then rank',
  blurb: 'Find the top row in each group when the thing you rank by is a total you have to compute first. The pattern behind Seasonal Sales Analysis.',
  lesson: {
    intro: `<p>Questions like "the best-selling product in each city" or "the top category each season" all have the same three steps. Do them one at a time, each in its own CTE, and check each step's output before writing the next.</p>
<ol>
  <li><b>Totals.</b> Get one row per thing you are comparing, with its number. Here: one row per city and product, with units sold. This is a plain <code>GROUP BY</code>.</li>
  <li><b>Rank.</b> Number those rows inside each group, best first. <code>PARTITION BY</code> says where the numbering restarts (each city). <code>ORDER BY</code> inside <code>OVER</code> says what "best" means, including every tie-break, in order.</li>
  <li><b>Keep.</b> In the outer query, keep number 1 (or the top N). The filter has to be outside, because <code>WHERE</code> runs before window functions.</li>
</ol>`,
    setup: `
CREATE TABLE orders (order_id INTEGER PRIMARY KEY, city TEXT, product TEXT, qty INTEGER);
INSERT INTO orders VALUES (1,'Irvine','Pen',5),(2,'Irvine','Mug',3),(3,'Irvine','Mug',2),(4,'Irvine','Cap',3),
 (5,'Tustin','Pen',4),(6,'Tustin','Cap',1),(7,'Tustin','Cap',2);`,
    question: 'The best-selling product in each city. If two products tie, take the one that comes first alphabetically.',
    sql: `WITH totals AS (
  SELECT city, product, SUM(qty) AS units
  FROM orders
  GROUP BY city, product
),
ranked AS (
  SELECT *,
         ROW_NUMBER() OVER (PARTITION BY city ORDER BY units DESC, product) AS rn
  FROM totals
)
SELECT city, product, units
FROM ranked
WHERE rn = 1
ORDER BY city;`,
    stepNotes: {
      totals: 'Step 1, totals: one row per city and product. In Irvine, Mug and Pen are tied on 5.',
      ranked: 'Step 2, ranked: the numbering restarts in each city. Mug gets 1 ahead of Pen only because of the second sort key, product.',
      '': 'Step 3, keep: only the rows numbered 1.'
    },
    outro: `<h3>Which function?</h3>
<ul>
  <li><code>ROW_NUMBER()</code>: exactly one winner per group. Ties are broken by the sort keys you list, so list all of them. If the keys run out, the database picks arbitrarily.</li>
  <li><code>RANK()</code>: tied rows share a number, then numbers skip (1, 1, 3). Use it for "the top one, and everyone tied with it".</li>
  <li><code>DENSE_RANK()</code>: tied rows share a number and nothing is skipped (1, 1, 2). Use it for "the top N distinct values".</li>
</ul>
<h3>Why not GROUP BY city with MAX(units)?</h3>
<p><code>SELECT city, product, MAX(units) FROM totals GROUP BY city</code> gives you the highest number per city, but not the row it came from. <code>product</code> is not in the GROUP BY, so MySQL rejects the query (or, in a looser mode, returns a product from any row). To get the whole winning row, you rank.</p>
<h3>In the problems below</h3>
<p>If your query uses CTEs, the menu next to Run lets you show the output of any one step. Use it the way this lesson does: look at the totals before you rank them.</p>`
  },
  checks: [
    { id: 'ar-c1', q: 'Totals for Irvine: Pen 5, Mug 5, Cap 3. What does `ROW_NUMBER() OVER (PARTITION BY city ORDER BY units DESC, product)` give Pen?',
      choices: ['1', '2', '1 or 2: it is arbitrary', '3'], answer: 1,
      why: 'Pen and Mug tie on units, so the second key decides: Mug comes before Pen alphabetically. Mug is 1, Pen is 2, Cap is 3. Without the second key, the answer would be arbitrary.' },
    { id: 'ar-c2', q: 'Same totals. With `RANK() OVER (PARTITION BY city ORDER BY units DESC)` and `WHERE rnk = 1`, how many Irvine rows come back?',
      choices: ['1', '2', '3', '0'], answer: 1,
      why: 'RANK gives tied rows the same number: Pen 1, Mug 1, Cap 3. Filtering to 1 keeps both. That is right when the prompt says "return all ties" and wrong when it asks for one winner.' },
    { id: 'ar-c3', q: 'You want the top product per city but write `PARTITION BY product ORDER BY units DESC`. What do you get for `rn = 1`?',
      choices: ['The top product per city', 'For each product, the city where it sold most', 'One row in total', 'An error'], answer: 1,
      why: 'PARTITION BY names the group in which numbering restarts. Partition by product and each product gets its own 1, 2, 3 across cities. Read it as "for each ___, number the rows".' },
    { id: 'ar-c4', q: 'Why does `SELECT city, product, MAX(units) FROM totals GROUP BY city` not answer "top product per city"?',
      choices: ['MAX cannot be used with GROUP BY', 'It returns the highest units per city, but product is not tied to that row', 'It needs HAVING', 'It returns every product'], answer: 1,
      why: 'Each city collapses to one row. MAX(units) is well defined, but product could come from any of the collapsed rows. MySQL refuses the query by default (ONLY_FULL_GROUP_BY).' }
  ],
  followups: [
    { n: 184, title: 'Department Highest Salary', slug: 'department-highest-salary' },
    { n: 185, title: 'Department Top Three Salaries', slug: 'department-top-three-salaries' },
    { n: 1070, title: 'Product Sales Analysis III', slug: 'product-sales-analysis-iii' },
    { n: 3564, title: 'Seasonal Sales Analysis', slug: 'seasonal-sales-analysis' }
  ],
  problems: [
{
  id: 'top-priced', title: 'Most expensive product in each category', level: 'Easy', type: 'Ranking', scenario: 'Retail catalog',
  prompt: `<p>Return <code>category</code>, <code>name</code> and <code>price</code> for the most expensive product in each category. If several products tie for the highest price, return all of them.</p><p>Order by <code>category</code>, then <code>name</code>.</p>`,
  setup: `
CREATE TABLE products (product_id INTEGER PRIMARY KEY, name TEXT, category TEXT, price INTEGER);
INSERT INTO products VALUES (1,'Buds','Audio',120),(2,'Deck','Audio',300),(3,'Amp','Audio',300),
 (4,'Lens','Video',250),(5,'Cam','Video',500),(6,'Bulb','Home',15),(7,'Lamp','Home',40);`,
  ref: `WITH ranked AS (
  SELECT category, name, price,
         RANK() OVER (PARTITION BY category ORDER BY price DESC) AS rnk
  FROM products
)
SELECT category, name, price
FROM ranked
WHERE rnk = 1
ORDER BY category, name;`,
  ordered: true,
  hidden: [
    { name: 'Garden has a single product, Hose', sql: `INSERT INTO products VALUES (8,'Hose','Garden',25);` },
    { name: 'Rug and Fan join Home at 40, so three Home products tie for the highest price', sql: `INSERT INTO products VALUES (8,'Rug','Home',40),(9,'Fan','Home',40);` }
  ],
  muts: [['ties are all returned', 'RANK()', 'ROW_NUMBER()'], ['the highest price, not the lowest', 'ORDER BY price DESC', 'ORDER BY price'], ['the numbering restarts in each category', 'PARTITION BY category ORDER BY', 'ORDER BY']],
  hints: [
    'No totals to compute here: the rows are already one per product. Number the products inside each category from most to least expensive, then keep the ones numbered 1.',
    '<code>WITH ranked AS (SELECT …, ___() OVER (PARTITION BY ___ ORDER BY ___ DESC) AS rnk FROM products) SELECT … FROM ranked WHERE rnk = 1 ORDER BY …</code>',
    'The prompt wants every product tied for first, so use <code>RANK()</code>. <code>ROW_NUMBER()</code> would keep only one of Deck and Amp.'
  ],
  explain: 'Ranking raw rows: PARTITION BY category restarts the numbering, ORDER BY price DESC puts the most expensive first, and RANK gives tied products the same number so "rnk = 1" keeps them all.'
},
{
  id: 'rank-the-totals', title: 'Top rep in each region (write the ranking step)', level: 'Easy', type: 'Top-N per group', scenario: 'Sales',
  prompt: `<p>For each region, return the <code>region</code>, the top <code>rep</code> and their <code>total</code> sales. The top rep is the one with the highest total. If two reps tie on total, the one who needed fewer sales wins. No two reps in a region tie on both.</p><p>Order by <code>region</code>.</p><p>The first and last steps are written for you. <b>Write the <code>ranked</code> step.</b></p>`,
  setup: `
CREATE TABLE sales (sale_id INTEGER PRIMARY KEY, region TEXT, rep TEXT, amount INTEGER);
INSERT INTO sales VALUES (1,'East','Kim',100),(2,'East','Kim',50),(3,'East','Lee',150),
 (4,'West','Ana',200),(5,'West','Bo',120),(6,'West','Bo',90),
 (7,'North','Cy',80),(8,'North','Di',30),(9,'North','Di',30);`,
  starter: `WITH totals AS (
  SELECT region, rep, SUM(amount) AS total, COUNT(*) AS deals
  FROM sales
  GROUP BY region, rep
),
ranked AS (
  -- Your step: number each region's reps, best first, in a column called rn.
  SELECT *
  FROM totals
)
SELECT region, rep, total
FROM ranked
WHERE rn = 1
ORDER BY region;`,
  ref: `WITH totals AS (
  SELECT region, rep, SUM(amount) AS total, COUNT(*) AS deals
  FROM sales
  GROUP BY region, rep
),
ranked AS (
  SELECT *,
         ROW_NUMBER() OVER (PARTITION BY region ORDER BY total DESC, deals) AS rn
  FROM totals
)
SELECT region, rep, total
FROM ranked
WHERE rn = 1
ORDER BY region;`,
  ordered: true,
  hidden: [
    { name: 'South has a single rep, Eve', sql: `INSERT INTO sales VALUES (10,'South','Eve',70);` },
    { name: 'Fay makes five East sales of 40 (total 200), the most sales and the highest total', sql: `INSERT INTO sales VALUES (10,'East','Fay',40),(11,'East','Fay',40),(12,'East','Fay',40),(13,'East','Fay',40),(14,'East','Fay',40);` }
  ],
  muts: [['a tie on total goes to the rep with fewer sales', 'total DESC, deals', 'total DESC'], ['the highest total wins', 'ORDER BY total DESC, deals', 'ORDER BY deals, total DESC'], ['the numbering restarts in each region', 'PARTITION BY region ORDER BY', 'ORDER BY']],
  hints: [
    'Pick "Show step: totals" next to Run to see the rows you are ranking. In East, Kim and Lee are tied on 150. Which column separates them?',
    'Add one column to the SELECT in <code>ranked</code>: <code>ROW_NUMBER() OVER (PARTITION BY ___ ORDER BY ___ DESC, ___) AS rn</code>.',
    '<code>ROW_NUMBER() OVER (PARTITION BY region ORDER BY total DESC, deals) AS rn</code>. The second key, <code>deals</code> ascending, puts the rep with fewer sales first when totals tie.'
  ],
  explain: 'The ranking step works on the aggregated rows, not the raw sales. Every tie-break in the prompt becomes another key in the window\'s ORDER BY, in the same order the prompt gives them.'
},
{
  id: 'best-seller', title: 'Best-selling product in each category', level: 'Easy', type: 'Top-N per group', scenario: 'E-commerce',
  prompt: `<p>For each category, return the <code>category</code>, its best-selling <code>product</code> (the product's name) and the <code>units</code> it sold. Best-selling means the most units in total. If two products tie, take the one whose name comes first alphabetically. Products with no sales are ignored.</p><p>Order by <code>category</code>.</p>`,
  setup: `
CREATE TABLE products (product_id INTEGER PRIMARY KEY, name TEXT, category TEXT);
CREATE TABLE order_items (item_id INTEGER PRIMARY KEY, product_id INTEGER, qty INTEGER);
INSERT INTO products VALUES (1,'Tee','Apparel'),(2,'Cap','Apparel'),(3,'Mug','Home'),(4,'Rug','Home'),(5,'Sock','Apparel');
INSERT INTO order_items VALUES (1,1,3),(2,1,2),(3,2,5),(4,5,1),(5,3,4),(6,4,2),(7,4,1);`,
  ref: `WITH totals AS (
  SELECT p.product_id, p.category, p.name AS product, SUM(oi.qty) AS units
  FROM products p
  JOIN order_items oi ON oi.product_id = p.product_id
  GROUP BY p.product_id, p.category, p.name
),
ranked AS (
  SELECT *,
         ROW_NUMBER() OVER (PARTITION BY category ORDER BY units DESC, product) AS rn
  FROM totals
)
SELECT category, product, units
FROM ranked
WHERE rn = 1
ORDER BY category;`,
  ordered: true,
  hidden: [
    { name: 'Home gets its own product called Tee (product 6), which sells 6 units', sql: `INSERT INTO products VALUES (6,'Tee','Home'); INSERT INTO order_items VALUES (8,6,6);` },
    { name: 'Toys has one product, Kite, with no sales, so Toys does not appear', sql: `INSERT INTO products VALUES (6,'Kite','Toys');` }
  ],
  muts: [['a tie goes to the name that comes first', 'units DESC, product', 'units DESC'], ['products with no sales are ignored', 'JOIN order_items', 'LEFT JOIN order_items'], ['one total per product, not per name', 'GROUP BY p.product_id, p.category, p.name', 'GROUP BY p.name'], ['the numbering restarts in each category', 'PARTITION BY category ORDER BY', 'ORDER BY'], ['the most units, not the fewest', 'ORDER BY units DESC, product', 'ORDER BY units, product']],
  hints: [
    'Three steps: total units per product (join the two tables, then GROUP BY), number the products inside each category, keep number 1.',
    '<code>WITH totals AS (SELECT p.product_id, p.category, p.name AS product, SUM(oi.qty) AS units FROM … JOIN … GROUP BY …), ranked AS (SELECT *, ROW_NUMBER() OVER (…) AS rn FROM totals) SELECT … WHERE rn = 1 …</code>',
    'Group by <code>p.product_id</code> (plus category and name), because two products can share a name. Rank with <code>ORDER BY units DESC, product</code> so Cap beats Tee when both sold 5.'
  ],
  explain: 'The full pattern: totals, rank, keep. Grouping by the product\'s id keeps two different products called Tee apart, and the second sort key settles the Cap/Tee tie.'
},
{
  id: 'top-two-spenders', title: 'Top two spenders in each city', level: 'Medium', type: 'Top-N per group', scenario: 'E-commerce',
  prompt: `<p>A customer's spend is the sum of their orders. For each city, return <code>city</code>, <code>name</code> and <code>total_spent</code> for every customer whose spend is one of the two highest spends in that city. Customers who tie are all included, so a city can return more than two rows. Customers with no orders are left out.</p><p>Order by <code>city</code>, then <code>total_spent</code> descending, then <code>name</code>.</p>`,
  setup: `
CREATE TABLE customers (customer_id INTEGER PRIMARY KEY, name TEXT, city TEXT);
CREATE TABLE orders (order_id INTEGER PRIMARY KEY, customer_id INTEGER, amount INTEGER);
INSERT INTO customers VALUES (1,'Ben','Irvine'),(2,'Ana','Irvine'),(3,'Cy','Irvine'),(4,'Di','Irvine'),(5,'Eve','Tustin'),(6,'Fay','Tustin'),(7,'Gus','Tustin');
INSERT INTO orders VALUES (1,1,300),(2,2,200),(3,2,100),(4,3,250),(5,4,100),(6,5,80),(7,6,30),(8,6,30),(9,7,20);`,
  ref: `WITH totals AS (
  SELECT c.customer_id, c.city, c.name, SUM(o.amount) AS total_spent
  FROM customers c
  JOIN orders o ON o.customer_id = c.customer_id
  GROUP BY c.customer_id, c.city, c.name
),
ranked AS (
  SELECT *,
         DENSE_RANK() OVER (PARTITION BY city ORDER BY total_spent DESC) AS rnk
  FROM totals
)
SELECT city, name, total_spent
FROM ranked
WHERE rnk <= 2
ORDER BY city, total_spent DESC, name;`,
  ordered: true,
  hidden: [
    { name: 'Orange has two customers: Hal spent 50 and Ivy has no orders', sql: `INSERT INTO customers VALUES (8,'Hal','Orange'),(9,'Ivy','Orange'); INSERT INTO orders VALUES (10,8,50);` },
    { name: 'A second Irvine customer named Ana (id 10) spent 40; she is a different person from Ana with id 2', sql: `INSERT INTO customers VALUES (10,'Ana','Irvine'); INSERT INTO orders VALUES (10,10,40);` }
  ],
  muts: [['the two highest spends, with ties sharing a place', 'DENSE_RANK()', 'RANK()'], ['customers who tie are all included', 'DENSE_RANK()', 'ROW_NUMBER()'], ['two highest spends, not one', 'rnk <= 2', 'rnk <= 1'], ['customers with no orders are left out', 'JOIN orders', 'LEFT JOIN orders'], ['one total per customer, not per name', 'GROUP BY c.customer_id, c.city, c.name', 'GROUP BY c.city, c.name'], ['the numbering restarts in each city', 'PARTITION BY city ORDER BY', 'ORDER BY']],
  hints: [
    'Totals per customer first. Then decide which ranking function fits "one of the two highest spends, ties included": Irvine\'s spends are 300, 300, 250, 100, and the answer should include the 250.',
    'In <code>ranked</code>: <code>___() OVER (PARTITION BY city ORDER BY total_spent DESC) AS rnk</code>, then <code>WHERE rnk &lt;= 2</code>. Try each function and use "Show step: ranked" to compare the numbers.',
    '<code>DENSE_RANK()</code> numbers 300, 300, 250, 100 as 1, 1, 2, 3. <code>RANK()</code> gives 1, 1, 3, 4 and loses the 250. Group by <code>c.customer_id</code> so two customers with the same name stay separate.'
  ],
  explain: '"The top N values, ties included" is DENSE_RANK() <= N. The inner join drops customers with no orders, and grouping by customer_id keeps the two Anas apart.'
},
{
  id: 'genre-by-age', title: 'Favorite genre by age group', level: 'Medium', type: 'Buckets and ranking', scenario: 'Streaming',
  prompt: `<p>Put each user in an age group: <code>'18-24'</code>, <code>'25-34'</code> or <code>'35+'</code> (every user is at least 18). For each age group that has views, return <code>age_group</code>, its favorite <code>genre</code> and that genre's total <code>minutes</code>. The favorite genre is the one with the most minutes watched. If two genres tie on minutes, the one with more views wins. No two genres in a group tie on both.</p><p>Order by <code>age_group</code>.</p>`,
  setup: `
CREATE TABLE users (user_id INTEGER PRIMARY KEY, age INTEGER);
CREATE TABLE views (view_id INTEGER PRIMARY KEY, user_id INTEGER, genre TEXT, minutes INTEGER);
INSERT INTO users VALUES (1,24),(2,25),(3,34),(4,35),(5,19),(6,52);
INSERT INTO views VALUES (1,1,'Comedy',60),(2,1,'Drama',30),(3,5,'Drama',30),(4,5,'Sci-Fi',50),
 (5,2,'Action',40),(6,3,'Action',20),(7,3,'Drama',55),
 (8,4,'Docs',45),(9,6,'Docs',10),(10,6,'Action',50);`,
  ref: `WITH totals AS (
  SELECT CASE WHEN u.age <= 24 THEN '18-24'
              WHEN u.age <= 34 THEN '25-34'
              ELSE '35+' END AS age_group,
         v.genre,
         SUM(v.minutes) AS minutes,
         COUNT(*) AS view_count
  FROM views v
  JOIN users u ON u.user_id = v.user_id
  GROUP BY age_group, v.genre
),
ranked AS (
  SELECT *,
         ROW_NUMBER() OVER (PARTITION BY age_group ORDER BY minutes DESC, view_count DESC) AS rn
  FROM totals
)
SELECT age_group, genre, minutes
FROM ranked
WHERE rn = 1
ORDER BY age_group;`,
  ordered: true,
  hidden: [
    { name: 'A user aged 70 watches 90 minutes of Opera', sql: `INSERT INTO users VALUES (7,70); INSERT INTO views VALUES (11,7,'Opera',90);` },
    { name: 'The views of users 2 and 3 are removed, so nobody aged 25-34 has views and that group does not appear', sql: `DELETE FROM views WHERE user_id IN (2,3);` }
  ],
  muts: [['age 24 is in 18-24', 'u.age <= 24', 'u.age < 24'], ['age 25 is in 25-34', 'u.age <= 24', 'u.age <= 25'], ['age 34 is in 25-34', 'u.age <= 34', 'u.age < 34'], ['age 35 is in 35+', 'u.age <= 34', 'u.age <= 35'], ['a tie on minutes goes to the genre with more views', 'minutes DESC, view_count DESC', 'minutes DESC'], ['the numbering restarts in each age group', 'PARTITION BY age_group ORDER BY', 'ORDER BY'], ['the most minutes, not the fewest', 'ORDER BY minutes DESC, view_count DESC', 'ORDER BY minutes, view_count DESC']],
  hints: [
    'One more step than before: the group you rank within (age group) is not a column yet. Build it with CASE in the totals step, then total minutes and count views per age group and genre.',
    '<code>WITH totals AS (SELECT CASE WHEN u.age &lt;= 24 THEN \'18-24\' WHEN … END AS age_group, v.genre, SUM(v.minutes) AS minutes, COUNT(*) AS view_count FROM views v JOIN users u … GROUP BY age_group, v.genre), ranked AS (…) …</code>',
    'Rank with <code>ROW_NUMBER() OVER (PARTITION BY age_group ORDER BY minutes DESC, view_count DESC)</code>. In 18-24, Comedy and Drama both have 60 minutes; Drama has two views, so it wins.'
  ],
  explain: 'When the grouping is a bucket you define (age group, season, quarter), build it with CASE in the first step and treat it like any other column after that. CASE takes the first branch that matches, so "<= 24, then <= 34, else" covers the ranges without gaps.'
},
{
  id: 'peak-station', title: 'Busiest station by time of day', level: 'Medium', type: 'Buckets and ranking', scenario: 'Bike share',
  prompt: `<p>Each ride starts at a station. Label each ride by the hour it started: <code>'Morning'</code> (5 to 11), <code>'Afternoon'</code> (12 to 16), <code>'Evening'</code> (17 to 21) or <code>'Night'</code> (22 to 4).</p><p>For each time of day that has rides, return <code>time_of_day</code>, the busiest <code>station</code> (its name), its <code>ride_count</code> and its <code>total_minutes</code>. The busiest station has the most rides. If stations tie on rides, the one with more total minutes wins. If they still tie, take the name that comes first alphabetically.</p><p>Order by <code>ride_count</code> descending, then <code>time_of_day</code>.</p>`,
  setup: `
CREATE TABLE stations (station_id INTEGER PRIMARY KEY, name TEXT);
CREATE TABLE rides (ride_id INTEGER PRIMARY KEY, station_id INTEGER, started_at TEXT, minutes INTEGER);
INSERT INTO stations VALUES (1,'Pier'),(2,'Dock'),(3,'Arch');
INSERT INTO rides VALUES
 (1,1,'2025-06-02 05:00:00',10),(2,1,'2025-06-02 11:59:00',20),(3,2,'2025-06-02 08:15:00',15),(4,2,'2025-06-03 09:00:00',15),(5,3,'2025-06-03 07:00:00',50),
 (6,3,'2025-06-02 12:00:00',5),(7,3,'2025-06-03 16:59:00',5),(8,2,'2025-06-02 13:00:00',30),(9,2,'2025-06-03 14:00:00',30),
 (10,2,'2025-06-02 17:00:00',12),(11,2,'2025-06-02 19:30:00',8),(12,2,'2025-06-03 21:59:00',25),(13,1,'2025-06-03 18:00:00',60),
 (14,3,'2025-06-02 22:00:00',20),(15,1,'2025-06-03 04:59:00',9),(16,1,'2025-06-03 00:30:00',11);`,
  ref: `WITH totals AS (
  SELECT CASE WHEN HOUR(r.started_at) BETWEEN 5 AND 11 THEN 'Morning'
              WHEN HOUR(r.started_at) BETWEEN 12 AND 16 THEN 'Afternoon'
              WHEN HOUR(r.started_at) BETWEEN 17 AND 21 THEN 'Evening'
              ELSE 'Night' END AS time_of_day,
         s.station_id,
         s.name AS station,
         COUNT(*) AS ride_count,
         SUM(r.minutes) AS total_minutes
  FROM rides r
  JOIN stations s ON s.station_id = r.station_id
  GROUP BY time_of_day, s.station_id, s.name
),
ranked AS (
  SELECT *,
         ROW_NUMBER() OVER (PARTITION BY time_of_day
                            ORDER BY ride_count DESC, total_minutes DESC, station) AS rn
  FROM totals
)
SELECT time_of_day, station, ride_count, total_minutes
FROM ranked
WHERE rn = 1
ORDER BY ride_count DESC, time_of_day;`,
  ordered: true,
  hidden: [
    { name: 'The three night rides are removed, so Night does not appear', sql: `DELETE FROM rides WHERE ride_id IN (14,15,16);` },
    { name: 'A second station named Dock (id 4) has one morning ride; it is a different station from Dock with id 2', sql: `INSERT INTO stations VALUES (4,'Dock'); INSERT INTO rides VALUES (17,4,'2025-06-04 10:00:00',5);` }
  ],
  muts: [['05:00 is Morning', 'BETWEEN 5 AND 11', 'BETWEEN 6 AND 11'], ['11:59 is Morning', 'BETWEEN 5 AND 11', 'BETWEEN 5 AND 10'], ['12:00 is Afternoon', 'BETWEEN 12 AND 16', 'BETWEEN 13 AND 16'], ['16:59 is Afternoon', 'BETWEEN 12 AND 16', 'BETWEEN 12 AND 15'], ['17:00 is Evening', 'BETWEEN 17 AND 21', 'BETWEEN 18 AND 21'], ['21:59 is Evening', 'BETWEEN 17 AND 21', 'BETWEEN 17 AND 20'],
    ['a tie on rides goes to more minutes', 'ride_count DESC, total_minutes DESC, station)', 'ride_count DESC, station)'], ['a tie on both goes to the name that comes first', 'total_minutes DESC, station)', 'total_minutes DESC)'], ['one total per station, not per name', 'GROUP BY time_of_day, s.station_id, s.name', 'GROUP BY time_of_day, s.name'], ['the numbering restarts for each time of day', 'PARTITION BY time_of_day\n                            ORDER BY', 'ORDER BY']],
  hints: [
    'Same three steps, with a bucket built from the hour. <code>HOUR(started_at)</code> gives 0 to 23. Night wraps past midnight (22, 23, 0 to 4), so it is easiest as the ELSE branch.',
    '<code>WITH totals AS (SELECT CASE WHEN HOUR(r.started_at) BETWEEN 5 AND 11 THEN \'Morning\' … ELSE \'Night\' END AS time_of_day, s.station_id, s.name AS station, COUNT(*) AS ride_count, SUM(r.minutes) AS total_minutes FROM rides r JOIN stations s … GROUP BY …), ranked AS (…) …</code>',
    'Three tie-break levels means three sort keys: <code>ROW_NUMBER() OVER (PARTITION BY time_of_day ORDER BY ride_count DESC, total_minutes DESC, station)</code>. The final ORDER BY is a separate thing: it sorts the winners, not the candidates.'
  ],
  explain: 'This is the shape of Seasonal Sales Analysis: bucket with CASE, total two measures per bucket and item, rank with one sort key per tie-break rule, keep number 1. The window\'s ORDER BY decides who wins; the final ORDER BY only decides how the winners are listed.'
},
{
  id: 'best-month', title: "Each rep's best month", level: 'Medium', type: 'Ranking with windows', scenario: 'Sales',
  prompt: `<p>Looking only at deals closed in 2025, find each rep's best month: the month with their highest total <code>amount</code>. If two months tie, take the more recent one.</p><p>Return <code>rep</code>, <code>month</code> as <code>'YYYY-MM'</code>, <code>best_total</code> and <code>pct_of_year</code>: the best month's total as a percentage of that rep's 2025 total, rounded to 1 decimal. Reps with no 2025 deals do not appear.</p><p>Order by <code>pct_of_year</code> descending, then <code>rep</code>.</p>`,
  setup: `
CREATE TABLE deals (deal_id INTEGER PRIMARY KEY, rep TEXT, closed_on TEXT, amount INTEGER);
INSERT INTO deals VALUES (1,'Ana','2025-01-10',100),(2,'Ana','2025-01-28',50),(3,'Ana','2025-03-05',150),(4,'Ana','2025-06-17',60),
 (5,'Bo','2025-02-11',200),(6,'Bo','2025-05-20',100),(7,'Bo','2024-12-30',900),
 (8,'Di','2025-07-01',30),(9,'Di','2025-07-19',40),(10,'Cy','2025-04-08',80);`,
  ref: `WITH monthly AS (
  SELECT rep, DATE_FORMAT(closed_on, '%Y-%m') AS month, SUM(amount) AS total
  FROM deals
  WHERE YEAR(closed_on) = 2025
  GROUP BY rep, month
),
ranked AS (
  SELECT *,
         ROW_NUMBER() OVER (PARTITION BY rep ORDER BY total DESC, month DESC) AS rn,
         SUM(total) OVER (PARTITION BY rep) AS year_total
  FROM monthly
)
SELECT rep, month, total AS best_total, ROUND(100.0 * total / year_total, 1) AS pct_of_year
FROM ranked
WHERE rn = 1
ORDER BY pct_of_year DESC, rep;`,
  ordered: true,
  hidden: [
    { name: "Eve's only deal closed in 2024, so she does not appear", sql: `INSERT INTO deals VALUES (11,'Eve','2024-08-09',500);` },
    { name: 'Ana closes a deal of 400 on 2026-01-15, outside 2025', sql: `INSERT INTO deals VALUES (11,'Ana','2026-01-15',400);` },
    { name: 'Bo closes another 100 in May 2025, so February and May tie at 200', sql: `INSERT INTO deals VALUES (11,'Bo','2025-05-27',100);` }
  ],
  muts: [['only deals closed in 2025', 'WHERE YEAR(closed_on) = 2025', ''], ['a tie goes to the more recent month', 'total DESC, month DESC', 'total DESC'], ['share of that rep\'s own year', 'SUM(total) OVER (PARTITION BY rep)', 'SUM(total) OVER ()'], ['the highest month, not the lowest', 'ORDER BY total DESC, month DESC', 'ORDER BY total, month DESC'], ['the numbering restarts for each rep', 'ROW_NUMBER() OVER (PARTITION BY rep ORDER BY', 'ROW_NUMBER() OVER (ORDER BY']],
  hints: [
    'Totals per rep and month first (filter to 2025 in that step). The ranking step can carry a second window: the rep\'s total for the whole year, which you need for the percentage.',
    'In <code>ranked</code>, add two columns: <code>ROW_NUMBER() OVER (PARTITION BY rep ORDER BY ___ DESC, ___ DESC) AS rn</code> and <code>SUM(total) OVER (PARTITION BY rep) AS year_total</code>.',
    'Rank with <code>ORDER BY total DESC, month DESC</code>: \'YYYY-MM\' text sorts in date order, so DESC puts the more recent month first. Then <code>ROUND(100.0 * total / year_total, 1)</code> on the row where rn = 1.'
  ],
  explain: 'Two windows over the same aggregated rows: one numbers each rep\'s months, the other adds up the rep\'s year. A window with PARTITION BY and no ORDER BY covers the whole partition, so every row carries the year total.'
},
{
  id: 'leader-runner-up', title: 'Leader, runner-up and the gap between them', level: 'Hard', type: 'Rank, then pivot', scenario: 'Retail',
  prompt: `<p>A store's total is the sum of its sales. For each region, return one row with <code>region</code>, <code>leader</code> (the store with the highest total), <code>runner_up</code> (the store with the second-highest total) and <code>gap</code> (the leader's total minus the runner-up's). If a region has only one store, <code>runner_up</code> and <code>gap</code> are NULL. No two stores in a region have the same total.</p><p>Order by <code>region</code>.</p>`,
  setup: `
CREATE TABLE store_sales (sale_id INTEGER PRIMARY KEY, region TEXT, store TEXT, amount INTEGER);
INSERT INTO store_sales VALUES (1,'West','Zed',100),(2,'West','Zed',200),(3,'West','Amy',250),(4,'West','Kai',400),
 (5,'East','Lux',90),(6,'East','Oak',60),(7,'East','Oak',50),(8,'North','Sol',75);`,
  ref: `WITH totals AS (
  SELECT region, store, SUM(amount) AS total
  FROM store_sales
  GROUP BY region, store
),
ranked AS (
  SELECT *,
         ROW_NUMBER() OVER (PARTITION BY region ORDER BY total DESC) AS rn
  FROM totals
)
SELECT region,
       MAX(CASE WHEN rn = 1 THEN store END) AS leader,
       MAX(CASE WHEN rn = 2 THEN store END) AS runner_up,
       MAX(CASE WHEN rn = 1 THEN total END) - MAX(CASE WHEN rn = 2 THEN total END) AS gap
FROM ranked
WHERE rn <= 2
GROUP BY region
ORDER BY region;`,
  ordered: true,
  hidden: [
    { name: 'South has four stores with totals 10, 40, 30 and 20', sql: `INSERT INTO store_sales VALUES (9,'South','Ash',10),(10,'South','Bay',40),(11,'South','Elm',30),(12,'South','Fir',20);` },
    { name: 'North gets a second store, Ivy, with sales of 80, which beats Sol', sql: `INSERT INTO store_sales VALUES (9,'North','Ivy',80);` }
  ],
  muts: [['a store\'s total is the sum of its sales', 'SUM(amount) AS total\n  FROM store_sales\n  GROUP BY region, store', 'amount AS total\n  FROM store_sales'], ['the highest total leads', 'ORDER BY total DESC', 'ORDER BY total'], ['the numbering restarts in each region', 'PARTITION BY region ORDER BY', 'ORDER BY'], ['the gap is leader minus runner-up', 'MAX(CASE WHEN rn = 1 THEN total END) - MAX(CASE WHEN rn = 2 THEN total END)', 'MAX(CASE WHEN rn = 2 THEN total END) - MAX(CASE WHEN rn = 1 THEN total END)']],
  hints: [
    'Totals and ranking as before. The new part is the last step: the leader and the runner-up are two rows (rn 1 and rn 2) that have to end up side by side in one row per region.',
    'Keep <code>rn &lt;= 2</code>, <code>GROUP BY region</code>, and pick each value with conditional aggregation: <code>MAX(CASE WHEN rn = 1 THEN store END) AS leader</code>, and the same idea for the runner-up and the two totals.',
    '<code>MAX(CASE WHEN rn = 2 THEN store END)</code> is NULL when a region has no second store, and a number minus NULL is NULL, so the one-store case works without extra code. (Another way: <code>LEAD(store) OVER (PARTITION BY region ORDER BY total DESC)</code> in the ranking step.)'
  ],
  explain: 'Rank, then pivot: once rows are numbered, MAX(CASE WHEN rn = k …) pulls the k-th row\'s values into columns. NULL handling comes for free, because a CASE with no match returns NULL.'
}
  ]
},
{
  id: 'growth-retention',
  title: 'Growth, retention and funnels',
  blurb: 'The metrics analysts report every week: active users, growth, new vs returning customers, funnels, cohort retention and churn. Business questions on realistic multi-table data, in the style of company interview questions.',
  lesson: {
    intro: `<p>Active users, growth, conversion, retention and churn look like different questions, but almost all of them have the same four steps:</p>
<ol>
  <li><b>Anchor.</b> Decide who you're measuring and the date everything is relative to: the signup date, the first order, the first visit. Usually a <code>MIN(date)</code> per person, or a column that's already there.</li>
  <li><b>Bucket.</b> Turn dates into periods: <code>DATE_FORMAT(d, '%Y-%m')</code> for months, or the gap from the anchor in days.</li>
  <li><b>Flag.</b> For each person, mark whether they did the thing with a <code>CASE</code> that gives 1 or 0. Use a <code>LEFT JOIN</code> so people who did nothing are still there, as zeros.</li>
  <li><b>Aggregate.</b> Per bucket: <code>COUNT(*)</code> for the population, <code>SUM(flag)</code> for the matches, and <code>100.0 * SUM(flag) / COUNT(*)</code> for the rate.</li>
</ol>
<p>Before writing any SQL, say the denominator out loud: <em>out of whom?</em> Most wrong answers to these questions have the right numerator and the wrong denominator.</p>`,
    setup: `
CREATE TABLE users (user_id INTEGER PRIMARY KEY, signup_date TEXT);
CREATE TABLE orders (order_id INTEGER PRIMARY KEY, user_id INTEGER, order_date TEXT);
INSERT INTO users VALUES (1,'2025-01-05'),(2,'2025-01-20'),(3,'2025-01-28'),(4,'2025-02-02'),(5,'2025-02-14');
INSERT INTO orders VALUES (1,1,'2025-01-07'),(2,1,'2025-01-20'),(3,2,'2025-03-15'),(4,4,'2025-02-03'),(5,5,'2025-03-01');`,
    question: 'For each signup month, what share of new users placed their first order within 30 days of signing up?',
    sql: `WITH cohorts AS (
  SELECT user_id, signup_date, DATE_FORMAT(signup_date, '%Y-%m') AS cohort
  FROM users
),
first_orders AS (
  SELECT user_id, MIN(order_date) AS first_order
  FROM orders
  GROUP BY user_id
),
flagged AS (
  SELECT c.cohort, c.user_id,
         CASE WHEN DATEDIFF(f.first_order, c.signup_date) <= 30 THEN 1 ELSE 0 END AS converted
  FROM cohorts c
  LEFT JOIN first_orders f ON f.user_id = c.user_id
)
SELECT cohort,
       COUNT(*) AS users,
       SUM(converted) AS converted,
       ROUND(100.0 * SUM(converted) / COUNT(*), 1) AS conversion_pct
FROM flagged
GROUP BY cohort
ORDER BY cohort;`,
    stepNotes: {
      cohorts: 'Step 1, anchor and bucket: each user with their signup date and signup month.',
      first_orders: 'Step 2, anchor the behavior: each user\'s first order. User 3 never ordered, so there\'s no row for them here.',
      flagged: 'Step 3, flag: the LEFT JOIN keeps user 3 with a NULL first order. DATEDIFF of NULL is NULL, so the CASE falls through to 0.',
      '': 'Step 4, aggregate: per cohort, the population, the matches and the rate. January is 1 of 3 because user 3 stays in the denominator.'
    },
    outro: `<h3>Traps to check every time</h3>
<ul>
  <li><b>People or events?</b> "Active customers" counts people: <code>COUNT(DISTINCT customer_id)</code>, not <code>COUNT(*)</code>.</li>
  <li><b>Who's in the denominator?</b> An inner join drops everyone with no activity, which inflates every rate. Start from the population table and <code>LEFT JOIN</code> the activity.</li>
  <li><b>Which rows count?</b> Cancelled orders, no-shows and test accounts usually don't. Filter them before you find anyone's "first" anything.</li>
  <li><b>Filter before you look back.</b> When comparing with the previous period, filter the date range first, and use <code>PARTITION BY</code> so <code>LAG</code> never reaches into another region or product.</li>
  <li><b>Month arithmetic.</b> "The next month" after December is January of the next year. Use <code>DATE_ADD(d, INTERVAL 1 MONTH)</code>, not <code>MONTH(d) + 1</code>.</li>
</ul>`
  },
  checks: [
    { id: 'gr-c1', q: 'Customer 7 placed 3 orders in March. Which expression counts customer 7 once in March\'s active customers?',
      choices: ['COUNT(*)', 'COUNT(customer_id)', 'COUNT(DISTINCT customer_id)', 'SUM(1)'], answer: 2,
      why: 'COUNT(*), COUNT(customer_id) and SUM(1) all count rows, so customer 7 counts three times. COUNT(DISTINCT customer_id) counts each person once.' },
    { id: 'gr-c2', q: 'After `users u LEFT JOIN orders o`, user 3 (who has no orders) appears in one row. Grouped by user, what do `COUNT(*)` and `COUNT(o.order_id)` give for user 3?',
      choices: ['1 and 1', '1 and 0', '0 and 0', '0 and 1'], answer: 1,
      why: 'The LEFT JOIN keeps user 3 as one row with NULLs on the orders side. COUNT(*) counts that row; COUNT(o.order_id) skips NULLs. That\'s why per-user counts use a column from the joined table.' },
    { id: 'gr-c3', q: 'Monthly revenue has one row per region and month. What can `LAG(revenue) OVER (ORDER BY month)` return on West\'s January row?',
      choices: ['Always NULL', 'Another region\'s revenue', 'West\'s revenue from last December', 'An error'], answer: 1,
      why: 'Without PARTITION BY region, all rows form one sequence ordered by month, so the row before West\'s January can be East\'s January. Add PARTITION BY region to compare each region with itself.' },
    { id: 'gr-c4', q: 'A user signed up on 2025-12-15. Which gives the month they must come back in to count as retained next month?',
      choices: ['MONTH(signup_date) + 1', "DATE_FORMAT(DATE_ADD(signup_date, INTERVAL 1 MONTH), '%Y-%m')", "DATE_FORMAT(signup_date, '%Y-%m') + 1", 'YEAR(signup_date) * 100 + 13'], answer: 1,
      why: 'MONTH(signup_date) + 1 is 13, which isn\'t a month. DATE_ADD rolls over to 2026-01, and it also handles month ends: Jan 31 plus one month is Feb 28.' }
  ],
  followups: [
    { n: 550, title: 'Game Play Analysis IV', slug: 'game-play-analysis-iv' },
    { n: 1141, title: 'User Activity for the Past 30 Days I', slug: 'user-activity-for-the-past-30-days-i' },
    { n: 1174, title: 'Immediate Food Delivery II', slug: 'immediate-food-delivery-ii' },
    { n: 1193, title: 'Monthly Transactions I', slug: 'monthly-transactions-i' }
  ],
  problems: [
{
  id: 'no-show-rate', title: 'No-show rate by clinic', level: 'Easy', type: 'Rates', scenario: 'Healthcare operations · ClinicFlow',
  prompt: `<p>ClinicFlow runs several clinics. Each appointment's <code>status</code> is <code>'completed'</code>, <code>'no_show'</code> or <code>'cancelled'</code>.</p><p>Using appointments dated in 2025, return for each clinic: <code>clinic</code>, <code>booked</code> (appointments that were completed or no-shows; cancelled ones don't count), <code>no_shows</code> and <code>no_show_rate</code>, the no-shows as a percentage of booked, rounded to 1 decimal. Clinics with no booked appointments in 2025 don't appear.</p><p>Order by <code>no_show_rate</code> descending, then <code>clinic</code>.</p>`,
  setup: `
CREATE TABLE appointments (appt_id INTEGER PRIMARY KEY, patient_id INTEGER, clinic TEXT, appt_date TEXT, status TEXT);
INSERT INTO appointments VALUES
 (1,11,'Irvine','2025-01-06','completed'),(2,12,'Irvine','2025-01-09','no_show'),(3,13,'Irvine','2025-02-11','completed'),
 (4,14,'Irvine','2025-03-03','completed'),(5,15,'Irvine','2025-03-04','cancelled'),(6,16,'Irvine','2024-12-30','no_show'),
 (7,21,'Tustin','2025-01-14','completed'),(8,22,'Tustin','2025-02-02','no_show'),(9,23,'Tustin','2025-02-20','completed'),
 (10,24,'Tustin','2026-01-02','no_show'),
 (11,31,'Orange','2025-01-21','completed'),(12,32,'Orange','2025-02-18','completed'),(13,33,'Orange','2025-03-25','no_show'),
 (14,34,'Orange','2025-04-08','completed');`,
  ref: `SELECT clinic,
       COUNT(*) AS booked,
       SUM(CASE WHEN status = 'no_show' THEN 1 ELSE 0 END) AS no_shows,
       ROUND(100.0 * SUM(CASE WHEN status = 'no_show' THEN 1 ELSE 0 END) / COUNT(*), 1) AS no_show_rate
FROM appointments
WHERE status IN ('completed', 'no_show')
  AND appt_date >= '2025-01-01' AND appt_date < '2026-01-01'
GROUP BY clinic
ORDER BY no_show_rate DESC, clinic;`,
  ordered: true,
  hidden: [
    { name: 'Laguna\'s only 2025 appointments were cancelled, so Laguna doesn\'t appear', sql: `INSERT INTO appointments VALUES (15,41,'Laguna','2025-05-05','cancelled'),(16,42,'Laguna','2025-06-12','cancelled');` },
    { name: 'Brea had four completed appointments and no no-shows (0.0%)', sql: `INSERT INTO appointments VALUES (15,51,'Brea','2025-02-03','completed'),(16,52,'Brea','2025-04-14','completed'),(17,53,'Brea','2025-07-21','completed'),(18,54,'Brea','2025-11-30','completed');` },
    { name: '4,000 appointments at 12 clinics from October 2024 to February 2026', build: g => {
      const clinics = ['Anaheim', 'Brea', 'Costa Mesa', 'Fullerton', 'Garden Grove', 'Huntington', 'Laguna', 'Mission Viejo', 'Newport', 'Santa Ana', 'Westminster', 'Yorba Linda'], rows = [];
      const risk = Object.fromEntries(clinics.map(c => [c, g.int(4, 20)]));
      for (let i = 0; i < 4000; i++) { const c = g.pick(clinics); rows.push([1000 + i, g.int(1000, 3999), c, g.date('2024-10-01', '2026-02-28'), g.weighted([['completed', 100 - risk[c]], ['no_show', risk[c]], ['cancelled', 15]])]); }
      return g.insert('appointments', rows);
    } }
  ],
  muts: [['cancelled appointments are not booked', "WHERE status IN ('completed', 'no_show')\n  AND", 'WHERE'], ['only appointments dated in 2025', "\n  AND appt_date >= '2025-01-01' AND appt_date < '2026-01-01'", '']],
  hints: [
    'Out of whom? The denominator is booked appointments: completed plus no-shows. Filter out cancelled ones and other years in WHERE, then count per clinic.',
    '<code>SELECT clinic, COUNT(*) AS booked, SUM(CASE WHEN status = \'no_show\' THEN 1 ELSE 0 END) AS no_shows, … FROM appointments WHERE status IN (…) AND appt_date … GROUP BY clinic</code>',
    'The rate is <code>ROUND(100.0 * SUM(CASE WHEN status = \'no_show\' THEN 1 ELSE 0 END) / COUNT(*), 1)</code>. Because cancelled rows are filtered out, COUNT(*) is exactly the booked appointments.'
  ],
  explain: 'A rate is a conditional count over a population. Filtering the population in WHERE (not booked = cancelled, other years) makes COUNT(*) the denominator, and SUM(CASE …) counts the matches inside it.'
},
{
  id: 'monthly-active', title: 'Monthly active customers', level: 'Easy', type: 'Active users', scenario: 'E-commerce · Brightcart',
  prompt: `<p>Brightcart counts a customer as active in a month if they placed at least one order that month that wasn't cancelled (<code>status = 'cancelled'</code>). Other statuses are <code>'delivered'</code> and <code>'shipped'</code>.</p><p>For each month of 2025 that has at least one active customer, return <code>month</code> as <code>'YYYY-MM'</code> and <code>active_customers</code>.</p><p>Order by <code>month</code>.</p>`,
  setup: `
CREATE TABLE orders (order_id INTEGER PRIMARY KEY, customer_id INTEGER, order_date TEXT, status TEXT, amount INTEGER);
INSERT INTO orders VALUES
 (1,1,'2025-01-04','delivered',40),(2,1,'2025-01-19','delivered',25),(3,2,'2025-01-22','shipped',60),(4,3,'2025-01-30','cancelled',80),
 (5,1,'2025-02-02','delivered',35),(6,3,'2025-02-14','delivered',90),
 (7,2,'2025-03-08','cancelled',20),(8,2,'2025-03-09','delivered',20),
 (9,4,'2024-12-28','delivered',75),(10,5,'2026-01-03','delivered',15);`,
  ref: `SELECT DATE_FORMAT(order_date, '%Y-%m') AS month,
       COUNT(DISTINCT customer_id) AS active_customers
FROM orders
WHERE status <> 'cancelled'
  AND order_date >= '2025-01-01' AND order_date < '2026-01-01'
GROUP BY month
ORDER BY month;`,
  ordered: true,
  hidden: [
    { name: 'Customer 6\'s only April order was cancelled, so April has no active customers and doesn\'t appear', sql: `INSERT INTO orders VALUES (11,6,'2025-04-11','cancelled',50);` },
    { name: '5,000 orders from 800 customers between November 2024 and February 2026', build: g => {
      const rows = [];
      for (let i = 0; i < 5000; i++) rows.push([1000 + i, g.int(1000, 1799), g.date('2024-11-01', '2026-02-28'), g.weighted([['delivered', 75], ['shipped', 12], ['cancelled', 13]]), g.int(5, 300)]);
      return g.insert('orders', rows);
    } }
  ],
  muts: [['each customer once per month', 'COUNT(DISTINCT customer_id)', 'COUNT(customer_id)'], ['cancelled orders don\'t count', "WHERE status <> 'cancelled'\n  AND", 'WHERE'], ['only 2025', "\n  AND order_date >= '2025-01-01' AND order_date < '2026-01-01'", '']],
  hints: [
    'Two filters (not cancelled, in 2025), then one row per month. The count is of people, not orders.',
    '<code>SELECT DATE_FORMAT(order_date, \'%Y-%m\') AS month, COUNT(___) AS active_customers FROM orders WHERE … GROUP BY month ORDER BY month</code>',
    '<code>COUNT(DISTINCT customer_id)</code>. Customer 1 ordered twice in January but is one active customer.'
  ],
  explain: 'Active users is COUNT(DISTINCT person) per period, after removing the activity that doesn\'t count. Filtering cancelled orders in WHERE also means a month with only cancelled orders has no row at all.'
},
{
  id: 'signup-funnel', title: 'Activation funnel by signup channel', level: 'Medium', type: 'Funnel', scenario: 'SaaS · TaskPilot',
  prompt: `<p>TaskPilot logs product events in <code>events</code>. The <code>event_type</code> values that matter are <code>'create_project'</code> and <code>'upgrade'</code>; there are others, and a user's events can repeat.</p><p>For each signup <code>channel</code>, return <code>channel</code>, <code>signups</code> (users who signed up through it), <code>activated</code> (those users with at least one <code>create_project</code> event), <code>upgraded</code> (those with at least one <code>upgrade</code> event) and <code>activation_rate</code>: activated as a percentage of signups, rounded to 1 decimal. Events from users who aren't in <code>users</code> are ignored.</p><p>Order by <code>signups</code> descending, then <code>channel</code>.</p>`,
  setup: `
CREATE TABLE users (user_id INTEGER PRIMARY KEY, signup_date TEXT, channel TEXT);
CREATE TABLE events (event_id INTEGER PRIMARY KEY, user_id INTEGER, event_type TEXT, event_time TEXT);
INSERT INTO users VALUES (1,'2025-03-01','ads'),(2,'2025-03-02','ads'),(3,'2025-03-02','ads'),(4,'2025-03-05','ads'),
 (5,'2025-03-03','organic'),(6,'2025-03-06','organic'),(7,'2025-03-07','organic'),
 (8,'2025-03-01','referral'),(9,'2025-03-04','referral'),(10,'2025-03-08','referral');
INSERT INTO events VALUES
 (1,1,'create_project','2025-03-01 10:00:00'),(2,1,'create_project','2025-03-03 09:30:00'),(3,1,'upgrade','2025-03-10 12:00:00'),
 (4,2,'create_project','2025-03-02 15:00:00'),(5,3,'invite_teammate','2025-03-04 11:00:00'),
 (6,5,'create_project','2025-03-03 08:00:00'),(7,7,'create_project','2025-03-07 13:00:00'),(8,7,'upgrade','2025-03-09 16:00:00'),
 (9,7,'upgrade','2025-04-09 16:00:00'),(10,9,'create_project','2025-03-05 10:00:00'),
 (11,10,'create_project','2025-03-08 09:00:00'),(12,10,'create_project','2025-03-09 09:00:00'),(13,10,'create_project','2025-03-11 09:00:00');`,
  ref: `WITH flags AS (
  SELECT u.user_id,
         u.channel,
         MAX(CASE WHEN e.event_type = 'create_project' THEN 1 ELSE 0 END) AS did_create,
         MAX(CASE WHEN e.event_type = 'upgrade' THEN 1 ELSE 0 END) AS did_upgrade
  FROM users u
  LEFT JOIN events e ON e.user_id = u.user_id
  GROUP BY u.user_id, u.channel
)
SELECT channel,
       COUNT(*) AS signups,
       SUM(did_create) AS activated,
       SUM(did_upgrade) AS upgraded,
       ROUND(100.0 * SUM(did_create) / COUNT(*), 1) AS activation_rate
FROM flags
GROUP BY channel
ORDER BY signups DESC, channel;`,
  ordered: true,
  hidden: [
    { name: 'A new channel, podcast, brings 2 users who have no events at all', sql: `INSERT INTO users VALUES (11,'2025-03-10','podcast'),(12,'2025-03-11','podcast');` },
    { name: 'Events from user_id 999, a deleted account that isn\'t in users', sql: `INSERT INTO events VALUES (14,999,'create_project','2025-03-12 10:00:00'),(15,999,'upgrade','2025-03-13 10:00:00');` },
    { name: '1,500 users from 6 channels and about 6,000 events, including events from deleted accounts', build: g => {
      const channels = [['ads', 30], ['organic', 25], ['referral', 15], ['partner', 10], ['social', 12], ['webinar', 8]], users = [], events = [];
      const act = { ads: 0.35, organic: 0.55, referral: 0.6, partner: 0.45, social: 0.3, webinar: 0.65 };
      let eid = 1000;
      for (let i = 0; i < 1500; i++) {
        const id = 1000 + i, ch = g.weighted(channels), day = g.date('2025-01-01', '2025-06-30');
        users.push([id, day, ch]);
        const ev = (type, n) => { for (let k = 0; k < n; k++) events.push([eid++, id, type, `${g.addDays(day, g.int(0, 40))} ${g.time()}`]); };
        if (g.chance(0.5)) ev('view_dashboard', g.int(1, 4));
        if (g.chance(act[ch])) { ev('create_project', g.int(1, 5)); if (g.chance(0.4)) ev('invite_teammate', g.int(1, 3)); if (g.chance(0.25)) ev('upgrade', g.int(1, 2)); }
      }
      for (let k = 0; k < 60; k++) events.push([eid++, g.int(90000, 90020), g.pick(['create_project', 'upgrade']), `${g.date('2025-01-01', '2025-06-30')} ${g.time()}`]);
      return g.insert('users', users) + g.insert('events', g.shuffle(events));
    } }
  ],
  muts: [['users with no events still count as signups', 'LEFT JOIN events', 'JOIN events'], ['a user counts once, however many events', 'MAX(CASE WHEN e.event_type = \'create_project\' THEN 1 ELSE 0 END)', 'SUM(CASE WHEN e.event_type = \'create_project\' THEN 1 ELSE 0 END)'], ['upgraded is about upgrade events', "MAX(CASE WHEN e.event_type = 'upgrade' THEN 1 ELSE 0 END)", "MAX(CASE WHEN e.event_type = 'invite_teammate' THEN 1 ELSE 0 END)"]],
  hints: [
    'Out of whom? Every user who signed up, including those who never did anything. Start from users, not from events.',
    'First make one row per user with two flags: <code>MAX(CASE WHEN e.event_type = \'create_project\' THEN 1 ELSE 0 END) AS did_create</code> from <code>users u LEFT JOIN events e</code>, grouped by user. Then sum the flags per channel.',
    'MAX of a 0/1 flag means "at least once", so a user with three projects still counts once. COUNT(*) over the per-user rows is the number of signups.'
  ],
  explain: 'Funnels are per-person flags, then sums. Building one row per user first (MAX of a CASE) stops repeated events from inflating counts, and starting from users with a LEFT JOIN keeps the people who dropped out, which is the whole point of a funnel.'
},
{
  id: 'region-growth', title: 'Revenue growth by region', level: 'Medium', type: 'Growth rate', scenario: 'E-commerce · Brightcart',
  prompt: `<p>Each order belongs to a customer, and each customer to a <code>region</code>. Revenue is the sum of <code>amount</code> for orders that weren't cancelled.</p><p>For each region and each month of the first quarter of 2025 (January to March), return <code>region</code>, <code>month</code> (<code>'YYYY-MM'</code>), <code>revenue</code>, <code>prev_revenue</code> (the same region's revenue in the previous month; NULL for January) and <code>growth_pct</code>: the percentage change from <code>prev_revenue</code>, rounded to 1 decimal (NULL for January). Every region has revenue in every month of the quarter.</p><p>Order by <code>region</code>, then <code>month</code>.</p>`,
  setup: `
CREATE TABLE customers (customer_id INTEGER PRIMARY KEY, region TEXT);
CREATE TABLE orders (order_id INTEGER PRIMARY KEY, customer_id INTEGER, order_date TEXT, status TEXT, amount INTEGER);
INSERT INTO customers VALUES (1,'West'),(2,'West'),(3,'East'),(4,'East');
INSERT INTO orders VALUES
 (1,1,'2024-12-20','delivered',500),(2,1,'2025-01-08','delivered',100),(3,2,'2025-01-22','delivered',50),
 (4,2,'2025-02-10','delivered',300),(5,1,'2025-02-12','cancelled',999),(6,1,'2025-03-05','delivered',245),
 (7,3,'2025-01-15','delivered',200),(8,4,'2025-02-03','delivered',150),(9,3,'2025-03-18','delivered',150),(10,4,'2025-03-27','delivered',30);`,
  ref: `WITH monthly AS (
  SELECT c.region,
         DATE_FORMAT(o.order_date, '%Y-%m') AS month,
         SUM(o.amount) AS revenue
  FROM orders o
  JOIN customers c ON c.customer_id = o.customer_id
  WHERE o.status <> 'cancelled'
    AND o.order_date >= '2025-01-01' AND o.order_date < '2025-04-01'
  GROUP BY c.region, month
)
SELECT region,
       month,
       revenue,
       LAG(revenue) OVER (PARTITION BY region ORDER BY month) AS prev_revenue,
       ROUND(100.0 * (revenue - LAG(revenue) OVER (PARTITION BY region ORDER BY month))
             / LAG(revenue) OVER (PARTITION BY region ORDER BY month), 1) AS growth_pct
FROM monthly
ORDER BY region, month;`,
  ordered: true,
  hidden: [
    { name: 'Orders on 2025-03-31 (in the quarter) and 2025-04-01 (outside it)', sql: `INSERT INTO orders VALUES (11,3,'2025-03-31','delivered',70),(12,3,'2025-04-01','delivered',400);` },
    { name: 'A third region, North, whose revenue falls by two thirds in February', sql: `INSERT INTO customers VALUES (5,'North'); INSERT INTO orders VALUES (11,5,'2025-01-09','delivered',300),(12,5,'2025-02-09','delivered',100),(13,5,'2025-03-09','delivered',130);` },
    { name: '600 customers in 6 regions and 6,000 orders from December 2024 to April 2025', build: g => {
      const regions = ['Central', 'Coast', 'Desert', 'Inland', 'Metro', 'Mountain'], customers = [], orders = [];
      for (let i = 0; i < 600; i++) customers.push([1000 + i, regions[i % 6]]);
      let id = 1000;
      regions.forEach((r, k) => ['01', '02', '03'].forEach(m => orders.push([id++, 1000 + k, `2025-${m}-15`, 'delivered', g.int(50, 500)])));
      while (orders.length < 6000) orders.push([id++, g.int(1000, 1599), g.date('2024-12-01', '2025-04-30'), g.weighted([['delivered', 80], ['shipped', 10], ['cancelled', 10]]), g.int(5, 400)]);
      return g.insert('customers', customers) + g.insert('orders', g.shuffle(orders));
    } }
  ],
  muts: [['compare each region with itself', 'PARTITION BY region ', ''], ['cancelled orders aren\'t revenue', "WHERE o.status <> 'cancelled'\n    AND", 'WHERE'], ['only the first quarter of 2025, filtered before LAG', "\n    AND o.order_date >= '2025-01-01' AND o.order_date < '2025-04-01'", '']],
  hints: [
    'Two steps: revenue per region and month (join orders to customers, filter, GROUP BY), then compare each month with the one before it in the same region.',
    '<code>WITH monthly AS (SELECT c.region, DATE_FORMAT(o.order_date, \'%Y-%m\') AS month, SUM(o.amount) AS revenue FROM orders o JOIN customers c … WHERE … GROUP BY c.region, month) SELECT …, LAG(revenue) OVER (PARTITION BY ___ ORDER BY ___) AS prev_revenue …</code>',
    'Filter the quarter inside <code>monthly</code>, so December 2024 never becomes January\'s previous month. The growth is <code>ROUND(100.0 * (revenue - prev) / prev, 1)</code> with the same LAG expression for prev.'
  ],
  explain: 'Growth by segment is LAG with PARTITION BY the segment. The date filter has to happen before the window runs; otherwise the period just before the range leaks into the first month\'s comparison.'
},
{
  id: 'new-vs-returning', title: 'New vs returning customers each month', level: 'Medium', type: 'New vs returning', scenario: 'E-commerce · Brightcart',
  prompt: `<p>A customer's first order is their earliest order that wasn't cancelled, at any time (including before 2025).</p><p>For each month of 2025 with at least one non-cancelled order, return <code>month</code> (<code>'YYYY-MM'</code>), <code>new_customers</code> (customers whose first order was in that month) and <code>returning_customers</code> (customers who placed a non-cancelled order that month and whose first order was in an earlier month). Each customer counts at most once per month.</p><p>Order by <code>month</code>.</p>`,
  setup: `
CREATE TABLE orders (order_id INTEGER PRIMARY KEY, customer_id INTEGER, order_date TEXT, status TEXT, amount INTEGER);
INSERT INTO orders VALUES
 (1,1,'2024-11-14','delivered',50),(2,1,'2025-01-03','delivered',20),(3,1,'2025-01-25','delivered',35),
 (4,2,'2024-12-29','cancelled',80),(5,2,'2025-01-10','delivered',80),
 (6,3,'2025-01-12','delivered',15),(7,3,'2025-01-20','delivered',40),(8,3,'2025-02-07','shipped',60),
 (9,4,'2025-02-18','delivered',25),(10,5,'2025-03-02','cancelled',90),(11,6,'2025-03-21','delivered',45);`,
  ref: `WITH valid AS (
  SELECT customer_id, order_date
  FROM orders
  WHERE status <> 'cancelled'
),
firsts AS (
  SELECT customer_id, MIN(order_date) AS first_date
  FROM valid
  GROUP BY customer_id
),
monthly AS (
  SELECT DISTINCT v.customer_id,
         DATE_FORMAT(v.order_date, '%Y-%m') AS month,
         DATE_FORMAT(f.first_date, '%Y-%m') AS first_month
  FROM valid v
  JOIN firsts f ON f.customer_id = v.customer_id
)
SELECT month,
       SUM(CASE WHEN month = first_month THEN 1 ELSE 0 END) AS new_customers,
       SUM(CASE WHEN month > first_month THEN 1 ELSE 0 END) AS returning_customers
FROM monthly
WHERE month BETWEEN '2025-01' AND '2025-12'
GROUP BY month
ORDER BY month;`,
  ordered: true,
  hidden: [
    { name: 'Customer 7\'s first order was cancelled in March 2025 and their next order is in June, so they are new in June', sql: `INSERT INTO orders VALUES (12,7,'2025-03-30','cancelled',30),(13,7,'2025-06-02','delivered',30);` },
    { name: '5,000 orders from 900 customers between January 2024 and February 2026', build: g => {
      const rows = [];
      for (let c = 1000; c < 1900; c++) {
        let d = g.date('2024-01-01', '2025-12-15');
        for (let k = g.weighted([[1, 3], [3, 3], [6, 3], [12, 1]]); k > 0 && d <= '2026-02-28'; k--) { rows.push([c, d, g.weighted([['delivered', 78], ['shipped', 10], ['cancelled', 12]]), g.int(5, 300)]); d = g.addDays(d, g.weighted([[0, 1], [g.int(1, 30), 3], [g.int(31, 120), 3]])); }
      }
      return g.insert('orders', g.shuffle(rows).map((r, i) => [1000 + i].concat(r)));
    } }
  ],
  muts: [['a cancelled order is never a first order, and isn\'t activity', "  WHERE status <> 'cancelled'\n", ''], ['each customer at most once per month', 'SELECT DISTINCT v.customer_id', 'SELECT v.customer_id'], ['only months of 2025', "WHERE month BETWEEN '2025-01' AND '2025-12'\n", ''], ['first order at any time, not just in 2025', '  FROM valid\n  GROUP BY customer_id', "  FROM valid\n  WHERE order_date >= '2025-01-01'\n  GROUP BY customer_id"]],
  hints: [
    'Anchor first: each customer\'s first valid order date, over all time. Then make one row per customer per month they were active, and compare that month with their first month.',
    '<code>WITH valid AS (…not cancelled…), firsts AS (SELECT customer_id, MIN(order_date) AS first_date FROM valid GROUP BY customer_id), monthly AS (SELECT DISTINCT v.customer_id, DATE_FORMAT(v.order_date, …) AS month, DATE_FORMAT(f.first_date, …) AS first_month FROM valid v JOIN firsts f …) …</code>',
    'Then <code>SUM(CASE WHEN month = first_month THEN 1 ELSE 0 END)</code> for new and <code>month &gt; first_month</code> for returning, filtering to 2025 at the end. Filtering to 2025 before taking MIN would make customer 1 look new.'
  ],
  explain: 'The anchor (first order) has to be found over all history and over valid rows only; only the report is restricted to 2025. Comparing \'YYYY-MM\' strings works because they sort in date order.'
},
{
  id: 'cohort-retention', title: 'Next-month retention by signup cohort', level: 'Hard', type: 'Cohort retention', scenario: 'SaaS · TaskPilot',
  prompt: `<p>A user's cohort is the month they signed up. A user is <em>retained</em> if they have at least one event in the calendar month right after their signup month. For example, someone who signed up in December 2025 needs an event in January 2026.</p><p>For each cohort of 2025, return <code>cohort</code> (<code>'YYYY-MM'</code>), <code>users</code> (signups that month), <code>retained</code> and <code>retention_pct</code>: retained as a percentage of users, rounded to 1 decimal.</p><p>Order by <code>cohort</code>.</p>`,
  setup: `
CREATE TABLE users (user_id INTEGER PRIMARY KEY, signup_date TEXT);
CREATE TABLE events (event_id INTEGER PRIMARY KEY, user_id INTEGER, event_time TEXT);
INSERT INTO users VALUES (1,'2025-01-05'),(2,'2025-01-31'),(3,'2025-01-20'),(4,'2025-02-10'),(5,'2025-02-14'),(6,'2024-12-15'),(7,'2025-02-27'),(8,'2025-02-20');
INSERT INTO events VALUES
 (1,1,'2025-02-03 09:00:00'),(2,2,'2025-02-28 18:00:00'),(3,3,'2025-01-25 10:00:00'),(4,3,'2025-03-02 10:00:00'),
 (5,4,'2025-03-01 08:00:00'),(6,4,'2025-03-01 09:00:00'),(7,6,'2025-01-05 12:00:00'),(8,7,'2025-03-31 23:00:00'),(9,8,'2025-02-21 11:00:00');`,
  ref: `WITH cohorts AS (
  SELECT user_id,
         DATE_FORMAT(signup_date, '%Y-%m') AS cohort,
         DATE_FORMAT(DATE_ADD(signup_date, INTERVAL 1 MONTH), '%Y-%m') AS next_month
  FROM users
  WHERE signup_date >= '2025-01-01' AND signup_date < '2026-01-01'
),
retained AS (
  SELECT DISTINCT c.user_id
  FROM cohorts c
  JOIN events e ON e.user_id = c.user_id
               AND DATE_FORMAT(e.event_time, '%Y-%m') = c.next_month
)
SELECT c.cohort,
       COUNT(*) AS users,
       COUNT(r.user_id) AS retained,
       ROUND(100.0 * COUNT(r.user_id) / COUNT(*), 1) AS retention_pct
FROM cohorts c
LEFT JOIN retained r ON r.user_id = c.user_id
GROUP BY c.cohort
ORDER BY c.cohort;`,
  ordered: true,
  hidden: [
    { name: 'Ivy (user 9) signs up on 2025-12-30 and comes back on 2026-01-02: cohort 2025-12, retained', sql: `INSERT INTO users VALUES (9,'2025-12-30'); INSERT INTO events VALUES (10,9,'2026-01-02 10:00:00');` },
    { name: 'Users who signed up in late 2024 and early 2026 aren\'t 2025 cohorts', sql: `INSERT INTO users VALUES (9,'2024-12-31'),(10,'2026-01-01'); INSERT INTO events VALUES (10,9,'2025-01-02 10:00:00'),(11,10,'2026-02-02 10:00:00');` },
    { name: '2,000 signups from November 2024 to January 2026 (including month ends) and about 14,000 events', build: g => {
      const users = [], events = []; let eid = 1000;
      for (let i = 0; i < 2000; i++) {
        const id = 1000 + i, d = g.chance(0.1) ? g.pick(['2025-01-31', '2025-03-31', '2025-05-31', '2025-08-31', '2025-10-31', '2025-12-31', '2025-01-30', '2024-12-31']) : g.date('2024-11-01', '2026-01-31');
        users.push([id, d]);
        const firstOfNext = g.addDays(d.slice(0, 8) + '01', 32).slice(0, 8) + '01';
        if (g.chance(0.4)) for (let k = g.int(1, 4); k > 0; k--) events.push([eid++, id, `${g.date(firstOfNext, g.addDays(firstOfNext, 27))} ${g.time()}`]);
        for (let k = g.int(0, 6); k > 0; k--) events.push([eid++, id, `${g.addDays(d, g.int(0, 120))} ${g.time()}`]);
      }
      return g.insert('users', users) + g.insert('events', g.shuffle(events));
    } }
  ],
  muts: [['an event in the next month, not any later month', '= c.next_month', '>= c.next_month'], ['a retained user counts once', 'SELECT DISTINCT c.user_id', 'SELECT c.user_id'], ['only 2025 cohorts', "  WHERE signup_date >= '2025-01-01' AND signup_date < '2026-01-01'\n", ''], ['users who never came back stay in the denominator', 'LEFT JOIN retained', 'JOIN retained']],
  hints: [
    'Anchor each user to their signup month and work out which month counts as "next" for them. Then flag users with an event in that month, keeping everyone else as zeros.',
    '<code>WITH cohorts AS (SELECT user_id, DATE_FORMAT(signup_date, \'%Y-%m\') AS cohort, DATE_FORMAT(DATE_ADD(signup_date, INTERVAL 1 MONTH), \'%Y-%m\') AS next_month FROM users WHERE …), retained AS (SELECT DISTINCT … FROM cohorts c JOIN events e ON …) SELECT … FROM cohorts c LEFT JOIN retained r …</code>',
    '<code>COUNT(*)</code> over cohorts is the users; <code>COUNT(r.user_id)</code> counts only the matched ones, because unmatched rows have NULL there. "Next month" is a calendar month, so an event 5 days after signup in the same month doesn\'t count.'
  ],
  explain: 'Cohort retention is anchor (signup month), target period (the next calendar month, computed with DATE_ADD so December rolls into January), a de-duplicated flag, and a LEFT JOIN so the denominator keeps everyone.'
},
{
  id: 'overdue-patients', title: 'Patients overdue for a follow-up', level: 'Hard', type: 'Churn and anti-joins', scenario: 'Healthcare operations · ClinicFlow',
  prompt: `<p>ClinicFlow wants to call patients who are overdue for a follow-up as of <b>2025-12-31</b>. Only visits with <code>status = 'completed'</code> dated on or before 2025-12-31 count. A patient is overdue if their last such visit was more than 180 days before 2025-12-31, or if they have none at all.</p><p>Return <code>patient_id</code>, <code>name</code>, <code>last_visit</code> (NULL if none) and <code>days_since</code>: the days from <code>last_visit</code> to 2025-12-31 (NULL if none).</p><p>List patients with no qualifying visit first, then the rest by <code>days_since</code> descending; break any remaining ties by <code>patient_id</code>.</p>`,
  setup: `
CREATE TABLE patients (patient_id INTEGER PRIMARY KEY, name TEXT, clinic TEXT);
CREATE TABLE visits (visit_id INTEGER PRIMARY KEY, patient_id INTEGER, visit_date TEXT, status TEXT);
INSERT INTO patients VALUES (1,'Ana','Irvine'),(2,'Ben','Irvine'),(3,'Cai','Tustin'),(4,'Dee','Tustin'),(5,'Eli','Orange'),(6,'Fay','Orange'),(7,'Gus','Irvine'),(8,'Hal','Tustin');
INSERT INTO visits VALUES
 (1,1,'2025-01-05','completed'),(2,1,'2025-11-02','completed'),(3,2,'2025-07-04','completed'),(4,3,'2025-07-03','completed'),
 (5,4,'2025-03-10','completed'),(6,4,'2025-10-01','no_show'),(7,5,'2025-06-01','no_show'),(8,7,'2025-03-10','completed'),
 (9,8,'2026-01-05','completed');`,
  ref: `WITH last_visits AS (
  SELECT patient_id, MAX(visit_date) AS last_visit
  FROM visits
  WHERE status = 'completed' AND visit_date <= '2025-12-31'
  GROUP BY patient_id
)
SELECT p.patient_id,
       p.name,
       l.last_visit,
       DATEDIFF('2025-12-31', l.last_visit) AS days_since
FROM patients p
LEFT JOIN last_visits l ON l.patient_id = p.patient_id
WHERE l.last_visit IS NULL OR DATEDIFF('2025-12-31', l.last_visit) > 180
ORDER BY days_since IS NULL DESC, days_since DESC, p.patient_id;`,
  ordered: true,
  hidden: [
    { name: 'Kim\'s last completed visit was in 2024, and their December 2025 visit was a no-show', sql: `INSERT INTO patients VALUES (9,'Kim','Orange'); INSERT INTO visits VALUES (10,9,'2024-08-19','completed'),(11,9,'2025-12-08','no_show');` },
    { name: '1,500 patients and 6,000 visits from mid 2023 to early 2026, including visits exactly 180 and 181 days before the cutoff', build: g => {
      const patients = [], visits = []; let vid = 1000;
      for (let i = 0; i < 1500; i++) {
        const id = 1000 + i; patients.push([id, g.pick(['Ana', 'Ben', 'Cai', 'Dee', 'Eli', 'Fay', 'Gus', 'Hal', 'Ivy', 'Jon', 'Kim', 'Lia', 'Max', 'Nia', 'Oli', 'Pam']), g.pick(['Irvine', 'Tustin', 'Orange', 'Laguna'])]);
        if (g.chance(0.08)) continue;
        for (let k = g.int(1, 7); k > 0; k--) visits.push([vid++, id, g.chance(0.05) ? g.pick(['2025-07-04', '2025-07-03']) : g.date('2023-06-01', '2026-02-28'), g.weighted([['completed', 80], ['no_show', 12], ['cancelled', 8]])]);
      }
      return g.insert('patients', patients) + g.insert('visits', g.shuffle(visits));
    } }
  ],
  muts: [['only completed visits count', "status = 'completed' AND ", ''], ['visits after the cutoff don\'t count', " AND visit_date <= '2025-12-31'", ''], ['more than 180 days (180 exactly is not overdue)', '> 180', '>= 180'], ['the last visit, not the first', 'MAX(visit_date)', 'MIN(visit_date)'], ['patients with no visits are included', 'LEFT JOIN last_visits', 'JOIN last_visits']],
  hints: [
    'Two parts: each patient\'s last qualifying visit, then every patient (including those with none) checked against the 180-day rule.',
    '<code>WITH last_visits AS (SELECT patient_id, MAX(visit_date) AS last_visit FROM visits WHERE … GROUP BY patient_id) SELECT … FROM patients p LEFT JOIN last_visits l … WHERE l.last_visit IS NULL OR DATEDIFF(\'2025-12-31\', l.last_visit) &gt; 180</code>',
    'For the order, sort on whether days_since is NULL first: <code>ORDER BY days_since IS NULL DESC, days_since DESC, p.patient_id</code>. In MySQL, NULLs sort last when descending, so they need their own sort key to come first.'
  ],
  explain: 'Churn lists are anti-joins with a threshold: LEFT JOIN each person to their latest qualifying activity, then keep the NULLs (never active) and the stale ones. Filtering activity inside the CTE (completed, before the cutoff) keeps no-shows and future visits from resetting the clock.'
}
  ]
}
];

/* ---------- Large generated tests ----------
   One per problem, added to its hidden tests (see makeGen in core.js). Ids start at 1000, and the regions, stores and
   categories are new names, so generated rows never mix with the sample rows unless a test means them to. Where a
   prompt promises there are no ties, the generator nudges values until that holds; the harness checks it. */
const WORDS = ['Atlas', 'Beacon', 'Birch', 'Cedar', 'Comet', 'Coral', 'Crest', 'Delta', 'Ember', 'Fable', 'Fjord', 'Flint', 'Gale', 'Glade', 'Harbor', 'Haven', 'Hollow', 'Iris', 'Juniper', 'Kestrel', 'Lark', 'Lumen', 'Maple', 'Meadow', 'Mesa', 'Nova', 'Oak', 'Onyx', 'Orchid', 'Pine', 'Prism', 'Quartz', 'Raven', 'Reef', 'Ridge', 'Sable', 'Sage', 'Spruce', 'Summit', 'Thistle', 'Tide', 'Vale', 'Willow', 'Zephyr'];
const REGIONS = ['Central', 'Coast', 'Desert', 'Inland', 'Metro', 'Mountain', 'Valley', 'Bayside', 'Lakeside', 'Northgate', 'Southgate', 'Uptown'];
// Totals per key, then nudge one row per collision until no two members of a group share the same totals.
function untie(rows, groupOf, memberOf, totalsOf, nudge, base = {}) {
  for (let pass = 0; pass < 50; pass++) {
    const tot = new Map(Object.entries(base).map(([k, v]) => [k, v.slice()]));
    rows.forEach(r => { const k = groupOf(r) + '|' + memberOf(r), t = tot.get(k) || totalsOf(null); tot.set(k, totalsOf(r, t)); });
    const seen = new Map(); let clash = null;
    for (const [k, t] of tot) { const sig = k.split('|')[0] + '|' + t.join(','); if (seen.has(sig)) { clash = k; break; } seen.set(sig, k); }
    if (!clash) return rows;
    const r = rows.find(x => groupOf(x) + '|' + memberOf(x) === clash);
    nudge(r);
  }
  throw new Error('untie: could not separate the totals');
}
const LARGE = {
  'top-priced': { name: '600 products in 15 categories, with many prices tied at the top', build: g => {
    const cats = REGIONS.concat(['Pets', 'Tech', 'Toys']), rows = [];
    for (let i = 0; i < 600; i++) rows.push([1000 + i, g.pick(WORDS), g.pick(cats), g.int(1, 40) * 5]);
    return g.insert('products', rows);
  } },
  'rank-the-totals': { name: '2,000 sales across 8 regions, with totals that often tie and are settled by the number of sales', build: g => {
    const rows = []; let id = 1000;
    REGIONS.slice(0, 8).forEach(region => { const reps = g.names(g.int(4, 12)); for (let k = g.int(150, 350); k > 0; k--) rows.push([id++, region, g.pick(reps), g.int(1, 20) * 25]); });
    untie(rows, r => r[1], r => r[2], (r, t) => (r ? [t[0] + r[3], t[1] + 1] : [0, 0]), r => { r[3] += 5; });
    return g.insert('sales', g.shuffle(rows));
  } },
  'best-seller': { name: '300 products in 10 categories and 4,000 order lines; names repeat across categories, and some products never sell', build: g => {
    const cats = ['Beauty', 'Books', 'Garden', 'Kitchen', 'Office', 'Outdoor', 'Pets', 'Sports', 'Tech', 'Toys'], products = [], items = [];
    let pid = 1000; cats.forEach(c => g.shuffle(WORDS).slice(0, 30).forEach(w => products.push([pid++, w, c])));
    const selling = products.filter(() => g.chance(0.85));
    for (let i = 0; i < 4000; i++) items.push([1000 + i, g.pick(selling)[0], g.int(1, 4)]);
    return g.insert('products', products) + g.insert('order_items', items);
  } },
  'top-two-spenders': { name: '600 customers in 12 cities and 4,000 orders; many share names, many tie on spend, and some never order', build: g => {
    const customers = [], orders = [];
    for (let i = 0; i < 600; i++) customers.push([1000 + i, g.pick(NAMES_PRACTICE), g.pick(REGIONS)]);
    const buyers = customers.filter(() => g.chance(0.9));
    for (let i = 0; i < 4000; i++) orders.push([1000 + i, g.pick(buyers)[0], g.int(1, 30) * 10]);
    return g.insert('customers', customers) + g.insert('orders', orders);
  } },
  'genre-by-age': { name: '800 users aged 18 to 75 (including 24, 25, 34 and 35) and 6,000 views across 10 genres', build: g => {
    const genres = ['Action', 'Comedy', 'Docs', 'Drama', 'Horror', 'Kids', 'Music', 'Reality', 'Romance', 'Sci-Fi'], users = [], views = [];
    for (let i = 0; i < 800; i++) users.push([1000 + i, i < 40 ? [24, 25, 34, 35][i % 4] : g.int(18, 75)]);
    const ageOf = new Map(users.map(u => [u[0], u[1]])), group = a => (a <= 24 ? '18-24' : a <= 34 ? '25-34' : '35+');
    for (let i = 0; i < 6000; i++) views.push([1000 + i, g.pick(users)[0], g.pick(genres), g.int(1, 24) * 5]);
    // The sample rows' totals per age group and genre, so the no-ties promise holds for the whole table.
    const base = { '18-24|Comedy': [60, 1], '18-24|Drama': [60, 2], '18-24|Sci-Fi': [50, 1], '25-34|Action': [60, 2], '25-34|Drama': [55, 1], '35+|Docs': [55, 2], '35+|Action': [50, 1] };
    untie(views, v => group(ageOf.get(v[1])), v => v[2], (v, t) => (v ? [t[0] + v[3], t[1] + 1] : [0, 0]), v => { v[3] += 1; }, base);
    return g.insert('users', users) + g.insert('views', views);
  } },
  'peak-station': { name: '30 stations and 5,000 rides, including rides at exactly 05:00, 11:59, 12:00, 16:59, 17:00, 21:59 and 22:00', build: g => {
    const stations = g.shuffle(WORDS).slice(0, 30).map((w, i) => [1000 + i, w]), rides = [];
    const edges = ['05:00:00', '11:59:00', '12:00:00', '16:59:00', '17:00:00', '21:59:00', '22:00:00', '04:59:00'];
    for (let i = 0; i < 5000; i++) rides.push([1000 + i, g.pick(stations)[0], `${g.date('2025-05-01', '2025-09-30')} ${g.chance(0.05) ? g.pick(edges) : g.time()}`, g.int(3, 90)]);
    return g.insert('stations', stations) + g.insert('rides', rides);
  } },
  'best-month': { name: '40 reps and 2,500 deals from June 2024 to March 2026, with tied months', build: g => {
    const reps = g.shuffle(NAMES_PRACTICE.filter(n => !['Ana', 'Bo', 'Cy', 'Di', 'Eve'].includes(n))).slice(0, 40), rows = [];
    for (let i = 0; i < 2500; i++) rows.push([1000 + i, g.pick(reps), g.date('2024-06-01', '2026-03-31'), g.int(1, 12) * 50]);
    return g.insert('deals', rows);
  } },
  'leader-runner-up': { name: '12 regions with 1 to 10 stores each and 3,000 sales', build: g => {
    const rows = []; let id = 1000;
    REGIONS.forEach((region, k) => { const stores = g.shuffle(WORDS).slice(0, k === 0 ? 1 : g.int(2, 10)); for (let n = g.int(120, 380); n > 0; n--) rows.push([id++, region, g.pick(stores), g.int(1, 40) * 10]); });
    untie(rows, r => r[1], r => r[2], (r, t) => (r ? [t[0] + r[3]] : [0]), r => { r[3] += 1; });
    return g.insert('store_sales', g.shuffle(rows));
  } }
};
const NAMES_PRACTICE = ['Aaron', 'Abby', 'Adam', 'Aisha', 'Alan', 'Alex', 'Amir', 'Amy', 'Ana', 'Anna', 'Ari', 'Ava', 'Ben', 'Bea', 'Bo', 'Cai', 'Cam', 'Cara', 'Chen', 'Cleo', 'Cy', 'Dale', 'Dev', 'Di', 'Drew', 'Eli', 'Emma', 'Eva', 'Eve', 'Ezra', 'Finn', 'Gia', 'Hugo', 'Ian', 'Isla', 'Jade', 'Jay', 'Jude', 'Kai', 'Kate', 'Leo', 'Lily', 'Luca', 'Maya', 'Mia', 'Nia', 'Omar', 'Raj', 'Rosa', 'Sam', 'Tess', 'Theo', 'Uma', 'Zoe'];
TOPICS.forEach(tp => tp.problems.forEach(p => { if (LARGE[p.id]) p.hidden.push(LARGE[p.id]); }));

// Planned topics, in order. Shown on the practice page so the path is visible.
const UPCOMING = [
  { title: 'NULLs and anti-joins', blurb: 'NOT IN vs NOT EXISTS, filters in ON vs WHERE, what COUNT and AVG skip.' },
  { title: 'Consecutive runs', blurb: 'Streaks and gaps with the date minus ROW_NUMBER technique.' },
  { title: 'Window details', blurb: 'Default frames and tied rows, ROWS vs RANGE, LAG and LEAD defaults.' }
];

const bank = { TOPICS, UPCOMING };
if (typeof module !== 'undefined' && module.exports) module.exports = bank; else root.PRACTICE_BANK = bank;
})(typeof window !== 'undefined' ? window : globalThis);
