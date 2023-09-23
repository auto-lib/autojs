
let running;
let deps = {};
let dirty = {};
let fns = {};
let values = {};

let update = (tag) => {

    deps[tag] = [];
    running = tag;
    let val = fns[tag]();
    running = undefined;
    return val;
}

let atom = (name, fn) => {

    let tag = name ? name : "#" + Math.round(1000*Math.random()).toString().padStart(3, "0"); // e.g. #012

    fns[tag] = fn;

    if (tag[0] == '#') // auto function (not a variable)
        update(tag);
    else
    {
        if (fn) dirty[tag] = true;
    
        return {

            get: () => {
                if (running) deps[running].push(tag);
                if (fn && dirty[tag])
                {
                    values[tag] = update(tag);
                    delete(dirty[tag]);
                }
                return values[tag];
            },
            set: (val) => {
                if (fn) console.trace("fatal: not settable");
                else
                {
                    values[tag] = val;
                    Object.keys(deps).forEach(n => {
                        if (n[0]=='#') update(n); // auto function
                        else dirty[n] = true
                    })
                }
            }
        }
    }
}

let data = atom('data');
let count = atom('count',() => data.get() ? data.get().length : 0);
let msg = atom('msg', () => "data =" + data.get() + ", count = " + count.get());

atom("#print data", () => console.log("auto data =",data.get()));

console.log("data = ",data.get())
console.log("count =",count.get())
console.log("msg =",msg.get())

console.log("deps =",deps);

console.log("Setting data");

data.set([1,2,3]);

console.log("dirty = ",dirty);

console.log("msg = ",msg.get());

console.log("dirty = ",dirty);

console.log("values = ",values);
