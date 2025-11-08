module.exports = {
    state: {
        a: null,
        b: ($) => $.a + 10,
        c: ($) => $.b + 20
    },
    fn: ($) => {
        $.a = 5;
    },
    _: {
        fn: ['b','c'],
        subs: [],
        deps: { b: ['a'], c: ['a'] },
        cache: { a: 5, b: 15, c: 35 },
        fatal: {}
    },
    should_fail: true
}