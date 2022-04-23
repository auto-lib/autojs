
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
    y: _ => _.x * 2,
    log: _ => console.log('y =',_.y)
});

let b = auto({
    z: _ => _.x + _.y,
    log: _ => console.log('z =',_.z)
});

a.x = 5;

console.log('evts',evts);

console.log('state',{
    cache: cache(),
    error: error(),
    deps: pubsub()
});
