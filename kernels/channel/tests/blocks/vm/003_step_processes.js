// step() removes from queue and processes

export default {
    vm: {
        delayed: {
            ping: () => {}
        }
    },
    fn: (v) => {
        v.sig('ping', 42);
        v.step();
    },
    _: {
        queue: [],
        state: {}
    }
}
