// vm.js - minimal VM implementation
// A VM is: queue + handlers (delayed & immediate) + state

function vm(name, delayed = {}, immediate = {}) {
    let state = {};
    let queue = [];

    let sig = (signal, value) => {
        // immediate handlers return right away
        if (signal in immediate) {
            return immediate[signal](value, sig, state);
        }
        // delayed handlers go on the queue
        queue.push([signal, value]);
    };

    let step = () => {
        if (queue.length === 0) return false;
        let [signal, value] = queue.shift();
        if (signal in delayed) {
            delayed[signal](value, sig, state);
        }
        return true;
    };

    // run all queued signals until empty
    let run = () => {
        let steps = 0;
        while (step()) steps++;
        return steps;
    };

    return {
        name,
        sig,
        step,
        run,
        _: () => ({ queue: [...queue], state: { ...state } })
    };
}

export default vm;
