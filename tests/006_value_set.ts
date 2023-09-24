
type Obj = { data: number[] | null }
type Fn = (obj:Obj) => void;

const obj:Obj = { data: null };

const fn:Fn = (_:Obj) => {
    _.data = [1,2,3];
} 

const _:Ret = {
    fn: [],
    subs: [],
    deps: {},
    value: { data: [1,2,3] },
    fatal: {}
}

export default { _, fn, obj }