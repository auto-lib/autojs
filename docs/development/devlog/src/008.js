
let auto = (object) => {

    let running;
    let deps = {};
    let dirty = {};
    let fs = {};
    let value = {};

    let update = (name) => {

        deps[name] = [];
        running = name;
        let val = fs[name]();
        running = undefined;
        return val;
    }

    let getter = (name) => {

        if (running) deps[running].push(name);
        if (fs[name] && dirty[name])
        {
            value[name] = update(name);
            delete(dirty[name]);
        }
        return value[name];
    }

    let setter = (name, val) => {

        if (fs[name]) console.trace("fatal: not settable");
        else
        {
            if (running) console.trace("fatal: can't have side affects inside a function")
            else
            {
                value[name] = val;
                Object.keys(deps).forEach(n => dirty[n] = true)
            }
        }
    }

    let atom = (name, fn) => {

        if(fn) {
            fs[name] = fn;
            dirty[name] = true;
        }
        return {

            get: () => getter(name),
            set: (val) => setter(name, val)
        }
    }

    const res = {
        _: { deps, dirty, value }, // so we can see from the outside what's going on
        $: {} // store of atoms
    };

    Object.keys(object).forEach(key => {

        if (typeof object[key] == 'function') res.$[key] = atom(key, () => object[key](res));
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

let $ = auto({
    data: null,
    update: ($) => { $.data = [1,2,3]; }
})

$.update;