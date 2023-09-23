export default {
    obj: {
        func: ($) => 'val'
    },
    fn: ($) => {
        // nothing to do
    },
    _: {
        fn: [ 'func' ],
        subs: [],
        deps: { func: [] }, // no dependencies tracked
        value: { func: 'val' }, // no values cached
        fatal: {}
    }
}