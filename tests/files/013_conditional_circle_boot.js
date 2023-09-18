export default {
    obj: {
        data: null,
        a: ($) => $.b,
        b: ($) => $.c,
        c: ($) => $.data ? $.a : 0
    },
    fn: ($) => {},
    _: {
        fn: ['a','b','c'],
        subs: [],
        deps: { a: { b: true }, b: { c: true }, c: { data: true } },
        value: { data: null, a: 0, b: 0, c: 0 },
        fatal: {}
    }
}