
type Obj = {
    data: boolean | null,
    a: (obj:Reactive<Obj>) => number|null,
    b: (obj:Reactive<Obj>) => number|null,
    c: (obj:Reactive<Obj>) => number|null
}

const obj:Obj = {
    data: null,
    a: ($) => $.b,
    b: ($) => $.c,
    c: ($) => $.data ? $.a : 0
}

type Fn = ($:Obj) => void

const fn:Fn = ($) => {
    $.data = true;
    $.a;
}

const _:Ret = {
    fn: ['a','b','c'],
    subs: [],
    deps: { a: [], b: [], c: ['data'] },
    value: { data: true, a: undefined, b: undefined, c: undefined },
    fatal: {
        msg: 'circular dependency',
        stack: [ 'a', 'b', 'c', 'a' ]
    }
}


export default { obj, _, fn }