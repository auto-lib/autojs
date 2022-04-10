module.exports = {
    obj: {
        a: ($) => $.b,
        b: ($) => $.c,
        c: ($) => $.a,
    },
    fn: ($) => {},
    _: {
        fn: ['a','b','c'],
        subs: [],
        deps: { a: ['b'], b: ['c'], c: ['a'] },
        value: { a: undefined, b: undefined, c: undefined },
        fatal: {
            msg: 'circular dependency',
            stack: ['c','b','a','c']
        }
    }
}