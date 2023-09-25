
type Obj = {
    a: number | null,
    b: (obj:Reactive<Obj>) => number|null,
    c: (obj:Reactive<Obj>) => number|null
}

const obj:Obj = {
    a: null,
    b: ($) => $.c ? $.c : null,
    c: ($) => $.b ? $.b : null,
};

const _:Ret = {
    fn: ['b','c'],
    subs: [],
    deps: { b: [], c: [] },
    value: { a: null, b: null, c: null },
    fatal: {
        msg: 'circular dependency',
        stack: [ 'b', 'c', 'b' ]
    }
}

export default { obj, _ }