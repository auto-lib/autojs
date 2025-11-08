module.exports = {
    state: {
        a: ($) => $.b,
        b: ($) => $.c,
        c: ($) => $.a,
    },
    fn: ($) => {},
    _: {
        fn: ['a','b','c'],
        subs: [],
        deps: { a: ['b'], b: ['c'], c: ['a'] },
        cache: { a: undefined  },
        fatal: {
            msg: 'circular dependency',
            stack: ['a','b','c','a']
        }
    },
    ignore: ['cache']
}