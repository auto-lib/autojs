// sig() adds to queue (delayed)

export default {
    vm: {
        delayed: {
            ping: () => {}
        }
    },
    fn: (v) => {
        v.sig('ping', 42);
    },
    _: {
        queue: [['ping', 42]],
        state: {}
    }
}
