
let data = {
    value: null,
    name: 'data',
    get val() { 
        deps.push(this.name);
        return this.value;
    }
}

let get_count = () => data.val ? data.val.length : 0;

let deps = [];

get_count();

console.log('deps =',deps);