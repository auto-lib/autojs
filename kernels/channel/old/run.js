
const auto = require('./auto_channel');

let errs = [];
function onerror() { errs.push(Array.from(arguments).join(' ')); }

let ch = auto({
    name: 'ch',

    //state: {
    //    x: _ => _.w // we can use this to map values from one name to another
    //},

    imports: ['w'], // we get this from _b_
    exports: ['w'], // this is what _a_ needs
    onerror
})

let a = auto({
    name: 'a',
    state: {
        x: 10,
        y: _ => _.x * 2,
        z: _ => _.x + _.w /* note w isn't here */
    },
    imports: ['w'],
    exports: ['x','y'],
    actions: ['x'], // what can happen to it directly i.e. from outside
    channels: [ch],
    onerror
})

let b = auto({
    name: 'b', 
    state: {
        w: 20,
        x: _ => _.w + 10,
        y: _ => _.x * 2
    },
    exports: ['w','z'],
    actions: ['w'],
    channels: [ch],
    onerror
})

// console.log('a',a.internals())
// console.log('b',b.internals())
// console.log('ch',ch.internals());

console.log(errs.length,'errors');
if (errs.length>0) errs.forEach(e => console.log('-',e));