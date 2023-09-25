
type Obj = {
    data: number | null,
    a: (obj:Reactive<Obj>) => number|null,
    b: (obj:Reactive<Obj>) => number|null,
    c: (obj:Reactive<Obj>) => number|null
}

const obj:Obj = {
    data: null,
    a: ($) => $.b,
    b: ($) => $.c ? $.c : null,
    c: ($) => $.data ? $.a : null
}

const _:Ret = {
    fn: ['a','b','c'],
    subs: [],
    deps: { a: ['b'], b: ['c'], c: ['data'] },
    value: { data: null, a: null, b: null, c: null },
    fatal: {}
}

export default { obj, _ }