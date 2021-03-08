module.exports = {
    obj: {
        tick: ($) => $.tock,
        tock: ($) => $.tick
    },
    fn: ($) => {},
    _: {
        deps: { tick: [], tock: ['tick'] },
        value: {},
        fatal: {
            source: 'run',
            msg: 'circular dependency',
            stack: [ 'tick', 'tock', 'tick' ]
        }
    }
}