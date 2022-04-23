
// i use a separate, numbered path for each version of the core library
module.paths.push('./001_separate_boxes');

// log everything that happens internally
let evts = [], hook = (obj,v,fn,parm) => parm ? evts.push({ obj,v,fn,parm }) : evts.push({ obj,v,fn });

// get wrap using hook function
let { cache, error, pubsub } = require('trace')(hook, { 
    // cache: require('cache')() 
    pubsub: require('pubsub')()
});

// wrap main function with above internal objects
let auto = obj => require('./001_separate_boxes/')(obj, { cache, error, pubsub });

// object one
let a = auto({
    x: 10,
    y: _ => _.x * 2 + _.w,
    log: _ => console.log('y =',_.y) // this will run any time y changes
});

// object two (note: interdependent with 'a')
let b = auto({
    w: 2,
    z: _ => _.x + _.y,
    log: _ => console.log('z =',_.z) // this will also run but when z changes
});

// set values (should react automatically)
a.x = 5;
b.w = 3;

// show everything that happened internally
console.log('evts',evts);

// show all internal state variables
console.log('state',{
    cache: cache(),
    error: error(),
    deps: pubsub()
});
