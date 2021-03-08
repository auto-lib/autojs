module.exports = {
    obj: {
        data: null,
    },
    fn: ($) => {
        let unsub_one = $['#'].data.subscribe( () => {} );
        let unsub_two = $['#'].data.subscribe( () => {} );
        let unsub_thr = $['#'].data.subscribe( () => {} );
        
        unsub_two();

        let unsub_for = $['#'].data.subscribe( () => {} );
    },
    _: {
        fn: [ '#data000', '#data002', '#data001' ],
        deps: {
            '#data000': [ 'data' ],
            '#data002': [ 'data' ],
            '#data001': [ 'data' ]
        },
        value: { data: null },
        fatal: {}
    }
}