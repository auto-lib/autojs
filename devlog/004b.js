let running;
let deps = {};
let dirty = {};

let get_deps = (name, fn) => {

    deps[name] = []; // reset

    if (fn)
    {
        running = name;
        fn();
    }
}

let box = (name, fn) => {

    let value;
    get_deps(name, fn);

    return {
        get: () => {
            deps[running].push(name);
            if (fn && dirty[name])
            {
                value = fn();
                delete(dirty[name]);
            }
            return value;
        },
        set: (val) => {
            value = val;
            dirty[name] = true;
            Object.keys(deps).forEach(n => { if (deps[n].indexOf(name) !== -1) dirty[n] = true;} )
        }
    }
}

let data = box('data');
let count = box('count',() => data.get() ? data.get().length : 0);
let msg = box('msg', () => "data =" + data.get() + ", count = " + count.get());

console.log("data deps =",deps['data']);
console.log("count deps =",deps['count']);
console.log("msg deps =",deps['msg']);

console.log("msg = ",msg.get());

console.log("Setting data");

data.set([1,2,3]);

console.log("dirty = ",dirty);

console.log("msg = ",msg.get());