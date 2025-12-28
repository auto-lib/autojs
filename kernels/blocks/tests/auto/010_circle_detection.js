// Test: Circular dependency detection

export default {
    obj: {
        tick: ($) => $.tock,
        tock: ($) => $.tick
    },
    fn: ($) => {},
    _: {
        fn: ['tick', 'tock'],
        deps: { tick: { tock: true }, tock: { tick: true } },
        value: {},
        stale: ['tick', 'tock'],
        fatal: {
            msg: 'Cycle detected involving: tick',
            stack: ['tick', 'tock', 'tick']
        }
    }
};
