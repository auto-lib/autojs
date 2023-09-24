
const obj:Obj = {
    data: null
};

const fn:Fn = () => {}

const _:Ret = {
    fn: [],
    subs: [],
    deps: {},  // no dependencies tracked
    value: { data: null }, // no values cached,
    fatal: {}
}

export default { obj, fn, _ }
