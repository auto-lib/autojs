
const obj:Obj = {};
const fn:Fn = () => {}
const _:Ret = {
    fn: [],
    subs: [],
    deps: {},  // no dependencies tracked
    value: {}, // no values cached,
    fatal: {}
}

export default { obj, fn, _ }