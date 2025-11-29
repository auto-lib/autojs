// immediate handler returns value, doesn't queue

export default {
    vm: {
        delayed: {},
        immediate: {
            get: (value, sig, state) => {
                return state[value];
            },
            set: (value, sig, state) => {
                state[value.name] = value.val;
            }
        }
    },
    fn: (v, global) => {
        v.sig('set', { name: 'x', val: 42 });
        global.result = v.sig('get', 'x');
    },
    _: {
        queue: [],
        state: { x: 42 }
    },
    global: {
        result: 42
    }
}
