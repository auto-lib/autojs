module.exports = {
    state: {
        a: null,
        b: ($) => $.a + $.c,
        c: ($) => $.a + $.b,
    },
    fn: ($) => {},
    _: {
        fn: ['b','c'],
        subs: [],
        deps: { b: ['a','c'], c: ['a','b'] },
        cache: { a: null, b: NaN },
        fatal: {
            msg: 'circular dependency',
            stack: ['b', 'c', 'b']
        }
    },
    ignore: ['cache']
}