
let _auto = require('./auto');
let auto = obj => _auto(obj,true); // hack to make each object give verbose logging

let errs = [];
function onerror() { errs.push(Array.from(arguments).join(' ')); }

let ch = auto({
    name: 'ch', // just for logging / debugging

    //state: {
    //    x: _ => _.w // we can use this to map values from one name to another
    //},

    imports: ['w'], // we get this from _b_ i.e. "whenever a channel with 'w' changes, let me know"
    exports: ['w'], // this is what _a_ needs i.e. "whenever my 'w' changes, let all my channels know"
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

let objs = [ch,a,b];
let i = 0;

while (true)
{
    let go = false;
    objs.forEach(o => { if (o.internal().next.length>0) go = true });
    if (!go) break;

    objs.forEach(o => { if (o.internal().next.length>0) o.step(); })
    i++;
}

console.log(`${i} extra step(s) after inits`);

objs.forEach( o => console.log(o.name,o.internal().state.cache));

console.log(errs.length,'errors');
if (errs.length>0) errs.forEach(e => console.log('-',e));