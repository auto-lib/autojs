// handler can modify state

export default {
    vm: {
        delayed: {
            set: (value, sig, state) => {
                state.x = value;
            }
        }
    },
    fn: (v) => {
        v.sig('set', 123);
        v.step();
    },
    _: {
        queue: [],
        state: { x: 123 }
    }
}
