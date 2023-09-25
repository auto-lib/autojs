
type Obj = {
    data: number[] | null,
    count: (obj:Obj) => number
}
type Fn = (obj:Obj) => void;

const obj:Obj = {
    data: null,
    count: ($) => $.data ? $.data.length : 0
};

const fn:Fn = ($:Obj) => {
    $.data = [1,2,3];
}

const _:Ret = {
    fn: [ 'count' ],
    subs: [],
    deps: { count: ['data'] },
    value: { data: [1,2,3], count: 3 },
    fatal: {}
}

export default { obj, fn, _ }