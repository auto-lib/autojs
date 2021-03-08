module.exports = {
    obj: {
        data: null,
        func: ($) => 'val'
    },
    fn: ($) => {
        // nothing to do
    },
    _: {
        fn: ['func'],
        deps: { func: [] }, // no dependencies tracked
        value: { data: null, func: 'val' }, // no values cached
        fatal: {}
    }
}