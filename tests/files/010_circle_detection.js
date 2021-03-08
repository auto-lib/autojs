module.exports = {
    obj: {
        tick: ($) => $.tock,
        tock: ($) => $.tick
    },
    fn: ($) => {
    },
    _: {
        deps: { tick: ['tock'], tock: ['tick'] },
        value: { tick: undefined, tock: undefined },
        stale: {}
    }
}