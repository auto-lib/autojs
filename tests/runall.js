
// https://javascript.plainenglish.io/4-ways-to-compare-objects-in-javascript-97fe9b2a949c
function isEqual(obj1, obj2) {
  
  if (typeof(obj1) != typeof(obj2)) return false;
  if (obj1 == null && obj2 == null) return true;
  if (typeof obj1 === 'number' && isNaN(obj1) && isNaN(obj2)) return true; // NaN!

  if (typeof(obj1) === 'object')
  {
    let keys = Object.keys(obj1);
    if (keys.length != Object.keys(obj2).length) return false;
    let equal = true;
    keys.forEach(key => {
      equal = equal && isEqual(obj1[key], obj2[key])
    });
    return equal;
  }
  else return obj1 == obj2;
}

let assert_same = (name, a, b) => {
  let keys = ['deps', 'stale', 'value', 'fatal'];
  let diff = [];

  keys.forEach(key => { if ( !isEqual(a[key], b[key]) ) diff.push(key); })

  if (diff.length>0)
  {
      console.log(name+": not same");
      diff.forEach(key => {
        console.log("a." + key + " =", a[key]);
        console.log("b." + key + " =", b[key]);
      })
      return false
  }
  else return true;
}

let check = (name, test) => {
  let $ = auto(test.obj);
  test.fn($);
  if (assert_same(name, test._, $._)) console.log(name + ": passed")
}

let devlog_path = "../docs/devlog"
let latest_path;
require('fs').readdirSync(devlog_path).forEach(name => {
  if (parseInt(name.substring(0, 3)) > 0) latest_path = name;
});

console.log("copying ["+latest_path+"] to auto.js files")

let latest = "\n// " + latest_path + "\n" + require('fs').readFileSync(devlog_path + "/" + latest_path).toString();

require('fs').writeFileSync("../auto-no-export.js", latest);
require('fs').writeFileSync("../auto-commonjs.js", latest + "\n\nmodule.exports = auto;");
require('fs').writeFileSync("../auto-es6.js", latest + "\n\nexport default auto;");

const auto = require('../auto-commonjs.js');

require('fs').readdirSync("./files").forEach(name => {
  if (parseInt(name.substring(0, 3)) > 0) {
    const test = require("./files/" + name);
    name = name.replace('.js', '');
    check(name, test);
  }
})

