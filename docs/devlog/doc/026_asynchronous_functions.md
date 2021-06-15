# 026_asynchornous_functions

first off, i'm removing the inner object code.

but otherwise, this is going to be a big rewrite.
turns out async changes a lot...

---

big re-write. code is a lot simpler.

basically the problem was that i couldn't use a global `running` variable
anymore. that's because when you have asynchronous functions ... well
you can't rely on global variables.

so instead i change the wrap for functions:

```js
if (typeof obj[name] == 'function')
{
    let _ = {};
    Object.keys(obj).forEach(child => Object.defineProperty(_, child, {

        // this is the get _inside_ a function
        get() { return getter(child, name); },
        set(v) {
            fail('function '+name+' is trying to change value '+child);
        }
    }));

    fn[name] = () => { return obj[name](_); }

    // this is getting the function itself (outside, kind-of)
    prop = { get() { return getter(name) } }
}    
```

normally functions are run just passing in the wrap
i.e. `_`. now what I do is I construct a new `_` for
each function. and this new `_` passes in the
function name to the `getter` calls.

and now `getter` has a second parameter: `parent`

```js
let getter = (name, parent) => {

    if (fatal.msg) return; // do nothing if a fatal error occured

    if (parent) deps[parent][name] = true;

    return value[name];
}
```

note how insanely simple this is now
(in the actual function i've put in a lot of
debugging code which i still want to do more
cleanly...).

so now `getter` knows who's calling it.

what did `getter` look like before?

```js
let getter = (name) => {

    if (fatal.msg) return; // do nothing if a fatal error occured
    if (running && deps[running].indexOf(name) === -1) deps[running].push(name);

    if (!(name in value)) // value is stale
    {
        let val = value[name]; // save old value
        update(name);
        if (val != value[name]) run_subs(name); // value changed. run subscriptions
    }

    return value[name];
}
```

amazing how much simpler things are.
i don't need to use `running` because
each `getter` call has the parent info.

also note that i'm no longer doing things lazily:
i assume that everything is up to date, and
all updates are run on `setter`.

this is the new `setter` (without the debug code):

```js
let setter = (name, val) => {

    if (fatal.msg) return; // do nothing if a fatal error occured

    value[name] = val;
    run_subs(name);
    Object.keys(deps).forEach( parent => {
        if (name in deps[parent]) update(parent);
    });
}
```

again, hugely simpler than the old one.

what about `update`?

```js
let update = (name) => {   // update a function

    if (fatal.msg) return; // do nothing if a fatal error has occurred

    stack.push(name);
    if (called[name]) fail('circular dependency');

    deps[name] = {};
    called[name] = true;
    value[name] = fn[name]();
    
    Object.keys(deps).forEach( parent => {
        if (name in deps[parent]) update(parent);
    });

    run_subs(name);

    delete(called[name]);
    stack.pop();
}
```

kind of the same. except note that i'm running `update`
recursively now - we just run update on all the parents
too.

also i've changed `deps` to be an object within an object
(instead of array) to make the code a bit nicer. which is
why all of the tests had to be changed (just a new format).

also note - this is where `run_subs` is done now.

## ok but why

well the thinking is that now i can have an asynchronous
function do stuff... and we can still trace it correctly.
but now i need to think how a test might look...

## (test) 031_async_function.js

i was thinking something like this:

```js
module.exports = {
    obj: {
        data: [1,2,3],
        async_func: (_,set) => setTimeout( () => set('async done'), 100)
    },
    fn: ($, global) => {
        // loop until async_func finishes...
        const stop = new Date().getTime() + 200;
        while(new Date().getTime() < stop);
    },
    _: {
        fn: [ 'async_func' ],
        deps: { },
        subs: { },
        value: { data: [1,2,3], async_func: 'async done' },
        fatal: { }
    }
}
```

so now when we define a function we can pass a second parameter: `set`.
`set` is what you call when you are done with the value, i mean
when you have the value you want.

---

hmmm ok so the code seems to be working. i just need to figure
out how to get the test to wait for a while... hmmm...

i'm going to commit this i think cause it's getting late.

going to add a field to specify that we need to wait until
for a set time before checking results:

```js
module.exports = {
    obj: {
        data: [1,2,3],
        async_func: (_,set) => setTimeout( () => set('async done'), 100)
    },
    fn: ($, global) => {},
    timeout: 200, // wait for a set time
    _: {
        fn: [ 'async_func' ],
        deps: { },
        subs: { },
        value: { data: [1,2,3], async_func: 'async_done' },
        fatal: { }
    }
}
```

---

ok, it's working. maybe just to make sure i should have
another async that does not complete.

```js
module.exports = {
    obj: {
        data: [1,2,3],
        async_func: (_,set) => setTimeout( () => set('async done'), 100),
        another_async: (_,set) => {
            setTimeout( () => set('another done'), 300);
            return null
        }
    },
    fn: ($, global) => {},
    timeout: 200, // wait for a set time
    _: {
        fn: [ 'async_func', 'another_async' ],
        deps: { async_func: {}, another_async: {} },
        subs: { },
        value: { data: [1,2,3], async_func: 'async_done', another_async: null },
        fatal: { }
    }
}
```

works perfectly (i decreased the times as well so the tests are instant again).

woohoo!

## short

i really am amazed at how short everything is now:

```js
let getter = (name, parent) => {

    if (parent) deps[parent][name] = true;

    return value[name];
}

let setter = (name, val) => {

    value[name] = val; run_subs(name);

    Object.keys(deps).forEach( parent => {
        if (name in deps[parent]) update(parent);
    });
}
```

`update` is longer.

```js
let update = (name) => {   // update a function

    stack.push(name);
    if (called[name]) { fail('circular dependency'); return; }

    deps[name] = {};
    called[name] = true;
    value[name] = fn[name]();
    
    Object.keys(deps).forEach( parent => {
        if (name in deps[parent]) update(parent);
    });

    run_subs(name);

    delete(called[name]);
    stack.pop();
}
```

most of it is checking for circular dependencies
(and being able to print out the stack for this).
if we could somehow avoid this or make it shorter...
the rest is just four statements, really;

```js
deps[name] = {};
value[name] = fn[name]();

Object.keys(deps).forEach( parent => {
    if (name in deps[parent]) update(parent);
});

run_subs(name);
```

the only other part which is the wrap,
and that is now the most complicated, primarily
for functions:

```js
if (typeof obj[name] == 'function')
{
    let _ = {};
    Object.keys(obj).forEach(child => Object.defineProperty(_, child, {
        // this is the get/set _inside_ a function
        get() { return getter(child, name); },
        set(v) { fail('function '+name+' is trying to change value '+child); }
    }));

    fn[name] = () => obj[name](_, (v) => setter(name, v) );

    // this is getting the function itself (outside, kind-of)
    prop = { get() { return getter(name) } }
}
```

and this is largely because we build up a modified version of
our root object to indicate the parent ... which is what has
simplified everything as well. (i wonder if we could use this
for other means, like simplifying the circle detection, or
making the tracing code more plugabble...).

it's definitely a new avenue - i'm actually surprised it worked
so easily. i struggle to follow which scope is where ...

i suppose looking at it now the function wrap isn't so bad.
you just need to break it down, i guess:

- the whole point here is two-fold: (1) create `fn[name]` where
`name` is the function name you gave in the object, and (2) put
in a getter for the object property ... this part is confusing
because we can now get inside and outside, bizarrely...

in fact, i might even remove the outter get completely. it sounds
strange but i actually can't see a use for it - if you really
want to know why not just inspect the `values` thingy - the only
reason for using the actual `getter` function is to track dependencies,
and it won't be used at all if you call it from the outside.

again, it's weird cause surely you want to use this thing like
a black box, but really no - it's made to be used in the front-end
and for that it's all subscriptions...

we do need to assign `setter` ... for the static values ...
might as well leave in that one line.

and lastly, it's subscribe - lots of code there.

```js
hash[name] = {}
hash[name].get = () => getter(name);
hash[name].set = (v) => setter(name, v);
hash[name].subscribe = (f) => {

    let subtag = get_subtag(name);

    if (!subs[name]) subs[name] = {}; // added this
    subs[name][subtag] = (v) => f(v); // now inside [name]
    
    f(value[name]);

    // return unsubscribe method
    return () => { delete(subs[name][subtag]); } // now inside [name]
};
```

this one is tricky because we have to make it delete
the correct one and fill up correctly with subtags ...

## wrap cleanup

ok so now wrap looks like this:

```js
let wrap = (res, hash, obj) => {

    if (!obj['#fatal']) obj['#fatal'] = default_fatal;

    Object.keys(obj).forEach(name => {

        if (typeof obj[name] == 'function') setup_dynamic (obj, name, res);
        else setup_statuc (name, res);

        setup_sub(hash, name);
    });
}
```

i suppose it's clearer what's happening...
though now there's three more functions
floating around which sucks. and it's now
not clear that those functions all are
just run once during setup... i mean, when
you're just scrolling through the code.

i've put all the setup functions at the
bottom and put comments in to break these
two sections apart and explain ...

still not happy with it, though. code
doesn't look super clear.

added lots of comments ... not sure it makes
things any clearer.