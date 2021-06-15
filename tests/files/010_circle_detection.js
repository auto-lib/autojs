module.exports = {
    obj: {
        tick: ($) => $.tock,
        tock: ($) => $.tick
    },
    fn: ($) => {},
    _: {
        fn: ['tick','tock'],
        subs: [],
        deps: { tick: { tock: true }, tock: {} },
        value: { tick: undefined, tock: undefined },
        fatal: {
            msg: 'circular dependency',
            stack: [ 'tock', 'tick', 'tock' ]
        }
    }
}