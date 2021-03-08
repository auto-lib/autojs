module.exports = {
    obj: {
        data: null,
    },
    fn: ($) => {
        let unsub = $['#'].data.subscribe( () => {} );
        unsub();
    },
    _: {
        fn: [],
        deps: {},
        value: { data: null },
        fatal: {}
    }
}