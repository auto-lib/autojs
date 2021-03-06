
let auto = (object) => {

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

        if (running && deps[running].indexOf(tag) === -1) deps[running].push(tag);
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

    const res = {
        _: { deps, dirty, value }, // so we can see from the outside what's going on
        $: {} // store of atoms
    };

    Object.keys(object).forEach(key => {

        const descriptor = Object.getOwnPropertyDescriptor(object, key);

        if (descriptor.get) res.$[key] = atom(key, () => descriptor.get.call(res));
        else res.$[key] = atom(key, object[key]);

        Object.defineProperty(res, key, {
            configurable: true,
            enumerable: true,
            get() {
                return res.$[key].get();
            },
            set(value) {
                res.$[key].set(value);
            }
        });

    });

    return res;
}

export default auto;