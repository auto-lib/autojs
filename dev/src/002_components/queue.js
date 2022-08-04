
let make_queue = () => {

    let qs = {};

    return {
        subscribe: (name, fn) => {
            console.log('subscribing to',name,'with',fn);
            qs[name] = fn;
        },
        publish: (name, v) => {
            console.log('publishing',name,'with',qs[name]);
            if (name in qs) qs[name]();
        }
    }

}

module.exports = make_queue;