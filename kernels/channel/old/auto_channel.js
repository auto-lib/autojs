
/*
    trying to see what auto would look like
    if the whole thing was written using
    this subscriber/message pattern
*/

// https://stackoverflow.com/a/16608045
let isObject = function(a) { return (!!a) && (a.constructor === Object); };

let isStringOrUndefined = function(a) { return typeof a === 'undefined' || typeof a === 'string'};
let isObjectOrUndefined = function(a) { return typeof a === 'undefined' || isObject(a)};

let assert = (test,msg) => {
    if (!test) { console.trace(msg); process.exit(1); }
}

let setup_err = (name,onerror,errs) => {
    let err = e => console.log('ERROR in',name,':',e);
    if (typeof onerror !== 'function') console.log('CRITICAL error handler is not function:',onerror);
    else err = onerror;
    return err;
}


// what to do if a value changes
let change_response = name => value => {};

function register(msg,msgs,fn)
{

}

function setup_internals()
{
    return {}
}

function setup_proc(proc)
{
    return () => {};
}

// let proc = {
//     'init': {
//         pre: [],
//         (obj,fire,err) => {
//         if (typeof obj === 'undefined') err('obj undefined');
//         else if (!isObject(obj)) err('obj not object',obj);
//         else fire('obj ok',obj);
//     },
//     'obj ok': (obj,fire,err) => {

//     }
// }

function _load(str)
{
    let ret = {};

    if (typeof str === 'undefined') console.log('WARNING nothing passed into load');
    if (!isObject(str))
    {
        console.log('FATAL passed in non-object to load:',str);
        process.exit(1);
    }
    else
        Object.keys(str).forEach(key => {
            ret[key] = str[key].fn;
        })

    return ret;
}

function load(setup)
{

}

function auto(obj)
{
    let { set } = load({
        obj: {
            variable: true, // maybe these are implied? if there is no 'fn'?
            multiple: false,
            checks: [
                obj => typeof obj !== 'undefined',
                obj => isObject(obj)
            ]
        },
        state: {
            variable: true,
            from: ['obj'],
            conditions: [ obj => typeof obj['state'] != 'undefined'],
            checks: [obj => isObject(obj['state'])],
            fn: obj => obj['state']
        }
    })

    set('obj',obj);

    // let { init } = load({
    //     init: {
    //         pre: [], // always wait for these first
    //         autoinit: true, // get dependencies automatically
    //         fn: () => {
    //             console.log('init fn');
    //         }
    //     }
    // })

    // init(obj);

    // why not just:
    // signal('init',obj);
    // ???
    // is that not equivalent to above?
    // then 'signal' would have to be returned
    // by 'load'

    // let signal = load({
    //     init: {
    //         fn: obj => {

    //         }
    //     }
    // })

    // signal('init', obj);


    // let internals = setup_internals();

    // let fire = setup_proc(proc,internals);

    // return fire('init',obj);

    // let reg = (msg,fn) => register(msg,msgs,fn);

    // reg('init', () => {

    //      if (obj)
    // })
    // assert(obj, "must pass object in");
    // assert(isObject(obj), "not object");

    // show_errs_and_exit(errs);

    // const { name, onerror, state, channels, imports, exports } = obj;

    // assert(typeof name === 'undefined' || isString(name), "not string");
    // assert(typeof onerror === 'undefined' || isFunction(onerror), "not function");
    // assert(typeof state ===, "not object");
    // assert(isArrayOrUndefined(channels), "not array");
    // assert(isArrayOrUndefined(imports), "not array");
    // assert(isArrayOrUndefined(exports), "not array");

    // let err = setup_err(name, onerror, errs);
    
    // if (imports)
    //     imports.forEach(n => {
    //         let resp = change_response(n);
    //         let evnt_name = `${n} changed`;
    //         let found;
    //         if (channels)
    //             channels.forEach(ch => {
    //                 if (ch.has_event(evnt_name))
    //                 {
    //                     if (found) err(`import ${i} is being pulled from channel ${ch.name} and channel ${found.name}`);
    //                     else
    //                     {
    //                         found = ch;
    //                         ch.add_response(evnt_name, resp);
    //                     }
    //                 }
    //             })
    //     })

    // return {
    //     has_event: n => {}
    // }
}

module.exports = auto;