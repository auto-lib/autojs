module.exports = {
    obj: {
        a: null,
        b: ($) => $.a + $.c,
        c: ($) => $.a + $.b,
    },
    fn: ($) => {
        $.a = 1
    },
    _: {
        deps: { b: ['a', 'c'], c: ['a', 'b'] },
        value: { a: 1, b: NaN, c: NaN },
        stale: { b: true, c: true },
        fatal: "circular dependency b -> c -> b"
    }
}