module.exports = {
    obj: {
        a: null,
        b: ($) => $.a + $.c,
        c: ($) => $.a + $.b,
    },
    fn: ($) => {},
    _: {
        fn: ['b','c'],
        subs: [],
        deps: { b: { a: true, c: true }, c: { a: true, b: true } },
        value: { a: null, b: NaN, c: NaN },
        fatal: {
            msg: 'circular dependency',
            stack: ['c', 'b', 'c']
        }
    }
}