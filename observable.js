
import { box, autorun } from './box.js';

export function observable(object) {
    const res = {
        $mobx: {}
    };

    Object.keys(object).forEach(key => {
        
        res.$mobx[key] = box(object[key]);

        const descriptor = Object.getOwnPropertyDescriptor(object, key);

        // if it's a getter...
        if (descriptor.get)
        {
            // memoize
            autorun( () => { res.$mobx[key].set(descriptor.get.call(res)) })
        }

        Object.defineProperty(res, key, {
            configurable: true,
            enumerable: true,
            get() {
                return this.$mobx[key].get();
            },
            set(value) {
                this.$mobx[key].set(value);
            }
        });
        
    });

    return res;

}