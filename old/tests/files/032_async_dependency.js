// devlog/docs/026_asynchronous_functions.md

module.exports = {
    obj: {
        data: [1,2,3],
        async_func: (_,set) => setTimeout( () => set('async done'), 50),
        another_async: (_,set) => setTimeout( () => set(_.async_func + ', and another done too'), 100)
    },
    fn: ($, global) => {},
    timeout: 100, // wait for a set time
    _: {
        fn: [ 'async_func', 'another_async' ],
        deps: { another_async: ['async_func'] },
        subs: { },
        value: { data: [1,2,3], async_func: 'async done', another_async: 'async done, and another done too' },
        fatal: { }
    }
}