export default {
    obj: {
        data: null,
    },
    fn: ($) => {
        $['#'].data.subscribe( () => {} );
    },
    _: {
        fn: [],
        deps: {},
        subs: { data: ['000'] },
        value: { data: null },
        stale: [],
        fatal: {}
    }
}
