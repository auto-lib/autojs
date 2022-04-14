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
        value: { a: undefined  },
        fatal: {
            msg: 'circular dependency',
            stack: ['a','b','c','a']
        }
    }
}