// Usage: node e2e.js [screenshot-dir]   (needs Playwright with Chromium, and sql.js installed as for the other checks)
// Drives both pages in a headless browser: strict checks, failed-test tabs, step runner, custom data, report, lesson, solve again.
const { chromium } = require('playwright');
const path = require('path');
const root = require('./load.js').root;
const shots = process.argv[2];
const file = f => 'file://' + path.join(root, 'public', f);
let failures = 0;
const check = (name, ok, detail) => { if (!ok) failures++; console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${ok ? '' : ' -> ' + detail}`); };

async function open(browser, url, viewport) {
  const ctx = await browser.newContext({ viewport: viewport || { width: 1200, height: 900 } });
  const page = await ctx.newPage();
  page.errors = [];
  page.on('pageerror', e => page.errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error' && !/fonts\.g|ERR_FAILED/.test(m.text())) page.errors.push(m.text()); });
  await page.route('https://cdn.jsdelivr.net/**', r => { const f = path.basename(new URL(r.request().url()).pathname);
    r.fulfill({ path: path.join(root, 'node_modules', 'sql.js', 'dist', f), contentType: f.endsWith('.wasm') ? 'application/wasm' : 'text/javascript' }); });
  await page.route('https://fonts.**', r => r.abort());
  await page.goto(url);
  await page.waitForFunction(() => document.getElementById('engine').textContent.includes('SQLite'));
  return page;
}
const msg = async page => (await page.textContent('#out .msg')).trim();
const shot = async (page, name) => { if (shots) await page.screenshot({ path: path.join(shots, name + '.png'), fullPage: true }); };

(async () => {
  const browser = await chromium.launch();

  /* ---- Lab ---- */
  let page = await open(browser, file('sql-lab.html') + '#manager-reports');
  const byName = `select e2.name, count(*) as report_count from employee e1 join employee e2 on e1.manager_id = e2.id group by e2.name having count(*) >= 2 order by report_count desc, e2.name`;
  check('lab: no hidden-test tabs before a submit', await page.locator('.casetab').count() === 2, await page.locator('.casetab').count());
  await page.fill('#sql', byName);
  await page.click('#submit');
  check('lab: group-by-name fails 1 of 3', /2 of 3 tests passed/.test(await msg(page)), await msg(page));
  check('lab: failed test opens as a tab', await page.locator('.casetab.failed').count() === 1, await page.locator('.casetab').allTextContents());
  await page.click('.casetab.failed');
  check('lab: tab shows the rows the test adds', /INSERT INTO employee VALUES \(9,'Uma',1\)/.test(await page.textContent('#casepanel')), '');
  await page.click('#run');
  check('lab: Run uses the selected test', /Doesn't match yet/.test(await msg(page)) && await page.locator('#out tr.bad').count() === 1, await msg(page));
  await shot(page, 'lab-failed-test-tab');
  await page.fill('#sql', byName.replace('group by e2.name', 'group by e2.id'));
  await page.click('#run');
  check('lab: fixed query matches on that test', /Matches the expected output for the test/.test(await msg(page)), await msg(page));
  await page.fill('#sql', byName.replace('group by e2.name', 'group by e2.id').replace(' order by report_count desc, e2.name', ''));
  await page.click('#submit');
  check('lab: missing ORDER BY is rejected', /0 of 3 tests passed/.test(await msg(page)) && /no ORDER BY/.test(await page.textContent('#out')), await page.textContent('#out'));
  await page.fill('#sql', byName.replace('group by e2.name', 'group by e2.id').replace('count(*) as report_count', 'count(*)').replace('order by report_count desc', 'order by count(*) desc'));
  await page.click('#run');
  check('lab: unnamed column is rejected', /Column names must match/.test(await msg(page)), await msg(page));
  await page.fill('#sql', byName.replace('group by e2.name', 'group by e2.id'));
  await page.keyboard.press('Control+Shift+Enter');
  check('lab: correct query passes all tests', /All 3 tests passed/.test(await msg(page)), await msg(page));
  check('lab: all tests visible as tabs once solved', await page.locator('.casetab').count() === 4, await page.locator('.casetab').count());

  await page.click('[data-go="above-dept-avg"]');
  check('lab: step menu hidden without CTEs', await page.locator('#step').isHidden(), '');
  await page.fill('#sql', 'with averages as (select name, dept, salary, round(avg(salary) over (partition by dept), 2) as dept_avg from employees), top as (select * from averages where salary > dept_avg)\nselect name, dept, salary, dept_avg from top order by dept, salary desc');
  await page.waitForFunction(() => !document.getElementById('step').hidden);
  check('lab: step menu lists the CTEs', (await page.locator('#step option').allTextContents()).join('|') === 'Show: final result|Show step: averages|Show step: top', await page.locator('#step option').allTextContents());
  await page.selectOption('#step', 'averages');
  await page.click('#run');
  check('lab: running a step shows its rows', /Step averages.*9 rows/.test(await msg(page)), await msg(page));
  await page.click('[data-case="custom"]');
  await page.fill('#custom', "INSERT INTO employees VALUES (20,'Zed','Ops',90000);");
  await page.click('#apply');
  check('lab: custom rows change the expected output', /Zed/.test(await page.textContent('#casepanel .tables:last-of-type')), await page.textContent('#casepanel'));
  await page.selectOption('#step', '');
  await page.click('#run');
  check('lab: Run works on custom data', /Matches the expected output for your custom data/.test(await msg(page)), await msg(page));
  await page.fill('#custom', 'INSERT INTO nope VALUES (1);'); await page.click('#apply');
  check('lab: bad custom rows report the error', /no such table/.test(await page.textContent('#casepanel')), await page.textContent('#casepanel'));
  await page.click('[data-go="concepts"]'); await page.locator('.q').nth(0).locator('.choice').nth(2).click();
  await page.click('[data-go="report"]');
  check('lab: report renders', /1\/14/.test(await page.textContent('.stats')), await page.textContent('.stats'));
  const exp = await page.evaluate(() => exportText());
  check('lab: export names the failed test and its skill', /Two different managers both named Uma \(ids 4 and 9\), each with one report \[agg\]/.test(exp), exp.slice(0, 400));
  await shot(page, 'lab-report');
  await page.reload(); await page.waitForFunction(() => document.getElementById('engine').textContent.includes('SQLite'));
  check('lab: progress survives a reload', await page.locator('nav.steps button.passed').count() === 1, '');
  check('lab: no page errors', page.errors.length === 0, page.errors.join(' | '));

  /* ---- Practice ---- */
  page = await open(browser, file('sql-practice.html'));
  check('practice: home lists 8 problems', await page.locator('table.list tbody tr').count() === 8, await page.locator('table.list tbody tr').count());
  await shot(page, 'practice-home');
  await page.click('a[href="#agg-rank/lesson"]');
  await page.waitForSelector('.lesson');
  check('practice: lesson shows each step of the worked example', await page.locator('.lesson table.grid').count() === 4, await page.locator('.lesson table.grid').count());
  await page.locator('.q').nth(0).locator('.choice').nth(1).click();
  check('practice: quick check marks the answer', await page.locator('.choice.right').count() === 1 && await page.locator('.choice.wrong').count() === 0, '');
  await shot(page, 'practice-lesson');
  await page.goto(file('sql-practice.html') + '#agg-rank/rank-the-totals');
  await page.waitForSelector('#sql');
  check('practice: starter query is prefilled', /Your step/.test(await page.inputValue('#sql')), await page.inputValue('#sql'));
  await page.selectOption('#step', 'totals'); await page.click('#run');
  check('practice: can look at the totals step', /Step totals.*6 rows/.test(await msg(page)), await msg(page));
  await page.selectOption('#step', ''); await page.click('#submit');
  check('practice: starter alone fails with the SQL error shown', /no such column: rn/.test(await page.textContent('#out')), await page.textContent('#out'));
  const starter = await page.inputValue('#sql');
  await page.fill('#sql', starter.replace(/-- Your step.*\n\s*SELECT \*/, 'SELECT *, ROW_NUMBER() OVER (PARTITION BY region ORDER BY total DESC, deals) AS rn'));
  await page.click('#submit');
  check('practice: completed step passes', /All 3 tests passed/.test(await msg(page)), await msg(page));
  await shot(page, 'practice-problem');
  page.once('dialog', d => d.accept());
  await page.click('#again');
  await page.waitForFunction(() => /Your step/.test(document.getElementById('sql').value));
  check('practice: solve again resets the query and keeps history', /Solved 1×/.test(await page.textContent('.meta')), await page.textContent('.meta'));
  await page.goto(file('sql-practice.html')); await page.waitForSelector('table.list');
  check('practice: home shows the solve', /Solved/.test(await page.locator('table.list tbody tr').nth(1).textContent()) && /1 of 8 problems solved/.test(await page.textContent('.topic')), await page.locator('table.list tbody tr').nth(1).textContent());
  check('practice: no page errors', page.errors.length === 0, page.errors.join(' | '));

  /* ---- Landing page (only in the standalone project) ---- */
  if (require('fs').existsSync(path.join(root, 'public', 'index.html'))) {
    const ctx = await browser.newContext();
    const home = await ctx.newPage();
    await home.goto(file('index.html'));
    const links = await home.locator('a.btn').evaluateAll(as => as.map(a => a.getAttribute('href')));
    check('landing: links to both pages', links.join('|') === 'sql-lab.html|sql-practice.html', links);
    await ctx.close();
  }

  /* ---- Phone width ---- */
  for (const [name, url] of [['lab', file('sql-lab.html') + '#moving-avg'], ['practice home', file('sql-practice.html')], ['practice problem', file('sql-practice.html') + '#agg-rank/peak-station']]) {
    const m = await open(browser, url, { width: 390, height: 844 });
    const w = await m.evaluate(() => document.documentElement.scrollWidth);
    check(`phone: ${name} has no sideways scroll`, w <= 390, w);
    await shot(m, 'phone-' + name.replace(' ', '-'));
  }
  await browser.close();
  console.log(`\nfailures: ${failures}`);
  process.exit(failures ? 1 : 0);
})();
