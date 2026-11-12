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
  id: 'top-priced', title: 'Most expensive product in each category', level: 'Easy',
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
  id: 'rank-the-totals', title: 'Top rep in each region (write the ranking step)', level: 'Easy',
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
  id: 'best-seller', title: 'Best-selling product in each category', level: 'Easy',
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
  id: 'top-two-spenders', title: 'Top two spenders in each city', level: 'Medium',
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
  id: 'genre-by-age', title: 'Favorite genre by age group', level: 'Medium',
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
  id: 'peak-station', title: 'Busiest station by time of day', level: 'Medium',
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
  id: 'best-month', title: "Each rep's best month", level: 'Medium',
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
  id: 'leader-runner-up', title: 'Leader, runner-up and the gap between them', level: 'Hard',
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
}
];

// Planned topics, in order. Shown on the practice page so the path is visible.
const UPCOMING = [
  { title: 'NULLs and anti-joins', blurb: 'NOT IN vs NOT EXISTS, filters in ON vs WHERE, what COUNT and AVG skip.' },
  { title: 'First and last events, date arithmetic', blurb: 'Anchoring on each user\'s first day, "N days later", month and year boundaries.' },
  { title: 'Consecutive runs', blurb: 'Streaks and gaps with the date minus ROW_NUMBER technique.' },
  { title: 'Window details', blurb: 'Default frames and tied rows, ROWS vs RANGE, LAG and LEAD defaults.' }
];

const bank = { TOPICS, UPCOMING };
if (typeof module !== 'undefined' && module.exports) module.exports = bank; else root.PRACTICE_BANK = bank;
})(typeof window !== 'undefined' ? window : globalThis);
