module.exports = {
    obj: {
        a: ($) => $.b,
        b: ($) => $.c,
        c: ($) => $.a,
    },
    fn: ($) => {},
    _: {
        deps: { a: [], b: ['c'], c: ['a'] },
        value: {},
        fatal: {
            source: 'run',
            msg: 'circular dependency',
            stack: ['a','b','c','a']
        }
    }
}