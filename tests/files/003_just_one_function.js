module.exports = {
    obj: {
        func: ($) => 'val'
    },
    fn: ($) => {
        // nothing to do
    },
    _: {
        deps: { func: [] }, // no dependencies tracked
        value: { func: 'val' }, // no values cached
        stale: {}
    }
}