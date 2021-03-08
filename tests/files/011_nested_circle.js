module.exports = {
    obj: {
        a: null,
        b: ($) => $.a + $.c,
        c: ($) => $.a + $.b,
    },
    fn: ($) => {},
    _: {
        deps: { b: [], c: ['a', 'b'] },
        value: { a: null, c: NaN, b: NaN },
        fatal: {
            source: 'run',
            msg: 'circular dependency',
            stack: ['b', 'c', 'b']
        }
    }
}