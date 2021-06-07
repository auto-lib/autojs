
let running;
let deps = {};
let dirty = {};
let fs = {};
let value = {};

let update = (tag) => {

    deps[tag] = [];
    running = tag;
    let val = fs[tag]();
    running = undefined;
    return val;
}

let getter = (tag) => {

    if (running) deps[running].push(tag);
    if (fs[tag] && dirty[tag])
    {
        value[tag] = update(tag);
        delete(dirty[tag]);
    }
    return value[tag];
}

let setter = (tag, val) => {

    if (fs[tag]) console.trace("fatal: not settable");
    else
    {
        value[tag] = val;
        Object.keys(deps).forEach(n => {
            if (n[0]=='#') update(n); // auto function
            else dirty[n] = true
        })
    }
}

let atom = (name, fn) => {

    let tag = name ? name : "#" + Math.round(1000*Math.random()).toString().padStart(3, "0"); // e.g. #012

    if(fn) fs[tag] = fn;

    if (tag[0] == '#') // auto function (not a variable)
        update(tag);
    else
    {
        if (fn) dirty[tag] = true;
    
        return {

            get: () => getter(tag),
            set: (val) => setter(tag, val)
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

console.log("values = ",value);
