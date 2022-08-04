
// import make_channel from './channel';
// import auto from './auto';

let make_channel = require('./channel');
let auto = require('./auto');

let main = make_channel();

let numbers = auto(
    {
        channels: {
            channel: main,
            inputs: [],
            outputs: ['one','two','three']
        },
    },
    {
        one: 1,
        two: 2,
        three: 3,
        log_one: _ => console.log('one',_.one),
        log_two: _ => console.log('two',_.two),
        log_three: _ => console.log('three',_.three)
    }
)

let letters = auto(
    {
        channels: {
            channel: main,
            inputs: ['one','two','three'],
            outputs: ['a','b','c']
        },
    },
    {
        a: _ => _.one * _.two,
        b: _ => _.two * _.three,
        c: _ => _.three * _.one,
        log_a: _ => console.log('a',_.a),
        log_b: _ => console.log('b',_.b),
        log_c: _ => console.log('c',_.c)
    }
)

numbers.a = 10;