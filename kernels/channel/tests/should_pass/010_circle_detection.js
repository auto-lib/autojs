module.exports = {
    state: {
        tick: ($) => $.tock,
        tock: ($) => $.tick
    },
    fn: ($) => {},
    _: {
        fn: ['tick','tock'],
        subs: [],
        deps: { tick: ['tock'], tock: ['tick'] },
        cache: { tick: undefined },
        fatal: {
            msg: 'circular dependency',
            stack: [ 'tick', 'tock', 'tick' ]
        }
    },
    ignore: ['cache']
}