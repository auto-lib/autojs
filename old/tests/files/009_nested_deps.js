module.exports = {
    obj: {
        a: null,
        b: ($) => $.a + 10,
        c: ($) => $.b + 20
    },
    fn: ($) => {
        $.a = 5;
        $.c;
    },
    _: {
        fn: ['b','c'],
        subs: [],
        deps: { b: ['a'], c: ['b'] },
        value: { a: 5, b: 15, c: 35 },
        fatal: {}
    }
}