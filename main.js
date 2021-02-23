
import { observable } from './observable.js';
import { autorun, runInAction } from './box.js';

const store = observable({

    data: null,
    delta: 1,

    get count() {
        if (this.data) return this.data.length;
        else return "N/A"
    },

    get count_plus_delta() { 
        return this.count + this.delta;
    }

});

store.$mobx.count.subscribe( (val) => console.log("[subscribe] count = ",val));
store.$mobx.count_plus_delta.subscribe( (val) => console.log("[subscribe] count_plus_delta = ",val));

autorun( () => {
    console.log("[autorun] count = ",store.count);
});

autorun( () => {
    console.log("[autorun] count_plus_delta = ",store.count_plus_delta);
});

console.log("----- init over ----");

store.data = [1,2,3];

console.log("----- setting data again ----");

store.data = [1,2,3,4];

console.log("----- running in action ----");

runInAction( () => {

    // should get just one set of outputs (not one per assignment)
    store.data = [1,2,3,4,5];
    store.delta = 2;
});