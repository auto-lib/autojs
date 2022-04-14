
let auto = require('./001_separate_boxes/');

let _ = auto({
    x: 10,
    y: _ => _.z * 2,
    log: _ => console.log('y =',_.y)
});

_.x = 5;

console.log('cache', _['#'].cache());
console.log('pubsub', _['#'].pubsub());
console.log('error', _['#'].error());