// Test: Async keyword with dependencies

export default {
    obj: {
        data: [1,2,3],
        async_func: async (_,set) => 'async done',
        another_async: async (_,set) => setTimeout( () => set(_.async_func + ', and another done too'), 100)
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
