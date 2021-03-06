
function box(initial) {

    let value = initial;

    let obj = {};

    obj.get = () => value;
    obj.set = (val) => value = val;

    return obj;
}

let state = {
    data: box(),
    get count() { return state.data.get() ? state.data.get().length : 0 },
    get msg() { return "Got data " + state.data.get() + " with length "+ state.count }
}

state.data.set([1,2,3]);

console.log("Data =",state.data.get());
console.log("Msg =",state.msg);