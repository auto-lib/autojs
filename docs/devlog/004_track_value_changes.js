let currentDeps;

let box = (name, fn) => {
    return {
        value: null,
        name,
        dirty: true,
        deps: [],
        get val() {
            if (this.dirty)
            {
                currentDeps = []
                this.value = fn();
                this.deps = currentDeps;
                this.dirty = false;
            }
            deps.push(this.name);
            return this.value;
        },
        set val(v) {
            this.deps.forEach(d => d.dirty = true);
            this.value = v;
        }
    }
}

let data = box('data');
let count = box('count');

let get_count = () => data.val ? data.val.length : 0;

let deps = [];

get_count();

console.log('deps =',deps);