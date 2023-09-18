export default {
    obj: {
        data: null,
    },
    fn: ($) => {
        let unsub = $['#'].data.subscribe( () => {} );
        unsub();
    },
    _: {
        fn: [],
        subs: { data: [] },
        deps: {},
        value: { data: null },
        fatal: {}
    }
}