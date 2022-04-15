
let cache = require('./001_separate_boxes/cache')();
let error = require('./001_separate_boxes/error')();
let pubsub = require('./001_separate_boxes/pubsub')();

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

console.log('state',a._());