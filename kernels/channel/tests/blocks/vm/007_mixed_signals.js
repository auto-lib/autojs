// mix of immediate and delayed signals

export default {
    vm: {
        delayed: {
            compute: (value, sig, state) => {
                // read x via immediate, store result
                let x = sig('get', 'x');
                state.doubled = x * 2;
            }
        },
        immediate: {
            get: (value, sig, state) => state[value],
            set: (value, sig, state) => { state[value.k] = value.v; }
        }
    },
    fn: (v) => {
        v.sig('set', { k: 'x', v: 10 });
        v.sig('compute', null);
        v.run();
    },
    _: {
        queue: [],
        state: { x: 10, doubled: 20 }
    }
}
