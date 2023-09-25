
type Obj = {
    a: number | null,
    b: (obj:Reactive<Obj>) => number|null,
    c: (obj:Reactive<Obj>) => number|null
}
type Fn = (obj:Obj) => void;

const obj:Obj = {
    a: null,
    b: ($) => $.a ? $.a + 10 : null,
    c: ($) => $.b ? $.b + 20 : null
};

const fn:Fn = ($:Obj) => {
    $.a = 5;
    $.c;
}

const _:Ret = {
    fn: ['b','c'],
    subs: [],
    deps: { b: ['a'], c: ['b'] },
    value: { a: 5, b: 15, c: 35 },
    fatal: {}
}

export default { obj, fn, _ }
