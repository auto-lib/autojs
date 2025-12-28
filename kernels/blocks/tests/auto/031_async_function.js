// Test: Basic async functions with set callback

export default {
    obj: {
        data: [1,2,3],
        async_func: (_,set) => setTimeout( () => set('async done'), 50),
        another_async: (_,set) => { setTimeout( () => set('another done'), 150); }
    },
    fn: ($) => {},
    timeout: 100, // wait for a set time
    _: {
        fn: ['another_async', 'async_func'],
        deps: { another_async: {}, async_func: {} },
        value: { another_async: undefined, async_func: 'async done', data: [1,2,3] },
        stale: [],
        fatal: {}
    }
};
