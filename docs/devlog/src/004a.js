
let running;
let deps = {};

let get_deps = (name, fn) => {

    deps[name] = []; // reset

    if (fn)
    {
        running = name;
        fn();
    }
}

let box = (name, fn) => {

    get_deps(name, fn);

    return {
        get: () => {
            deps[running].push(name);
        }
    }
}

let data = box('data');
let count = box('count',() => data.get() ? date.get().length : 0);
let msg = box('msg', () => "data =" + data.get() + ", count = " + count.get());

console.log("data deps =",deps['data']);
console.log("count deps =",deps['count']);
console.log("msg deps =",deps['msg']);

