
import { box, autorun } from './box.js';

function applyObs(res, root, object) {

    Object.keys(object).forEach(key => {
        
        const descriptor = Object.getOwnPropertyDescriptor(object, key);

        // if it's a getter...
        if (descriptor.get)
        {
            // memoize
            root[key] = box(); // don't initialise. the autorun should cover that
            autorun( () => { root[key].set(descriptor.get.call(res)) })
        }
        else
            root[key] = box(object[key]);

        Object.defineProperty(res, key, {
            configurable: true,
            enumerable: true,
            get() {
                return root[key].get();
            },
            set(value) {
                root[key].set(value);
            }
        });

        if (!descriptor.get) // no need to recurse with getters
        {
            let type = Object.prototype.toString.call(object[key]);
            if (type == '[object Object]' || type == '[object Array]')
                applyObs(res[key], root[key], object[key]);
        }

    });
}
export function observable(object) {
    
    const res = {
        $mobx: {}
    };

    applyObs(res, res.$mobx, object); // recursively apply mobx style objects to each child of object
    
    return res;

}