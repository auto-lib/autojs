
// https://javascript.plainenglish.io/4-ways-to-compare-objects-in-javascript-97fe9b2a949c
function isEqual(obj1, obj2) {
  
  if (obj1 == null && obj2 == null) return true;
  if (!obj1 && !obj2) return true;
  if (obj1 == null && obj2 != null) return false
  if (!obj1 && obj2) return false;
  if (obj1 && !obj2) return false;

  let props1 = Object.getOwnPropertyNames(obj1);
  let props2 = Object.getOwnPropertyNames(obj2);
  
  if (props1.length != props2.length) return false;
  
  for (let i = 0; i < props1.length; i++) {
    let prop = props1[i];
    let bothAreObjects = typeof (obj1[prop]) === 'object' && typeof (obj2[prop]) === 'object'; if ((!bothAreObjects && (obj1[prop] !== obj2[prop]))
      || (bothAreObjects && !isEqual(obj1[prop], obj2[prop]))) {
      return false;
    }
  } return true;
}

let assert_same = (name, a, b) => {
  let keys = ['deps', 'stale', 'value'];
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

require('fs').readdirSync(".").forEach(name => {
  if (parseInt(name.substring(0, 3)) > 0) {
    const test = require("./" + name);
    name = name.replace('.js', '');
    check(name, test);
  }
})

