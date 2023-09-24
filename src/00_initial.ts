
type Deps = Record<string, string[]>;
type Fn = Record<string, ()=>void>;
type Value = Record<string, string[]>;
type Fatal = Record<string, string[]>;
type Subs = Record<string, ()=>void>;

type Auto<T> = {
    _: { subs: Subs, fn: Fn, deps: Deps, value: Value, fatal: Fatal },
    '#': {},
    v: undefined
}

export function auto<T>(obj?: T): Auto<T> {

    const deps:Deps = {};   // list of dependencies (dynamic)
    const fn:Fn = {};     // list of functions (dynamic)
    const value:Value = {};  // current values (static and dynamic)
    const stack:string[] = [];  // list of call stack
    const fatal:Fatal = {};  // only set if fatal error occurs (and everything stops if this is set)
    const subs:Subs = {};   // functions to run each time a value changes (static and dynamic)

    const res = {                             // return object
        _: { subs, fn, deps, value, fatal },  // so we can see from the outside what's going on
        '#': {},                               // subscribe methods for each member
        v: undefined                            // version number of this lib
    };

    return res;

}