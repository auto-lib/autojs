module.exports = {
    obj: {
        func: ($) => 'val'
    },
    fn: ($) => {
        // nothing to do
    },
    _: {
        fn: [ 'func' ],
        subs: [],
        deps: { }, // no dependencies tracked
        value: { func: 'val' }, // no values cached
        fatal: {}
    }
}