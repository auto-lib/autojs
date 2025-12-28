// Test: Async function that depends on another async function

export default {
    obj: {
        data: [1,2,3],
        async_func: (_,set) => setTimeout( () => set('async done'), 50),
        another_async: (_,set) => setTimeout( () => set(_.async_func + ', and another done too'), 100)
    },
    fn: ($) => {},
    timeout: 150, // wait for a set time
    _: {
        fn: ['another_async', 'async_func'],
        deps: { another_async: { async_func: true }, async_func: {} },
        value: { another_async: 'async done, and another done too', async_func: 'async done', data: [1,2,3] },
        stale: [],
        fatal: {}
    }
};
