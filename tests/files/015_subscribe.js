module.exports = {
    obj: {
        data: null,
    },
    fn: ($) => {
        $['#'].data.subscribe( () => {} );
    },
    _: {
        fn: [],
        deps: [],
        subs: ['#data000'],
        value: { data: null },
        fatal: {}
    }
}