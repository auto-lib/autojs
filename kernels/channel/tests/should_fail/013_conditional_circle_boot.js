module.exports = {
    state: {
        data: null,
        a: ($) => $.b,
        b: ($) => $.c,
        c: ($) => $.data ? $.a : 0
    },
    fn: ($) => {},
    _: {
        fn: ['a','b','c'],
        subs: [],
        deps: { a: ['b'], b: ['c'], c: ['datas'] },
        cache: { data: null, a: 0, b: 0, c: 0 },
        fatal: {}
    },
    should_fail: true
}