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
        fn: [],
        deps: {},
        subs: { data: ['000','002','001'] },
        value: { data: null },
        fatal: {}
    }
}