
let running;
let deps = {};
let dirty = {};

let atom = (name) => {

    let value;

    return {

        get: () => {
            if (running) deps[running].push(name);
            return value;
        },
        set: (val) => {
            value = val;
            Object.keys(deps).forEach(n => dirty[n] = true )
        }
    }
}

let auto = (name, fn) => {

    let value;

    dirty[name] = true; // first time round calculate...

    return {
        get: () => {
            if (running) deps[running].push(name);
            if (dirty[name])
            {
                deps[name] = [];
                running = name;
                value = fn();
                running = undefined;
                delete(dirty[name]);
            }
            return value;
        }
    }
}

let data = atom('data');
let count = auto('count',() => data.get() ? data.get().length : 0);
let msg = auto('msg', () => "data =" + data.get() + ", count = " + count.get());

console.log("data = ",data.get())
console.log("count =",count.get())
console.log("msg =",msg.get())

console.log("data deps =",deps['data']);
console.log("count deps =",deps['count']);
console.log("msg deps =",deps['msg']);

console.log("Setting data");

data.set([1,2,3]);

console.log("dirty = ",dirty);

console.log("msg = ",msg.get());

console.log("dirty = ",dirty);