// devlog/docs/026_asynchronous_functions.md

export default {
    obj: {
        data: [1,2,3],
        async_func: (_,set) => setTimeout( () => set('async done'), 50),
        another_async: (_,set) => setTimeout( () => set(_.async_func + ', and another done too'), 100)
    },
    fn: ($, global) => {},
    timeout: 150, // wait for a set time
    _: {
        fn: [ 'async_func', 'another_async' ],
        deps: { async_func: {}, another_async: { async_func: true } },
        subs: { },
        value: { data: [1,2,3], async_func: 'async done', another_async: 'async done, and another done too' },
        fatal: { }
    }
}