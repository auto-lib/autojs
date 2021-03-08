module.exports = {
    obj: {
        func: ($) => 'val'
    },
    fn: ($) => {
        // nothing to do
    },
    _: {
        deps: { func: [] }, // no dependencies tracked
        stale: {}, // nothing to update
        value: { func: 'val' } // no values cached
    }
}