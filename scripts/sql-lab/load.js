// Loads the engine and both task banks for the checks in this folder.
// Setup: npm install --no-save sql.js@1.10.3
const path = require('path');
const fs = require('fs');
// The project root is the nearest folder above this one that has public/sql/core.js.
let root = __dirname;
while (!fs.existsSync(path.join(root, 'public', 'sql', 'core.js'))) {
  const up = path.dirname(root);
  if (up === root) throw new Error('Could not find public/sql/core.js above ' + __dirname);
  root = up;
}
const pub = f => path.join(root, 'public', 'sql', f);
async function load() {
  const core = require(pub('core.js'));
  core.setSQL(await require('sql.js')());
  const lab = require(pub('lab-bank.js'));
  let practice = { TOPICS: [] };
  try { practice = require(pub('practice-bank.js')); } catch (e) { if (e.code !== 'MODULE_NOT_FOUND') throw e; }
  const tasks = lab.TASKS.map(t => Object.assign({ where: 'lab' }, t))
    .concat(practice.TOPICS.flatMap(tp => tp.problems.map(t => Object.assign({ where: 'practice/' + tp.id }, t))));
  return { core, lab, practice, tasks };
}
load.root = root;
module.exports = load;
