
const obj:Obj = {
    data: null,
    func: () => 'val'
};

const fn:Fn = () => {}

const _:Ret = {
    fn: [ 'func' ],
    subs: [],
    deps: { func: [] }, // no dependencies tracked
    value: { data: null, func: 'val' }, // no values cached
    fatal: {}
}

export default { obj, _, fn }