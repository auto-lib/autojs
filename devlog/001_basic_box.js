
function box(initial) {

    let value = initial;

    let obj = {};

    obj.get = () => value;
    obj.set = (val) => value = val;

    return obj;
}

let state = {
    data: box(),
    count: box(),
    msg: box()
}

state.data.set([1,2,3]);

console.log("Data =",state.data.get());