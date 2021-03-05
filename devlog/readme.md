
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

## autorun and subscribe and observable

so still three things to do (besides more rigorous
testing of the current functionality...)

 1. autorun a block of code
 2. add subscribe to both types `atom` and `auto` (maybe a different name)
 3. wrap

for the wrap i mean:

```js
let state = wrap({
    data: null,
    get count() { if (this.data) return this.data.length; else return 0; },
    get msg() { "data =" + this.data + ", count = " + this.count }
})
```

which is much cleaner and easy enough to do.

for the subscribe (and the above pattern) i want to be able to say:

```js
state.data.subscribe( (val) => console.log("data =",val) );
```

not sure how to do this, though it could be done with `autorun`...
it's pretty much the same functionality, though i can't think
of a good reason to use autorun!

```js
autorun( () => {

    console.log("data = ",state.data);

})
```

i suppose we could just have a special list just for functions
and list out their dependencies... and then i suppose their
own dirty implementation. but what sucks is that now
both `atom` and `auto` need to have extra code added....

speaking of which

## 004d.js

is this cleaner?

```js

let running;
let deps = {};
let dirty = {};

let atom = (name, fn) => {

    let value;

    if (fn) dirty[name] = true;

    return {

        get: () => {
            if (running) deps[running].push(name);
            if (fn && dirty[name])
            {
                deps[name] = [];
                running = name;
                value = fn();
                running = undefined;
                delete(dirty[name]);
            }
            return value;
        },
        set: (val) => {
            if (fn) console.trace("fatal: not settable");
            else
            {
                value = val;
                Object.keys(deps).forEach(n => dirty[n] = true )
            }
        }
    }
}

let data = atom('data');
let count = atom('count',() => data.get() ? data.get().length : 0);
let msg = atom('msg', () => "data =" + data.get() + ", count = " + count.get());

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

hmmm it does seem logical to combine the two... arrggh i hate it.

hmmm, maybe we can use the function `fn` to reference the `auto`
and then we could just use the same thing for `autorun`...

(and i've just noticed my dirty code in the setter is just
setting everything to dirty...)

## 005.js

```js
let atom = (name, fn) => {

    let value;
    let tag = name ? name : fn;

    if (fn) dirty[tag] = true;

    return {

        get: () => {
            if (running) deps[running].push(tag);
            if (fn && dirty[tag])
            {
                deps[tag] = [];
                running = tag;
                value = fn();
                running = undefined;
                delete(dirty[tag]);
            }
            return value;
        },
        set: (val) => {
            if (fn) console.trace("fatal: not settable");
            else
            {
                value = val;
                Object.keys(deps).forEach(n => dirty[n] = true )
            }
        }
    }
}
```

so we have a new variable `tag` which determines how to
track this value and/or function. so now we can just
have a function... will autorunning work like this???

```js
atom(null, () => console.log("auto data =",data.get()));
```

so this should just run whenever... erm...

```
c:\Users\karlp\mobx-svelte\devlog>deno run 005.js
data =  undefined
count = 0
msg = data =undefined, count = 0
data deps = undefined
count deps = [ "data" ]
msg deps = [ "data", "count" ]
Setting data
dirty =  { '() => console.log("auto data =",data.get())': true, count: true, msg: true }
msg =  data =1,2,3, count = 3
dirty =  { '() => console.log("auto data =",data.get())': true }
```

doesn't run. we need to run the function... plus see what all the deps are:

### 005a.js

```js

let running;
let deps = {};
let dirty = {};
let fns = {};
let values = {};

let update = (tag) => {

    deps[tag] = [];
    running = tag;
    let val = fns[tag]();
    running = undefined;
    return val;
}

let atom = (name, fn) => {

    let tag = name ? name : "#" + Math.round(1000*Math.random()).toString().padStart(3, "0"); // e.g. #012

    fns[tag] = fn;

    if (name && fn) dirty[tag] = true;
    if (!name) update(tag)

    return {

        get: () => {
            if (running) deps[running].push(tag);
            if (fn && dirty[tag])
            {
                values[tag] = update(tag);
                delete(dirty[tag]);
            }
            return values[tag];
        },
        set: (val) => {
            if (fn) console.trace("fatal: not settable");
            else
            {
                values[tag] = val;
                Object.keys(deps).forEach(n => {
                    if (n[0]=='#') update(n); // auto function
                    else dirty[n] = true
                })
            }
        }
    }
}

let data = atom('data');
let count = atom('count',() => data.get() ? data.get().length : 0);
let msg = atom('msg', () => "data =" + data.get() + ", count = " + count.get());

atom(null, () => console.log("auto data =",data.get()));

console.log("data = ",data.get())
console.log("count =",count.get())
console.log("msg =",msg.get())

console.log("deps =",deps);

console.log("Setting data");

data.set([1,2,3]);

console.log("dirty = ",dirty);

console.log("msg = ",msg.get());

console.log("dirty = ",dirty);

console.log("values = ",values);
```

output:

```
c:\Users\karlp\mobx-svelte\devlog>deno run 005a.js
auto data = undefined
data =  undefined
count = 0
msg = data =undefined, count = 0
deps = { "#800": [ "data" ], count: [ "data" ], msg: [ "data", "count" ] }
Setting data
auto data = [ 1, 2, 3 ]
dirty =  { count: true, msg: true }
msg =  data =1,2,3, count = 3
dirty =  {}
values =  { count: 3, msg: "data =1,2,3, count = 3", data: [ 1, 2, 3 ] }
```

great, it works. the code is messy, and still need to fix the dirty calc
in `set`, but auto works.

so i've pulled out update functions and current values into their
own external variables (can wrap these easily inside an object
when using our `wrap` command). and now i have a single `tag`
variable for each thing: atoms (just a `name`), derived variables
(both a `name` and an update `fn`) and an autorun block of code
(just an update `fn`). so now we can easily see, as well,
what the state of each variable is i.e. it's good to keep
actual names in our structures for debugging purposes.
and we can quickly see what are just blocks of code (though it
would be great to have some way to trace their tag names
with them... i mean, having the filename and line number
would be ideal!).

# 005b.js

perhaps the simplest thing is just to say you gotta name the
function yourself:

```js
atom("#log data", () => console.log("auto data =",data.get()));
```

it must start with a hash... and if you leave it it will generate
a random hash value for you.

```
c:\Users\karlp\mobx-svelte\devlog>deno run 005b.js
auto data = undefined
data =  undefined
count = 0
msg = data =undefined, count = 0
deps = { "#print data": [ "data" ], count: [ "data" ], msg: [ "data", "count" ] }
Setting data
auto data = [ 1, 2, 3 ]
dirty =  { count: true, msg: true }
msg =  data =1,2,3, count = 3
dirty =  {}
values =  { count: 3, msg: "data =1,2,3, count = 3", data: [ 1, 2, 3 ] }
```

so now you can see the auto blocks in the data structures.

some things to note:

 - the auto blocks don't show up in `values` or `dirty`
 - the auto blocks don't use getters or setters:

```js
let atom = (name, fn) => {

    let tag = name ? name : "#" + Math.round(1000*Math.random()).toString().padStart(3, "0"); // e.g. #012

    fns[tag] = fn;

    if (tag[0] == '#') // auto function (not a variable)
        update(tag);
    else
    {
        if (fn) dirty[tag] = true;
    
        return {

            get: () => {
                if (running) deps[running].push(tag);
                if (fn && dirty[tag])
                {
                    values[tag] = update(tag);
                    delete(dirty[tag]);
                }
                return values[tag];
            },
            set: (val) => {
                if (fn) console.trace("fatal: not settable");
                else
                {
                    values[tag] = val;
                    Object.keys(deps).forEach(n => {
                        if (n[0]=='#') update(n); // auto function
                        else dirty[n] = true
                    })
                }
            }
        }
    }
}
```

also notice how all the code can just use the `tag` variable (we could pull
it all out to separate functions...). just for interest sake:

# 005c.js

```js
let running;
let deps = {};
let dirty = {};
let fs = {};
let value = {};

let update = (tag) => {

    deps[tag] = [];
    running = tag;
    let val = fs[tag]();
    running = undefined;
    return val;
}

let getter = (tag) => {

    if (running) deps[running].push(tag);
    if (fs[tag] && dirty[tag])
    {
        value[tag] = update(tag);
        delete(dirty[tag]);
    }
    return value[tag];
}

let setter = (tag, val) => {

    if (fs[tag]) console.trace("fatal: not settable");
    else
    {
        value[tag] = val;
        Object.keys(deps).forEach(n => {
            if (n[0]=='#') update(n); // auto function
            else dirty[n] = true
        })
    }
}

let atom = (name, fn) => {

    let tag = name ? name : "#" + Math.round(1000*Math.random()).toString().padStart(3, "0"); // e.g. #012

    if(fn) fs[tag] = fn;

    if (tag[0] == '#') // auto function (not a variable)
        update(tag);
    else
    {
        if (fn) dirty[tag] = true;
    
        return {

            get: () => getter(tag),
            set: (val) => setter(tag, val)
        }
    }
}
```

hmmm weird. not sure splitting them makes things clearer.
but it is nice to see each function separately - gives you
confidence in understanding that it literally just...
take one/two variables and then just updates the global
structures. you don't have to think about scope. or
closures. though i feel like there is some kind of
greater simplicity in here somewhere... all the logic
really is based on three options:

 - just `name`: **atomic** - no dirty, no deps, no update
 - just `fn`: **auto** - no getter, no setter
 - `name` and `fn`: **derivative** - use everything

i suppose those are the three possibilities, except
for no `name` or `fn` .... which is nothing.

ok but a `name` can _cause_ dirty, deps...
and `fn` is something that _responds_ to dirty,
deps.... i dunno. would be nice to split these two
out from one another as i did before to make this
clearer. can't see how, though.

## 006.js

ok let's do the wrap.

```js

let wrap = (object) => {

    // previous code in here

    const res = {
        _: { deps, dirty, fs, value }, // so we can see from the outside what's going on
        $: {} // store of atoms
    };

    Object.keys(object).forEach(key => {

        const descriptor = Object.getOwnPropertyDescriptor(object, key);

        if (descriptor.get) res.$[key] = atom(key, () => descriptor.get.call(res));
        else res.$[key] = atom(key, object[key]);

        Object.defineProperty(res, key, {
            configurable: true,
            enumerable: true,
            get() {
                return res.$[key].get();
            },
            set(value) {
                res.$[key].set(value);
            }
        });

    });

    return res;
}
```

so this is how we use it:

```js
let $ = wrap({

    data: null,
    get count() { return this.data ? this.data.length : 0 },
    get msg() { return "data =" + this.data + ", count = " + this.count },
    get ['#print data']() { console.log("auto data =",this.data) }
})
```

and to get values out:

```js
console.log("data = ",$.data)
console.log("count =",$.count)
console.log("msg =",$.msg)

console.log("deps =",$._.deps);

console.log("Setting data");

$.data = [1,2,3];

console.log("dirty = ",$._.dirty);

console.log("msg = ",$.msg);

console.log("dirty = ",$._.dirty);

console.log("values = ",$._.value);
```

output: (same as before)

```
c:\Users\karlp\mobx-svelte\devlog>deno run 006.js
auto data = undefined
data =  undefined
count = 0
msg = data =undefined, count = 0
deps = { "#print data": [ "data" ], count: [ "data" ], msg: [ "data", "count" ] }
Setting data
auto data = [ 1, 2, 3 ]
dirty =  { count: true, msg: true }
msg =  data =1,2,3, count = 3
dirty =  {}
values =  { count: 3, msg: "data =1,2,3, count = 3", data: [ 1, 2, 3 ] }
```

## better testing

next up we need to think about what are all the different scenarious
we could possibly want to test for. and because of the way we arranged
in the internal state those variables are all we could need to check:

 - `deps`
 - `dirty`
 - `value`

so for any scenario we have a block of code an say "after all this,
this is how `deps`, `dirty` and `value` should look". seems like a clean
way to do it - each just one block, with one `wrap` defined and a
sequence of events, i.e. gets/sets.

that's great, but what are the scenarios? what are the edge cases?
can i get to a point where i can be certain everything is checked /
there are no more fundamentally different scenarios?