export default {
    obj: {
        tick: ($) => $.tock,
        tock: ($) => $.tick
    },
    fn: ($) => {},
    _: {
        fn: ['tick','tock'],
        subs: [],
        deps: { tick: {}, tock: {} },
        value: { tick: undefined, tock: undefined },
        fatal: {
            msg: 'circular dependency',
            stack: [ 'tick', 'tock', 'tick' ]
        }
    }
}