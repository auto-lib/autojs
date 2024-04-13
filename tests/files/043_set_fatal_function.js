// devlog/docs/026_asynchronous_functions.md

let message = null;

export default {
    obj: {
        data: (_) => _.hello = 123,
        '#fatal': (msg) => {
            // console.log('fatal', msg);
            message = 'fatal';
        }
    },
    fn: ($, global) => {
        global.msg = message;
    },
    timeout: 150, // wait for a set time
    _: {
        fn: [ 'data' ],
        deps: {data: {} },
        subs: { },
        value: { data: 123 },
        fatal: { msg: 'function data is trying to change value hello',
          stack: [ 'data' ]
        }
    },
    global: {
        msg: 'fatal'
    }
}