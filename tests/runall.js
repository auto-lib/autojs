import auto from '../auto.js'; // auto?
import test from './001_check_something.js';

// https://javascript.plainenglish.io/4-ways-to-compare-objects-in-javascript-97fe9b2a949c
function isEqual(obj1, obj2) {
    let props1 = Object.getOwnPropertyNames(obj1);
    let props2 = Object.getOwnPropertyNames(obj2);  if (props1.length != props2.length) {
      return false;
    }  for (let i = 0; i < props1.length; i++) {
      let prop = props1[i];
      let bothAreObjects = typeof(obj1[prop]) === 'object' && typeof(obj2[prop]) === 'object';    if ((!bothAreObjects && (obj1[prop] !== obj2[prop]))
      || (bothAreObjects && !isEqual(obj1[prop], obj2[prop]))) {
        return false;
      }
    }  return true;
  }

let assert_same = (a,b) =>
{
    let keys = ['deps','dirty','value'];
    let same = true;

    keys.forEach(key => {
        if (!isEqual(a[key],b[key])) same = false;
    })

    if (!same)
    {
        console.trace("not same");
        keys.forEach(key => {
            console.log("a["+key+"] =",a[key]);
            console.log("b["+key+"] =",b[key]);
        })
    }

    return same;
}

let $ = auto(test.obj);
test.fn($);
if (assert_same(test._, $._)) console.log("Test passed");