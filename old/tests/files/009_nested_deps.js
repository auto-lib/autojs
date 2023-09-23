export default {
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
        deps: { b: { a: true }, c: { b: true } },
        value: { a: 5, b: 15, c: 35 },
        fatal: {}
    }
}