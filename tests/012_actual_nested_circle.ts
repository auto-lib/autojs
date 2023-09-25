
type Obj = {
    a: ($:Reactive<Obj>) => number|null,
    b: ($:Reactive<Obj>) => number|null,
    c: ($:Reactive<Obj>) => number|null
}

const obj:Obj = {
    a: ($) => $.b,
    b: ($) => $.c,
    c: ($) => $.a,
};

const _:Ret = {
    fn: ['a','b','c'],
    subs: [],
    deps: { a: [], b: [], c: [] },
    value: { a: undefined, b: undefined, c: undefined },
    fatal: {
        msg: 'circular dependency',
        stack: ['a','b','c','a']
    }
}

export default { obj, _ }