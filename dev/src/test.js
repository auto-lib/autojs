
module.paths.push('./001_separate_boxes');

let evts = [];

let hook = (obj,v,fn,parm) => evts.push({ obj,v,fn,parm });

let trace = require('trace');

let { cache, error, pubsub } = trace(hook, {
    cache: require('cache')(),
    error: require('error')(),
    pubsub: require('pubsub')()
});

let auto = obj => require('./001_separate_boxes/')(obj, { cache, error, pubsub });

let a = auto({
    x: 10,
    y: _ => _.x * 2 + _.w,
    log: _ => console.log('y =',_.y)
});

let b = auto({
    w: 2,
    z: _ => _.x + _.y,
    log: _ => console.log('z =',_.z)
});

a.x = 5;
b.w = 3;

console.log('evts',evts);

console.log('state',{
    cache: cache(),
    error: error(),
    deps: pubsub()
});
