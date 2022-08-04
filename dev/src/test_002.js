
module.paths.push('./002_components');

let make_cache = require('cache');
let make_error = require('error');
let make_pubsub = require('pubsub');

let make_queue = require('queue');

let queue = make_queue();

let auto = require('./002_components/');

// object one
let a = auto({
    x: 10,
    y: _ => _.x * 2 + _.w,
    log: _ => console.log('y =',_.y) // this will run any time y changes
}, {
    cache: make_cache(),
    error: make_error(),
    pubsub: make_pubsub(queue)
});

// object two (note: interdependent with 'a')
let b = auto({
    w: 2,
    z: _ => _.x + _.y,
    log: _ => console.log('z =',_.z) // this will also run but when z changes
}, {
    cache: make_cache(),
    error: make_error(),
    pubsub: make_pubsub(queue)
});

// set values (should react automatically)
a.x = 5;
b.w = 3;

console.log('state a',{
    cache: a['_']().cache(),
    error: a['_']().error(),
});

console.log('state b',{
    cache: b['_']().cache(),
    error: b['_']().error(),
});