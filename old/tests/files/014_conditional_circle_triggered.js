module.exports = {
    obj: {
        data: null,
        a: ($) => $.b,
        b: ($) => $.c,
        c: ($) => $.data ? $.a : 0
    },
    fn: ($) => {
        $.data = true;
        $.a;
    },
    _: {
        fn: ['a','b','c'],
        subs: [],
        deps: { a: ['b'], b: ['c'], c: ['data','a'] },
        value: { data: true, a: undefined, b: undefined, c: undefined },
        fatal: {
            msg: 'circular dependency',
            stack: [ 'c', 'b', 'a', 'c' ]
        }
    }
}