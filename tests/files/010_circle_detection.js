module.exports = {
    obj: {
        tick: ($) => $.tock,
        tock: ($) => $.tick
    },
    fn: ($) => {},
    _: {
        fn: ['tick','tock'],
        deps: { tick: [], tock: ['tick'] },
        value: {},
        fatal: {
            source: 'run',
            msg: 'circular dependency',
            stack: [ 'tick', 'tock', 'tick' ]
        }
    }
}