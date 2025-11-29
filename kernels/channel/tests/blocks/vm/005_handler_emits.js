// handler can emit new signals

export default {
    vm: {
        delayed: {
            ping: (value, sig, state) => {
                sig('pong', value * 2);
            },
            pong: (value, sig, state) => {
                state.result = value;
            }
        }
    },
    fn: (v) => {
        v.sig('ping', 10);
        v.run(); // run all until empty
    },
    _: {
        queue: [],
        state: { result: 20 }
    }
}
