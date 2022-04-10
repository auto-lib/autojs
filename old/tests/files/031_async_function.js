// devlog/docs/026_asynchronous_functions.md

module.exports = {
    obj: {
        data: [1,2,3],
        async_func: (_,set) => setTimeout( () => set('async done'), 50),
        another_async: (_,set) => { setTimeout( () => set('another done'), 150); }
    },
    fn: ($, global) => {},
    timeout: 100, // wait for a set time
    _: {
        fn: [ 'async_func', 'another_async' ],
        deps: { async_func: {}, another_async: {} },
        subs: { },
        value: { data: [1,2,3], async_func: 'async done', another_async: undefined },
        fatal: { }
    }
}