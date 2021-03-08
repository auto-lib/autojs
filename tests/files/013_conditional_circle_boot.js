module.exports = {
    obj: {
        data: null,
        a: ($) => $.b,
        b: ($) => $.c,
        c: ($) => $.data ? $.a : 0
    },
    fn: ($) => {},
    _: {
        fn: ['a','b','c'],
        deps: { a: ['b'], b: ['c'], c: ['data'] },
        value: { data: null, a: 0, b: 0, c: 0 },
        fatal: {}
    }
}