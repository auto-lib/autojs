module.exports = {
    state: {
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
        cache: { data: true, a: 0, b: 0, c: 0 },
        fatal: {
            msg: 'circular dependency',
            stack: [ 'c', 'b', 'a', 'c' ]
        }
    }
}