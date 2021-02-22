
import { observable } from './observable.js';
import { autorun } from './box.js';

const makeStore = () => observable({

    data: null,
    
    get subdata() {
        if (this.data) return this.data.length;
        else return "Not found"
    },

    get subsubdata() { return this.subdata + 1; }

});

const store = makeStore();

store.$mobx.subdata.subscribe( (val) => console.log("[subscribe] subdata = ",val));
store.$mobx.subsubdata.subscribe( (val) => console.log("[subscribe] subsubdata = ",val));

autorun( () => {
    console.log("[autorun] subdata = ",store.subdata);
});

autorun( () => {
    console.log("[autorun] subsubdata = ",store.subsubdata);
});

store.data = [1,2,3];
