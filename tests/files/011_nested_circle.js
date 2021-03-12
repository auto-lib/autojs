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
        deps: { b: [], c: ['a', 'b'] },
        value: { a: null, b: undefined, c: undefined },
        fatal: {
            msg: 'circular dependency',
            stack: ['b', 'c', 'b']
        }
    }
}