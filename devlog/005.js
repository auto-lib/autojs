
let running;
let deps = {};
let dirty = {};

let atom = (name, fn) => {

    let value;
    let tag = name ? name : fn;

    if (fn) dirty[tag] = true;

    return {

        get: () => {
            if (running) deps[running].push(tag);
            if (fn && dirty[tag])
            {
                deps[tag] = [];
                running = tag;
                value = fn();
                running = undefined;
                delete(dirty[tag]);
            }
            return value;
        },
        set: (val) => {
            if (fn) console.trace("fatal: not settable");
            else
            {
                value = val;
                Object.keys(deps).forEach(n => dirty[n] = true )
            }
        }
    }
}

let data = atom('data');
let count = atom('count',() => data.get() ? data.get().length : 0);
let msg = atom('msg', () => "data =" + data.get() + ", count = " + count.get());

console.log("data = ",data.get())
console.log("count =",count.get())
console.log("msg =",msg.get())

console.log("deps =",deps);

console.log("Setting data");

data.set([1,2,3]);

console.log("dirty = ",dirty);

console.log("msg = ",msg.get());

console.log("dirty = ",dirty);