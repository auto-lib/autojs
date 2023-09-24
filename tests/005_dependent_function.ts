
type Obj = {
    data: string[] | null,
    count: (obj:Obj) => number
}

const obj:Obj = {
    data: null,
    count: (_) => _.data ? _.data.length : 0
};

const fn:Fn = () => {}

const _:Ret = {
    fn: [ 'count' ],
    subs: [],
    deps: { count: ['data'] },
    value: { data: null, count: 0 },
    fatal: {}
}

export default { obj, _, fn }