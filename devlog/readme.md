
# devlog

let's try build up the functionality slowly from
scratch along the way trying to illustrate
clearly how it operates.

## 001_basic_box.js

the simplest way to start is by creating a box
on it's own with just a getter and setter:

```js
function box(initial) {

    let value = initial;

    let obj = {};

    obj.get = () => value;
    obj.set = (val) => value = val;

    return obj;
}

let state = {
    data: box(),
    count: box(),
    msg: box()
}

state.data.set([1,2,3]);

console.log("Data =",state.data.get());
```

The output is:

```
c:\Users\karlp\mobx-svelte\devlog>deno run 001_basic_box.js
Data = [ 1, 2, 3 ]
```

## 002_functions.js

now let's say we want to define `count` and `msg` as functions:

```js
...

let state = {
    data: box(),
    get count(): { return state.data.get() ? state.data.get().length : 0 },
    get msg(): { return "Got data " + state.data.get() + " with length "+ state.count }
}

state.data.set([1,2,3]);

console.log("Data =",state.data.get());
console.log("Msg =",state.count);
```

The output is:

```
c:\Users\karlp\mobx-svelte\devlog>deno run 002_functions.js
Data = [ 1, 2, 3 ]
Msg = Got data 1,2,3 with length 3
```

this works fine except:

 1. no caching of values (every getter is re-evaluated each time)
 2. mixed access type (direct box values use `.get()`)

The way we fixed `1.` is by wrapping the entire object i.e. with
`observable` so we can iterate an construct the getter cleanly,
though I it seems a lot of complexity just for that. To fix `2.`
we need to keep track of what each function relies on.

To do this previously we used this `autorun` procedure from
MobX though that doesn't seem to work (I don't know how MobX
fixed this) - `autorun` ran the function i.e. the getter
so that each access of the variables could be tracked.

 - `some_getter_function()`
  - `dependent_var_1`
  - `dependent_var_2`

so for our example above this would look this so:

 - `data`
  - No dependent vars
 - `count`
  - **data**
 - `msg`
  - **data**
  - **count**

then anytime one of these is set, so as in our example
we set `data`, each of the dependent functions is run,
i.e. `get count` and `get msg`.

this is how it worked with autorun. but this is not a
good way to enable the caching of getters because
you have to run those in the right order!

i tried to fix this by sorting the dependency tree
but that doesn't work either (which is even trickier
to explain / flesh out so i won't try now).

what we really need in cases like this is to re-run
those getters on demand if needs be.

 1. set `data`
 2. get `msg`
  i. get `count`
   a. `count` is must be re-run since `data` has changed
   b. re-run `count` and return
  ii. get `msg`
    a. get `count`
      x. `count` has already been evaluated with the latest changes (`data`) so just return cached value
    b. get 'data`
      y. no need to re-run (or run at all)... just return value

so the question is... what is the cleanest way to implement the above statement (`2iiax`): `... has
already been evaluated with latest changes` and also to print this out so we can clearly see it
working (as in the list i just wrote)?

one thing to note:

 - no need to do this for non-getter values i.e. `data` in above. this is just for getters

so, basically: each getter needs to have a way of knowing whether it needs to re-run.
or: we could have them re-run on the outside...

> also: we need to make the autorun work as well... because what if you subcribe to, say, `msg`:
> you need to have that fire when `data` is changed, so the ordering problem persists!

### 003_track_deps.js

we have to track the values somehow:

```js
let data = null;

let state = {
    get count(): { return data ? data.length : 0 }
}
```

let's write this out as simply as we can:

```js
let data = {
    value: null,
    name: 'data',
    get val() { 
        deps.push(this.name);
        return this.value;
    }
}

let get_count = () => data.val ? data.val.length : 0;

let deps = [];

get_count();

console.log('deps =',deps);
```

This returns

```
c:\Users\karlp\mobx-svelte\devlog>deno run 003_track_functions.js
deps = [ "data" ]
```

It may seem naive but the basic idea is this:

 - before running a function reset a tracking variable, here `deps`
 - in the dependent variable getters, add themselves to the tracking variable

Easy. So we now know which values the function needs.
Now all we need to do is know which of these values has changed
since the last time we ran the function...

## 004_track_value_changes.js

basically we want something like this:

```js

let obj = {
    value,
    dirty,
    calc() { return data.val ? data.val.length : 0 },
    get() {
        if (dirty)
        {
            this.value = calc();
            this.dirty = false;
        }
        return this.value
    }
}

```

so we mark whether the value needs to be recalculated.
but how do we set this i.e. `dirty` ? it has to be
done whenever a value is set... but also to any dependents...

```js

let obj = {
    dirty,
    set_dirty() {
        // if i am dirty, then any values
        // that depend on me are too
        deps.forEach(d => d.set_dirty());
        this.dirty = true;
    }
}
```

let's try combine these: get dependencies,
and also a recursive set-dirty function:

```js
let box = (name) => {
    value,
    name,
    dirty,
    deps,
    get val() {
        deps.push(this.name);
        return this.value;
    },
    set_dirty() {
        // if i am dirty, then any values
        // that depend on me are too
        this.deps.forEach(d => d.set_dirty());
        this.dirty = true;
    }
}

let data = box('data');
let count = box('count');

let get_count = () => data.val ? data.val.length : 0;

let deps = [];

get_count();

console.log('deps =',deps);
```

the irony of this codes now-complexity in order
to make things simpler is not lost of me.

what is the sequence of events (ha) we want to occur?

 1. we set a value
 2. that value goes through all it's dependents and sets them to dirty

that should be it, you don't need to calculate the value until the
get. however, what about subscribes? we should just go through and update
them all. however, we should combine the approaches - each value knows
when it needs to re-run.

here is one way to think about it: some values have an `update` or
`calculate` function. that needs to be run whenever a variable
inside has changed. so values have an update function, and update
functions have dependent values, and those values have functions,
etc etc forever.

 - value
  - update function
    - dep value
      - update function
        - dep value
        - dep value
        - ...
    - dep value
    - dep value

and also - we want to be able to batch value sets, i.e. do nothing
until we say so, i.e.

 1. set value `x`
 2. set value `y`
 3. set value `z`
 4. perform update functions

so given a set of value changes `C` how do we re-run all the
requisit updates correctly?

if each value keeps track of their dependent variables...
then each one can decide on it's own if it needs to update.
i.e. have a global `dirty` list. this fixes the ordering
problem - it doesn't matter what order we run everything.
each value loops through it's dependents, checks if any are on the dirty
list... then re-runs. but how will it know next time that
it's all good?

## 004a.js

ok check this out

```js

let running;
let deps = {};

let get_deps = (name, fn) => {

    deps[name] = []; // reset

    if (fn)
    {
        running = name;
        fn();
    }
}

let box = (name, fn) => {

    get_deps(name, fn);

    return {
        get: () => {
            deps[running].push(name);
        }
    }
}

let data = box('data');
let count = box('count',() => data.get() ? date.get().length : 0);
let msg = box('msg', () => "data =" + data.get() + ", count = " + count.get());

console.log("data deps =",deps['data']);
console.log("count deps =",deps['count']);
console.log("msg deps =",deps['msg']);
```

so this is the output:

```
c:\Users\karlp\mobx-svelte\devlog>deno run 004a.js
data deps = []
count deps = [ "data" ]
msg deps = [ "data", "count" ]
```

nice and clean. we create a global list called `deps`
that you can ask for any of the dependencies of
any of the functions. it doesn't do anything recursive
so we just know which values directly impact this.
note this works because we only run the dependent
function in `get_deps` i.e. not inside of the getter.

the big thing about why this is all so difficult
is that the function we use for updating
doesn't know what it's associated with:
we have to set this globally. otherwise we'd have
to do something really messy like pass in something
to each get inside:

```js
let msg = box('msg', () => "data =" + data.get('msg') + ", count = " + count.get('msg'));
```

but if we keep the tracking in the getter really clean:

```js
return {
    get: () => {
        deps[running].push(name);
    }
}
```

we can be sure we just have a flat list of values.
however .... we do need to keep calling `get_deps`
because code paths could have changed in the function
e.g.

```js
let data1 = box('data1');
let data2 = box('data2');
let count = box('count',() => data1.get() ? date1.get().length : (data2.get() ? data2.get().length : 0));
```

the dependencies here change depending on whether `data1`
or `data2` exist. at first we'll get them both as
dependencies, since on first run they will both be checked
for existance. however, the moment `data1` exists
then `data2` won't be checked for existence.

however, we can always just check if one of the dependencies
have changed. only then do we need to re-run `get_deps`.
(worth proving this). when does this need to happen?
well certainly not at first - our first run through
will give the right dependencies for everything.
when and only when a `set` is performed (which can only
happen on a box with an update function...) so we need
to worry about anything... so what does the `set` function
look like?

```js
let box = (name, fn) => {

    get_deps(name, fn);

    return {
        get: () => {
            deps[running].push(name);
        },
        set: () => {
            if (!fn) console.trace("error: cannot set atomic value");
            else
            {
                // loop through each box
                Object.keys(deps).forEach( n => {
                    if (name != n) // not me
                    {
                        // loop through each box's dependent values
                        deps[name].forEach(d => {
                            
                            // recalculate dependent values...

                        });
                    }
                })
            }
        }
    }
}
```

so messy already. we can do better.

```js
let set_dirty = (name) => {

    Object.keys(deps).forEach( n => {
        if (name != n)
        {
            deps[name].forEach(d => {
                
                // recalculate dependent values...

            });
        }
    })
}

let box = (name, fn) => {

    get_deps(name, fn);

    return {
        get: () => {
            deps[running].push(name);
        },
        set: () => {
            if (!fn) console.trace("error: cannot set atomic value");
            else set_dirty(name);
        }
    }
}
```

better. though ... why not just set a global dirty variable?

```js

let dirty = {};

let box = (name, fn) => {

    get_deps(name, fn);

    return {
        get: () => {
            deps[running].push(name);
            delete(dirty[name]); // no longer dirty?
        },
        set: () => {
            if (!fn) console.trace("error: cannot set atomic value");
            else dirty[name] = true;
        }
    }
}
```

god is can this be super simple? why not just this:

```js

let dirty = {};

let box = (name, fn) => {

    get_deps(name, fn);

    return {
        get: () => {
            deps[running].push(name);
            if (dirty[name])
            {
                value = fn();
                delete(dirty[name]);
            }
        },
        set: () => {
            dirty[name] = true;
        }
    }
}
```

if we're dirty, re-calculate. why would that not work?

## 004b.js

```js

let running;
let deps = {};
let dirty = {};

let get_deps = (name, fn) => {

    deps[name] = []; // reset

    if (fn)
    {
        running = name;
        fn();
    }
}

let box = (name, fn) => {

    let value;
    get_deps(name, fn);

    return {
        get: () => {
            deps[running].push(name);
            if (fn && dirty[name])
            {
                value = fn();
                delete(dirty[name]);
            }
            return value;
        },
        set: (val) => {
            value = val;
            dirty[name] = true;
            Object.keys(deps).forEach(n => { if (deps[n].indexOf(name) !== -1) dirty[n] = true;} )
        }
    }
}

let data = box('data');
let count = box('count',() => data.get() ? data.get().length : 0);
let msg = box('msg', () => "data =" + data.get() + ", count = " + count.get());

console.log("data deps =",deps['data']);
console.log("count deps =",deps['count']);
console.log("msg deps =",deps['msg']);

console.log("msg = ",msg.get());

console.log("Setting data");

data.set([1,2,3]);

console.log("dirty = ",dirty);

console.log("msg = ",msg.get());
```

output:

```
c:\Users\karlp\mobx-svelte\devlog>deno run 004b.js
data deps = []
count deps = [ "data" ]
msg deps = [ "data", "count" ]
msg =  undefined
Setting data
dirty =  { data: true, count: true, msg: true }
msg =  data =1,2,3, count = 3
```

seems to work. simpler than i thought... though i wouldn't
mind it being even clearer what's happening.

so we have a global list called `dirty` which
tracks every box and whether it's dirty. then
whenever we set something we update `dirty`
to reflect all the dependent values... that seems
simple enough but more simple than i was expecting
somehow. what confuses me is recursion - i thought
that was going to be a problem but even though `msg`
depends on `count` which depends on `data` we aren't
getting an recursion which i _love_....

one thing i didn't do was re-run the deps...

## 004c.js

```js

let running;
let deps = {};
let dirty = {};

let atom = (name) => {

    let value;

    return {

        get: () => {
            if (running) deps[running].push(name);
            return value;
        },
        set: (val) => {
            value = val;
            Object.keys(deps).forEach(n => dirty[n] = true )
        }
    }
}

let auto = (name, fn) => {

    let value;

    dirty[name] = true;

    return {
        get: () => {
            if (running) deps[running].push(name);
            deps[name] = [];
            if (dirty[name])
            {
                running = name;
                value = fn();
                delete(dirty[name]);
            }
            return value;
        }
    }
}

let data = atom('data');
let count = auto('count',() => data.get() ? data.get().length : 0);
let msg = auto('msg', () => "data =" + data.get() + ", count = " + count.get());

console.log("data = ",data.get())
console.log("count =",count.get())
console.log("msg =",msg.get())

console.log("data deps =",deps['data']);
console.log("count deps =",deps['count']);
console.log("msg deps =",deps['msg']);

console.log("Setting data");

data.set([1,2,3]);

console.log("dirty = ",dirty);

console.log("msg = ",msg.get());

console.log("dirty = ",dirty);
```

output:

```
c:\Users\karlp\mobx-svelte\devlog>deno run 004c.js
data =  undefined
count = 0
msg = data =undefined, count = 0
data deps = undefined
count deps = []
msg deps = [ "data", "count" ]
Setting data
dirty =  { count: true, msg: true }
msg =  data =1,2,3, count = 3
dirty =  {}
```

_much_ cleaner. the point is that atomic values behave
completely differently to what i'm calling `auto` - 
values that are derived. only auto values need
to have their dependencies tracked, as well as dirty.
also, auto values have no `set`. so it's only atomic
values that set `dirty`, which is unexpected...

but wait - why are the dependencies for `count` showing
as empty? hmm, fixed (not gonna paste the whole new
version...).