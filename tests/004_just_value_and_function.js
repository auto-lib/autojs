module.exports = {
    obj: {
        data: null,
        func: ($) => 'val'
    },
    fn: ($) => {
        // nothing to do
    },
    _: {
        deps: { func: [] }, // no dependencies tracked
        stale: {}, // nothing to update
        value: { data: null, func: 'val' } // no values cached
    }
}