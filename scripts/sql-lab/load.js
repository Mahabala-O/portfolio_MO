// Loads the engine and both task banks for the checks in this folder.
// Setup: npm install --no-save sql.js@1.10.3
const path = require('path');
const pub = f => path.join(__dirname, '..', '..', 'public', 'sql', f);
module.exports = async function load() {
  const core = require(pub('core.js'));
  core.setSQL(await require('sql.js')());
  const lab = require(pub('lab-bank.js'));
  let practice = { TOPICS: [] };
  try { practice = require(pub('practice-bank.js')); } catch (e) { if (e.code !== 'MODULE_NOT_FOUND') throw e; }
  const tasks = lab.TASKS.map(t => Object.assign({ where: 'lab' }, t))
    .concat(practice.TOPICS.flatMap(tp => tp.problems.map(t => Object.assign({ where: 'practice/' + tp.id }, t))));
  return { core, lab, practice, tasks };
};
