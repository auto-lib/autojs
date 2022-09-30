
let auto = require('./auto');

let _ = auto(null,{
    x: 10,
    y: _ => _.x * 2,
    log: _ => console.log('y',_.y)
})

_.x = 20;