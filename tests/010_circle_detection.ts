
type Obj = {
    tick: ($:Reactive<Obj>) => number,
    tock: ($:Reactive<Obj>) => number
}

const obj:Obj = {
    tick: ($) => $.tock,
    tock: ($) => $.tick
};

const _:Ret = {
    fn: ['tick','tock'],
    subs: [],
    deps: { tick: [], tock: [] },
    value: { tick: undefined, tock: undefined },
    fatal: {
        msg: 'circular dependency',
        stack: [ 'tick', 'tock', 'tick' ]
    }
}

export default { obj, _ }