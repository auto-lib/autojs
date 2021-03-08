module.exports = {
    obj: {
        data: null,
    },
    fn: ($) => {
        $['#'].data.subscribe( () => {} );
    },
    _: {
        fn: ['#data000'],
        deps: { '#data000': [ 'data' ] },
        value: { data: null },
        fatal: {}
    }
}