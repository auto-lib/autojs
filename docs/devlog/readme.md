
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

## 007.js

ok so i just realised we can be cleaner:

```js
let $ = auto({
    data: null,
    count: ($) => $.data ? $.data.length : 0,
    msg: ($) => "Got " + $.count + " items",
    '#print data': ($) => console.log("auto data =",$.data)
})
```

(note i've renamed the function from `wrap` to `auto`).

(also i've created `auto.js` in the root folder which is
just the latest form the devlog, i.e. `007.js` for now
and i am going to publish to npm under `@autolib/auto`.
`auto`, `@kewp` and `@auto` were taken :|).

we needn't specify javascript `get`ers (so now it's shorter),
we don't need
to use `this` everywhere (`$` is shorter too), and using `$.` inside will be
consistent with accessing the state outside
i.e. `$.data = [1,2,3];`. also note: this is a break from
MobX's `observable` syntax.

we need to change the
wrapper function, though, since it looks for getters
(and should rather just see if everything is a function)

```js
Object.keys(object).forEach(key => {

    if (typeof object[key] == 'function') res.$[key] = atom(key, () => object[key](res));
    else res.$[key] = atom(key, object[key]);

    // rest is same as before
});
```

so we just check if the propert is a function.
if so, create an atom with a new function
that just calls this property but passing in
`res` (which is just an object with all the atoms
in it).

## auto blocks

one thing i'm wondering is if the auto blocks can
be cleaner, or even if they are needed. by this
i mean `#print data` in the example:

```js
let $ = auto({
    data: null,
    count: ($) => $.data ? $.data.length : 0,
    msg: ($) => "Got " + $.count + " items",
    '#print data': ($) => console.log("auto data =",$.data)
})
```

can't we just call it `print data` and it will run
on it's own?

```js
let $ = auto({
    // ...
    'print data': ($) => // ...
})
```

hmmm, no. we need this to run whenever updates happen.
look at the setter code:

```js
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
```

notice how if we are in an auto block (name starts with `#`)
we run the update, otherwise just set the variable to dirty.

this is an important point: a derived value is _lazy_ (for
some very good reasons...) where-as we want the auto blocks
to run when changes occur. note though: what about batching?
this is something i have yet to look at...

## batching

i need to look at when and how to do batching, or if it's
even needed because of the lazy updating. also would be worth
writing a document describing the lazy approach and how it
results in a very different behaviour to ... a not-lazy
approach... (?)

## 008.js

seriously considering removing auto blocks. what is the point
of them? perhaps they could be useful for a ui library.

one thing i've decided in writing the docs is a hard rule:
functions cannot have side affects! so in

```js
let $ = auto({
    data: null,
    count: ($) => $.data ? $.data.length : 0
})
```

the `$` passed into `count` cannot have setters assigned
to the members, i.e. this should fail

```js
let $ = auto({
    data: null,
    update: ($) => { $.data = [1,2,3]; }
})
```

without auto blocks the atom code is much simpler:

```js
let atom = (name, fn) => {

    if(fn) {
        fs[name] = fn;
        dirty[name] = true;
    }
    return {

        get: () => getter(name),
        set: (val) => setter(name, val)
    }
}
```

the setter is simpler too:

```js
let setter = (name, val) => {

    if (fs[name]) console.trace("fatal: not settable"); // do we need this?
    else
    {
        value[name] = val;
        Object.keys(deps).forEach(n => dirty[n] = true)
    }
}
```

if we just checking if `running` is set will that
ensure side affects?

```js
let setter = (name, val) => {

    if (fs[name]) console.trace("fatal: not settable"); // do we need this?
    else
    {
        if (running) console.trace("fatal: can't have side affects inside a function")
        else
        {
            value[name] = val;
            Object.keys(deps).forEach(n => dirty[n] = true)
        }
    }
}
```

let's see what happens with the previous code:

```js
let $ = auto({
    data: null,
    update: ($) => { $.data = [1,2,3]; }
})
```

```
c:\Users\karlp\auto\docs\devlog>deno run 008.js

c:\Users\karlp\auto\docs\devlog>
```

nothing happens - we don't run the inner functions
at first (what was the reason for that?).
we have to access it (i guess lazy is ... efficient?)

```js
$.update;
```

```
c:\Users\karlp\auto\docs\devlog>deno run 008.js
Trace: fatal: can't have side affects inside a function
    at setter (file:///C:/Users/karlp/auto/docs/devlog/008.js:35:34)
    at Object.set (file:///C:/Users/karlp/auto/docs/devlog/008.js:53:27)
    at Object.set [as data] (file:///C:/Users/karlp/auto/docs/devlog/008.js:74:28)
    at Object.update (file:///C:/Users/karlp/auto/docs/devlog/008.js:85:29)
    at Object.update (file:///C:/Users/karlp/auto/docs/devlog/008.js:64:87)
    at update (file:///C:/Users/karlp/auto/docs/devlog/008.js:14:27)
    at getter (file:///C:/Users/karlp/auto/docs/devlog/008.js:24:27)
    at Object.get (file:///C:/Users/karlp/auto/docs/devlog/008.js:52:24)
    at Object.get [as update] (file:///C:/Users/karlp/auto/docs/devlog/008.js:71:35)
    at file:///C:/Users/karlp/auto/docs/devlog/008.js:88:3

c:\Users\karlp\auto\docs\devlog>
```

why is the stack trace so big?
seems to work though.
but it might be cleaner to have
two atom types: one for values
and another for functions (didn't we have this debate before?)

## 009.js

let's try a new wrapper loop:

```js
Object.keys(obj).forEach(name => {

    if (typeof obj[name] == 'function') add_fn(res, obj, name);
    else add_val(res, obj, name);
});
```

(i'm renaming `object` to `obj` for some reason. also using `name`
instead of `key` because it's the same thing!).
now we define each method separately:

```js
let add_fn = (res, obj, name) => 
{
    fs[name] = fn;
    dirty[name] = true;

    Object.defineProperty(res, key, {
        configurable: true,
        enumerable: true,
        get() {
            return getter(name)
        },
    });
}

let add_val = (res, obj, name) => {

    Object.defineProperty(res, name, {
        configurable: true,
        enumerable: true,
        get() {
            return getter(name)
        },
        set(value) {
            return setter(name, value)
        }
    });
}
```

hmmm could be even simpler (not sure the previous will work though...)

```js
Object.keys(obj).forEach(name => {

    if (typeof obj[name] == 'function')
    {
        fs[name] = fn;
        dirty[name] = true;

        Object.defineProperty(res, key, {
            configurable: true,
            enumerable: true,
            get() {
                return getter(name)
            },
        });
    }    
    else
    {
        Object.defineProperty(res, name, {
            configurable: true,
            enumerable: true,
            get() {
                return getter(name)
            },
            set(value) {
                return setter(name, value)
            }
        });
    }

});
```

now we can remove `atom` completely.
also `setter` is a bit simpler:

```js
let setter = (name, val) => {

    if (running) console.trace("fatal: can't have side affects inside a function")
    else {
        value[name] = val;
        Object.keys(deps).forEach(n => dirty[n] = true)
    }
}
```

down to 73 lines, but does it work?

```
c:\Users\karlp\auto\docs\devlog>deno run 009.js
Trace: fatal: can't have side affects inside a function
    at setter (file:///C:/Users/karlp/auto/docs/devlog/009.js:32:30)
    at Object.set [as data] (file:///C:/Users/karlp/auto/docs/devlog/009.js:68:28)
    at Object.update (file:///C:/Users/karlp/auto/docs/devlog/009.js:80:29)
    at Object.fs.<computed> [as update] (file:///C:/Users/karlp/auto/docs/devlog/009.js:48:39)
    at update (file:///C:/Users/karlp/auto/docs/devlog/009.js:14:27)
    at getter (file:///C:/Users/karlp/auto/docs/devlog/009.js:24:27)
    at Object.get [as update] (file:///C:/Users/karlp/auto/docs/devlog/009.js:55:28)
    at file:///C:/Users/karlp/auto/docs/devlog/009.js:83:3
```

seems so. what about the old test?

```js
let $ = auto({
    data: null,
    count: ($) => $.data ? $.data.length : 0,
    msg: ($) => $.data + " has " + $.count + " items",
})

$.data = [1,2,3];
console.log("msg =",$.msg);
```

```
c:\Users\karlp\auto\docs\devlog>deno run 009.js
msg = 1,2,3 has 3 items
```

looks good.

i've also change it so that the functions run update
immediately (can't remember why i thought lazy was
a good idea)

```js
if (typeof obj[name] == 'function')
{
    fs[name] = () => obj[name](res);
    update(name);
    // ...
```

i also changed `update` to not return a value
and just set `value` directly

```js
let update = (name) => {

    deps[name] = [];
    running = name;
    value[name] = fs[name]();
    running = undefined;
}
```

this is actually cleaner. (`update` had a
small change too because of this:
no need to record a return value).

hmmm, much cleaner wrapping now:

```js
Object.keys(obj).forEach(name => {

    let _get = () => getter(name)
    let _set = (v) => setter(name, v)

    let prop;

    if (typeof obj[name] == 'function')
    {
        fs[name] = () => obj[name](res);
        update(name);
        prop = { get: _get }
    }    
    else 
        prop = { get: _get, set: _set }

    Object.defineProperty(res, name, prop);

});
```

took out `configurable: true` and `enumerable: true`.
can't figure if we need it - it still works!

64 lines!

hmmm, just realised we don't use `$` anymore so now

```js
const res = {
    _: { deps, dirty, value }, // so we can see from the outside what's going on
};
```

weird.

## 010.js

ok time for _subscribe_. perfect place to put it
is at the end of the wrapping. but first

```js
const res = {
    _: { deps, dirty, value }, // so we can see from the outside what's going on
    '#': {}
};
```

i like a hash so then we can say

```js
$['#'].data.subscribe( (v) => console.log("data =",v) )
```

doesn't look too bad. so now for each `name` we need to define
a subscribe function.

```js
Object.keys(obj).forEach(name => {

    // existing code here

    res['#'][name] = {}
    res['#'][name].subscribe = (fn) => {

        // ???

    };
})
```

so we need a tag for the subscribe
so we can see what's happening in the vars...
something like `sub_data_001` or maybe
`#data001` since you'll be use to seeing the hash
character. getting the number will be tricky,
a random variable will be easier... though
using incremental numbers will making them
deterministic and thus repeatable...

we have to loop through all the existing names.
if they start with `#myvarname` then increment.
not so hard after all.

```js
// existing code here

let i = 0;
Object.keys(fn).forEach( f => if( f.substring(0,name.length+1) == '#'+name ) i += 1 )
let tag = "#" + name + i.toString().padStart(3, "0"); // e.g. #data012
```

ok now what? we have a tag with a hash. however no need
to set any properties on the return object.
i guess we just save the function out?

```js
fs[tag] = () => obj[tag](res); // save function
update(tag);                    // calc value
```

hmmm no, that's not what this is.
we don't want to run this function
whenever a dependent variable changes...
we want to run it if just _one_ variable
changes...

hmmm no wait

```js
fs[tag] = () => fn(res[name])
```

ok that's it. we use the function they
gave us and pass in the current wrapper
value (which will call the respective getter).

that should be it

```js

Object.keys(obj).forEach(name => {

    let _get = () => getter(name)
    let _set = (v) => setter(name, v)

    let prop;

    if (typeof obj[name] == 'function')
    {
        fs[name] = () => obj[name](res); // save function
        update(name);                    // calc value
        prop = { get: _get }             // what props to set on return object i.e. a getter
    }    
    else 
        prop = { get: _get, set: _set }  // just set the return props i.e. getter + setter

    Object.defineProperty(res, name, prop);

    // create subscribe method

    res['#'][name] = {}
    res['#'][name].subscribe = (fn) => {

        let i = 0;
        Object.keys(fn).forEach( f => if( f.substring(0,name.length+1) == '#'+name ) i += 1 )
        let tag = "#" + name + i.toString().padStart(3, "0"); // e.g. #data012

        fs[tag] = () => fn(res[name])
    };
});
```

two things left to do, though: return an unsubscribe
function (svelte needs this) and don't save values
out if we have a hash (else the `value` object will
be confusing to look at). but first let's test this.

```js
let $ = auto({
    data: null,
    count: ($) => $.data ? $.data.length : 0,
    msg: ($) => $.data + " has " + $.count + " items",
})

$['#'].msg.subscribe( (v) => console.log("msg =",v) )

$.data = [1,2,3];
```

hmmm lots of rewrites to get it to work as expected:

```
c:\Users\karlp\auto\docs\devlog>deno run 010.js
msg = undefined has 0 items
msg = 1,2,3 has 3 items
```

the rule is - run subscribes immediately. so we get
`undefined` and `0` first which is right.
then when we set `data` is runs again correctly.

i had to change the function save as

```js
fs[tag] = () => fn(getter(name))
update(tag)
```

i also had to revert the setter to the old version,
strangely

```js
if (running) console.trace("fatal: can't have side affects inside a function")
else {
    value[name] = val;
    Object.keys(deps).forEach(n => {
        if (n[0]=='#') update(n);
        else dirty[n] = true
    })
}
```

how does the state look?

```js
console.log($._)
```

```js
{
    deps: { count: [ "data", "data" ], msg: [ "data", "count" ], "#msg000": [ "msg" ] },
    dirty: {},
    value: { count: 3, msg: "1,2,3 has 3 items", "#msg000": undefined, data: [ 1, 2, 3 ] }
}
```

ok, right: so now we save out a value for `#msg000` which makes no
sense. we do need to keep it in `deps` though even though it's
a little obvious...

still need to fix that double `data` for `count` `deps`...

## unsubscribe

subscribe was actually quite easy:

```js
// return unsubscribe method
return () => {
    delete(fn[tag])
    delete(value[tag])
    delete(deps[tag])
}
```

```js
let $ = auto({
    data: null,
    count: ($) => $.data ? $.data.length : 0,
    msg: ($) => $.data + " has " + $.count + " items",
})

let unsub = $['#'].msg.subscribe( (v) => console.log("msg =",v) )

$.data = [1,2,3];

console.log($._)

console.log("running unsub");

unsub();

console.log($._);
```

```
c:\Users\karlp\auto\docs\devlog>node 010.js
msg = undefined has 0 items
msg = 1,2,3 has 3 items
{
  fn: { count: [Function], msg: [Function], '#msg000': [Function] },
  deps: {
    count: [ 'data', 'data' ],
    msg: [ 'data', 'count' ],
    '#msg000': [ 'msg' ]
  },
  dirty: {},
  value: {
    count: 3,
    msg: '1,2,3 has 3 items',
    '#msg000': undefined,
    data: [ 1, 2, 3 ]
  }
}
running unsub
{
  fn: { count: [Function], msg: [Function] },
  deps: { count: [ 'data', 'data' ], msg: [ 'data', 'count' ] },
  dirty: {},
  value: { count: 3, msg: '1,2,3 has 3 items', data: [ 1, 2, 3 ] }
}
```

works great (note i added `fn` to `_` temporarily so we
can see it being removed. should we keep it there?)

(also note i renamed `fs` to `fn`).

since everything is just these flat structures
you just remove any mention of `tag` e.g. `#msg000`
and you're done. the only other possibility
is that it's in `dirty` (subscribe's should
never show up there - `dirty` is only ever set
in `setter` and we run `update` instead) or
that `#msg000` or whatever is referred to
by another member in `deps`. but that would only
occur if another member tried to get `$['#msg000']`
e.g.

```js
let $ = auto({
    msg: null,
    thingy: ($) => console.log($['#msg000'])
})

$['#'].msg.subscribe( (v) => console.log("msg =",v) )
```

though that should fail because we would check
for the existence of `#msg000` initially?

```
c:\Users\karlp\auto\docs\devlog>node 010.js
undefined
msg = undefined
{
  fn: { thingy: [Function], '#msg000': [Function] },
  deps: { thingy: [], '#msg000': [ 'msg' ] },
  dirty: {},
  value: { thingy: undefined, '#msg000': undefined }
}
```

i don't know if it's worth worrying about...

## rolling

one real issue i've realised is the way i calculate
the tag i.e. `#msg000` - i can't assume `i` is equal
to the number of values. what happens if we have this:

```js
fn = {
    '#msg000': [Function],
    '#msg001': [Function],
    '#msg003': [Function]
}
```

our current code basically counts how many functions
are defined that start with `#msg` and it will get `3`
i.e. a tag of `#msg003` which will overwrite the
existing one. because of how unsub works we can
definitely have holes like this.

one possibility is just to parse the numbers `XXX`
and just get the highest + 1. but that won't work,
too - what if you have a lot of subscribe/unsubscribes
for some really dynamic objects. you could reach 1000
easily.

the best idea really is to loop through `#msg` values,
parse the number and then track what the previous value
was. if we detect a gap, put the value into that gap.
this assumes everything is saved in order which is
should be since we're saving it out (though i'm not
100% of how a javascript object, essentially a map, can have
order in its keys).

```js
let get_tag_gap = (name) => {

    let lastval = -1;                                                           // last parsed value
    Object.keys(fn).forEach( _name => {                                         // loop through existing function names
        
        if( _name.substring(0,name.length+1) == '#'+name )                      // if the function name starts with #name
        {
            let val = parseInt(_name.substr(_name.length-3));                   // parse last 3 characters
            if (val-lastval>1)                                                  // found a gap
                return "#" + name + (lastval+1).toString().padStart(3, "0");    // e.g. #data012
        }
    })

    console.trace("fatal: ran out of subscribe names for",name)
}
```

hmm what a mess of code. let's see if it works.

hmm, nope. after some retries i got this:

```js
let get_tag_gap = (name) => {

    let lastval = -1;                                                           
    for (var _name of Object.keys(fn).filter(n => n.substring(0,name.length+1) == '#'+name ))
    {   
        let val = parseInt(_name.substr(_name.length-3));                   // parse last 3 characters
        if (val-lastval>1) break                                            // found a gap
        lastval = val
    }

    if (lastval == 999) console.trace("fatal: ran out of subscribe names for",name)

    return '#' + name + (lastval+1).toString().padStart(3, "0"); // e.g. #msg012
}
```

could still be cleaner.
and now:

```js
let $ = auto({ msg: null })

let unsub_one = $['#'].msg.subscribe()
let unsub_two = $['#'].msg.subscribe()
let unsub_thr = $['#'].msg.subscribe()

console.log($._)
```

```js
{
  fn: {
    '#msg000': [Function],
    '#msg001': [Function],
    '#msg002': [Function]
  },
  deps: { '#msg000': [ 'msg' ], '#msg001': [ 'msg' ], '#msg002': [ 'msg' ] },
  dirty: {},
  value: { '#msg000': undefined, '#msg001': undefined, '#msg002': undefined }
}
```

which looks right. except we shouldn't have `dirty` values for subscribes...

what about the gap issue?

```js
unsub_two();
let another_unsub = $['#'].msg.subscribe( () => {} )
console.log($._)
```

```js
{
  fn: {
    '#msg000': [Function],
    '#msg002': [Function],
    '#msg001': [Function]
  },
  deps: { '#msg000': [ 'msg' ], '#msg002': [ 'msg' ], '#msg001': [ 'msg' ] },
  dirty: {},
  value: { '#msg000': undefined, '#msg002': undefined, '#msg001': undefined }
}
```

hmm it works but now the order is screwed up!
should we return where to insert it into `fn`?
we will have to if we want our code to work.

another thing we could do is ... loop from `0` to `999`
and just check if that value is inside of `fn` or not...
will make the code much cleaner but then each subscribe
could potentially have `1000` things to do...

how about going back to a random number? could create
clashes...

we're going to have a bunch of these things appearing...

ok this works fine:

```js
let get_sub_tag = (name) => {

    let num = 0;
    let tag = () => '#' + name + num.toString().padStart(3, "0"); // e.g. #msg012
    while( tag() in fn ) num += 1; // search for gap
    return tag();
}
```

does the same as before but not reliant on parsing
or checking the last value. much simpler.

also i think it's worth leaving `fn` in `_`
because you want to see what the subscribes
are.

## subscriber values

why are the subscribers showing up in `value`?
it's because we set `value` in `update()`

```js
let update = (name) => {

    deps[name] = [];
    running = name;
    value[name] = fn[name]();
    running = undefined;
}
```

we should return the value as before.

```js
let update = (name) => {

    deps[name] = [];
    running = name;
    let val = fn[name]();
    running = undefined;
    return val;
}
```

and then let each usage decide if it should
save the result out. there are four uses:

 - `getter`: save
 - `setter`: dont
 - fn init in the wrapper: save
 - `subscribe`: dont

 working well.

 ```js
 {
  fn: {
    '#msg000': [Function],
    '#msg002': [Function],
    '#msg001': [Function]
  },
  deps: { '#msg000': [ 'msg' ], '#msg002': [ 'msg' ], '#msg001': [ 'msg' ] },
  dirty: {},
  value: {}
}
```

the subscribe method is really screwing me up: 20 lines of
code i.e. `20%` of the whole thing. why do we really need
it (except to work with Svelte) ? really the whole functionality
can be done with what we have already:

```js
let $ = auto({
    msg: null,
    sub: ($) => {
        $.msg; // access var to signal dependency
        console.log("this will run whenever msg changes");
    }
})
```

why all this fuss? we just need to ignore the return
value of `sub` just for our own clarity,
though we can do that with a simple naming convention
as we did before with

```js
let $ = auto({
    msg: null,
    '#sub': ($) => { /* ... */ }
})
```

i suppose our big issue is:

 - we want to have multiple subscribes
 - we want to do it _outside_ of the wrap i.e. programmatically and at any stage

anyway. it's not so bad. it's mostly coming up with a name...
let's leave it for now.

### 011.js circle detection

one big thing still todo is check whether
you are going in circles:

```js
let $ = auto({
    tick: ($) => $.tock,
    tock: ($) => $.tick
})
```

which will end the universe.

i think it should be easy to fix.
we need to introduce a new internal variable: `stack`.
this will track the current execution stack
of functions (which could be useful in debugging):

```js
stack: [ 'msg', 'count' [
```

all we need do is push/pop onto it when
we run `update` (which i think should be
renamed to `run` since that's what it's going:
running `name`)

```js
let run = (name) => {

    if (stack.indexOf(name) !== -1) console.trace("fatal: stack loop",stack,",",name);
    
    deps[name] = [];
    running = name;
    stack.push(name); let val = fn[name](); stack.pop();
    running = undefined;
    return val;
}
```

what happens when we run our loop? hmm, nothing. weird.

might be worth having some kind of configuration or
convention to ... trace out exactly what happens.
maybe an execution trace variable? or just a config
you pass in to `auto`... going to have to be like
that if you want global settings...

```js
let $ = auto({
    tick: ($) => $.tock,
    tock: ($) => $.tick
}, {
    trace: true
})
```

not as clean as i would hope... can't think of a better way.

to do this we say:

```js
let auto = (obj, conf) => {

    let trace = conf.trace || false;
    
    // ...
```

these debugging options are going to mess up my code!

```js
let run = (name) => {

    if (c.trace) console.log("[" + name + "]")
    
    // ...
```

hmmm. is that really going to be useful?
why not just print out `$._` ?

```js
{
  fn: { tick: [Function], tock: [Function] },
  deps: { tick: [], tock: [ 'tick' ] },
  dirty: {},
  value: { tick: undefined, tock: undefined }
}
```

yup - see it's much better to see the _data_
that to print out an occurance. i'm going to
scrap the config idea for now (isn't `$_` gonna
show you all you need?)

so on first run `tick` doesn't see any dependencies
because ... i dunno? i get that it's first
and `tock` wasn't defined ... but then why don't
we get an undefined error? i suppose because
`$.tock` does have a value it's `undefined`.
would be nice if our object was smart enough
to tell this - can we do that? have a generic
getter that says "does this exist? hmmm".

but on top of that - we should do the wrap
in two stages - one just runs through and
notes all the members we have (and their types).
and only on the second run through we go
through the functions and mark out all the
dependencies.

hmmm, no - it's called _computed property names_
and it only works on creating an object. you
can't have a generic getter than operates
differently for a different name... (though
that could be cool). one option, though,
is to replace `$` with a function like
in jQuery i.e. `$('count')` but i dunno
that looks weird. maybe i'm being too sensitive -
if it has a good design reason might be
worth looking into.

## circles some more

so i took the run for the functions outside
the wrapper, i.e. just before we return
`res` i say:

```js
Object.keys(obj).forEach(name => {
    value[name] = run(name);
})
```

and now when we print out the state
we get

```js
{
  fn: { tick: [Function], tock: [Function] },
  deps: { tick: [ 'tock' ], tock: [ 'tick' ] },
  dirty: {},
  value: { tick: undefined, tock: undefined }
}
```

which is right, but why didn't it freeze when
the functions ran?

ok putting back in the trace config:

```js
let $ = auto({
    tick: ($) => $.tock,
    tock: ($) => $.tick
}, {
    trace: true
})
```

we get

```js
c:\Users\karlp\auto\docs\devlog>node "011 - circle detection.js"
[tick]
[tock]
{
  fn: { tick: [Function], tock: [Function] },
  deps: { tick: [ 'tock' ], tock: [ 'tick' ] },
  dirty: {},
  value: { tick: undefined, tock: undefined }
}
```

hmmm ... why did running `tock` not then run `tick` ?

oh, it's because `tick` is not dirty! have i somehow
made ... circle issues impossible? i know svelte uses
the idea of `dirty` (i stole the word from looking
at the source they generate... trying desperately to
figure out what is happening with my reactive statements)
and it tells you when things are circular... but
have i implemented things differently, i.e. in such
a way that it can't happen?

what is a _circle_ ? i think perhaps it can only happen
when using **lazy** evaluation (but then why does svelte
use the term `dirty` ?).

ok, so what do we know:

 - when you `run` a function it's `dirty` is **unset**

> this means when you try to `get` it subsequently it won't `run` anymore, i.e. just return the cached `value`

however! surely when you run a function any dependents based on it need
to be made dirty? the presumption being that whenever you `run` something
it has changed.

hmmm, i'm starting to think there is a fundamental issue with the code:
that i only mark things as dirty when you set a value...
in fact the only line that has `dirty[name] = true` is inside
of `setter` which cannot be called on a function!

if that is true then this shouldn't work:

```js
let $ = auto({
    data: null,
    count: ($) => $.data ? $.data.length : 0,
    msg: ($) => "got " + $.count + " items"
})
```

since `msg` depends only on `count`. so when
i update `data` `msg` won't update...

```js
$.data = [1,2,3];
console.log("msg =",$.msg)
```

```js
c:\Users\karlp\auto\docs\devlog>node "011 - circle detection.js"
msg = got 3 items
```

nope. because `count` does update - it gets set to
dirty when `data` is set. and then when you try
get `msg` it runs, which then gets `count` which
is dirty so it recalculates!

i don't get it. why are circular dependencies a thing?

it makes sense that with **auto**'s design you _can't_
have any kind of infinite loop: there are only two
ways to interact with an **auto** wrap - `get` a value
or `set` a value. that's it. when you set a value
nothing happens! i.e. nothing runs.

```js
let setter = (name, val) => {

    if (running) console.trace("fatal: can't have side affects inside a function")
    else {
        value[name] = val;
        Object.keys(deps).forEach(n => {
            if (n[0]=='#') run(n);
            else dirty[n] = true
        })
    }
}
```

ok, firstly - you cannot set a function. so when you `set`
anything with **auto** it's always a value!

```js
$.totals = 10
```

secondly - _all_ that happens is the dependencies are set to
dirty: only if the dependency starts with `#` i.e. it's a subscribe
function is it run. and subscribe functions by definition don't touch
the state...

hmmm well actually what if you accessed the global `$` from inside
your subscribe function, you could totally lock things up... hmmm ...
though will the first line of `setter` catch that?

```js
let $ = auto({
    data: null
})

$['#'].data.subscribe( (v) => $.data = [1,2,3] )
```

```
c:\Users\karlp\auto\docs\devlog>node "011 - circle detection.js"
Trace: fatal: can't have side affects inside a function
```

woohoo!

anyway, so the point i was making is that `setter` doesn't
trigger any function runs (i should come up with names
to differentiate between the two **auto** function types:
those that connect to a wrap member and those that
just run and don't affect values i.e. start with `#`).

ok so what does that mean? it means that setting a
wrap value (could use a better name for this too - **auto**
object? i guess _wrap_ is ok...) will never lock up. what
about `getter` ?

same thing - even though `getter` _does_ run functions,
no function can be run more than once:

```js
let getter = (name) => {

    if (running) deps[running].push(name);
    if (fn[name] && dirty[name])
    {
        value[name] = run(name);
        delete(dirty[name]);
    }
    return value[name];
}
```

so `run` only occurs when a member (value or function)
is dirty, but then it's dirtiness is _unset_. and setting
something as dirty only happens in `setter`. and since
`setter` can only ever be called from outside a function
(remember the first line of `setter` - checks if a function
is currently running) any `getter` call will only ever
run a function once. **auto** is lock-proof! (i should
mention this in the hero page).

this is very cool and all but i still don't get it.
i'm convinced i'm right but ... how does this work again?
if `tick` depends on `tock` and `tock` depends on `tick`,
and i don't have locks, what do the values i get mean?
i need to carefully think about what the `dirty`
architecture means ... perhaps i should start by using
a better word than `dirty`. `dependencies-have-changed` ?

again, isn't it weird that when you `run` a function we
don't go through it's dependents and say "hey, this function
has updated it's values. so you must have changed too". ?

no (and i have covered this already but this is difficult
stuff) - again, there is only one place in the code where
`dirty` is set to true: in `setter`. and `setter` will only
run on values i.e. not functions. so this is how `dirty` works:

 1. set some value with `$.val = something`
 2. loop through `val`'s dependents
 3. umm....

ok i just saw this now (again):

```js
Object.keys(deps).forEach(n => {
    if (n[0]=='#') run(n);
    else dirty[n] = true
})
```

i just set everything to dirty! ha. oops. hmmm.

## 012_optimize_dirty.js

yeah so ok. what should happen?

 - i should recursively (aarrg) find all things that depend on `val` and set them to dirty

what kind of test would confirm this is happening properly?

```js
let $ = auto({
    a: null,
    b: null,
    deps_on_a: ($) => $.a,
    deps_on_b: ($) => $.b,
    deps_on_a_and_b: ($) => { $.a; $.b; return null }
})
```

what i want is a tree of dependencies, and then to set
one of the values and check the dirty ...

```js
$.a = 'set';
assert_equal($._.dirty, {
    deps_on_a: true,
    deps_on_a_and_b: true
})
```

though that's not nested enough... what do we get?

```
c:\Users\karlp\auto\docs\devlog>node 012_optimize_dirty.js
{ deps_on_a: true, deps_on_b: true, deps_on_a_and_b: true }
```

ok so as i mentioned - right now everything is set to dirty
(i didn't do an assert, just `console.log($._.dirty`). let's
fix it with a function (that we can try call recursively):

```js
let dirty_deps(name) => {
 // ...
}
```

still don't like the name but it's short and to the point.

ok, firstly we can't just loop through the `deps` as we were
before: `deps` lists the dependencies of a function - it's
the wrong way round. instead we need to loop through recursively
checking if our `name` appears - set to dirty, and recurse.

```js
let dirty_deps(name) => {

    Object.keys(deps).forEach(n => {

        if (!dirty[n] && deps[n].indexOf(name) !== -1 )
        {
            dirty[n] = true;
            (n[0]=='#') run(n);
            dirty_deps(n); // since it's dependency is dirty it must be too!
        }
    })
}
```

```
c:\Users\karlp\auto\docs\devlog>node 012_optimize_dirty.js
{ deps_on_a: true, deps_on_a_and_b: true }
```

woohoo!. so what about a more nested dependency tree...

```js
let $ = auto({
    a: null,
    b: null,
    c: ($) => $.a,
    d: ($) => $.c,
    e: ($) => $.b
})

$.a = 'set';
console.log($._.dirty)
```

```
c:\Users\karlp\auto\docs\devlog>node 012_optimize_dirty.js
{ c: true, d: true }
```

that's right. ... are we good? i'm happy. guess we can remove
the circular code ... and the configs / stack trace. i should
also write these tests out in `tests/` ... 101 lines...

## 013_fatal_internal.js

i want to add one more internal variable: `fatal`.

```js
let running;
let deps = {};
let dirty = {};
let fn = {};
let value = {};
let fatal;
```

all it stores is a message: a fatal error that occured.
the reason is so that i can have automated tests
which check that any error cases did in fact occur.

so with the tests i want to write each of them
in three sections:

 1. the `obj` to wrap in auto
 2. the code to run
 3. what `$._` will be

it's cleaner. and with `fatal` inside of `$._` i can
check for errors ... though i see right now i
only have one error case: when you try use `setter`
inside of a function, hmmm... though that is an
important thing to check for.

first i need a function that both sets this variable
and gives a stack trace:

```js
let error = (msg) => { fatal = msg; console.trace("fatal:",msg); }
```

don't like how i have two names now: `fatal` and `error`...
let's use `fail` instead of `error`.

ok, so let's see what the test might look like. let's call it
`003_side_affects.js`

```js
module.exports = {
    obj: {
        data: null
    },
    fn: ($) => {
        $['#'].data.subscribe( (v) => $.data = [1,2,3] )
    },
    _: {
        fn: [ '#data000' ],
        deps: { '#data000': [ 'data' ] },
        dirty: {},
        value: {},
        fatal: 
    }
}
```

hmmm

```
c:\Users\karlp\auto\docs\devlog>node 013_fatal_internal.js
Trace: fatal: can't have side affects inside a function
    at fail (c:\Users\karlp\auto\docs\devlog\013_fatal_internal.js:11:48)
    at setter (c:\Users\karlp\auto\docs\devlog\013_fatal_internal.js:48:22)
    at Object._set (c:\Users\karlp\auto\docs\devlog\013_fatal_internal.js:63:27)
    at c:\Users\karlp\auto\docs\devlog\013_fatal_internal.js:110:38
    at Object.fn.<computed> [as #data000] (c:\Users\karlp\auto\docs\devlog\013_fatal_internal.js:90:29)
    at run (c:\Users\karlp\auto\docs\devlog\013_fatal_internal.js:17:27)
    at Object.res.#.<computed>.subscribe (c:\Users\karlp\auto\docs\devlog\013_fatal_internal.js:91:13)
    at Object.<anonymous> (c:\Users\karlp\auto\docs\devlog\013_fatal_internal.js:110:13)
    at Module._compile (internal/modules/cjs/loader.js:956:30)
    at Object.Module._extensions..js (internal/modules/cjs/loader.js:973:10)
{
  fn: { '#data000': [Function] },
  deps: { '#data000': [ 'data' ] },
  dirty: {},
  value: {},
  fatal: undefined
}
```

(i just put this at the end of `013_fatal_internal.js`)

```js
let $ = auto({
    data: null
})

$['#'].data.subscribe( (v) => $.data = [1,2,3] )

console.log($._)
```

still don't like how long the trace is. also - how will i suppress it during testing?

`fatal` shows up as undefined even though i did put it into `_`. and this is because...
it's not an object! i.e. returning `fatal` does not return a reference.

ok so i've moved `res` to the top just below the internals decl.

```js
const res = {                                   // return object
    _: { running, fn, deps, dirty, value },     // so we can see from the outside what's going on
    '#': {}                                     // subscribe methods for each member
};
```

so now i can set `_.fatal` directly in my fail function:

```js
let fail = (msg) => { res._.fatal = msg; console.trace("fatal:",msg); }
```

not great. it's not as clean as before. but now i get:

```
{
  running: undefined,
  fn: { '#data000': [Function] },
  deps: { '#data000': [ 'data' ] },
  dirty: {},
  value: {},
  fatal: "can't have side affects inside a function"
}
```

which is brilliant: i have a complete test of (nearly) all the
internals.

## revisiting tests

so what does the test code look like now?

```js
let check = (name, test) => {
    let $ = auto(test.obj);
    test.fn($);
    if (assert_same(name, test._, $._)) console.log(name+": passed")
}
```

pretty easy. i need to make sure that checking `fn` is modified:
we don't need to specify the function - they should all
be functions. i think it's fine just to check that the
right names are in there i.e. just make it an array.
i think? or will saying `fn: { '#data000': [Function] }`
work?

## 014_back_to_stack.js

ok so even though we don't get infinite loops
we still can't allow circular references:

```js
let $ = auto({
    a: null,
    b: ($) => $.a + $.c,
    c: ($) => $.a + $.b
})
```

what should we get if we set `a` to, say, `1` ?

```js
$.a = 1
```

i mean, what does `b` equal? let's see what we get
after printing `$._`

```js
{
  running: undefined,
  fn: { b: [Function], c: [Function] },
  deps: { b: [ 'a', 'c' ], c: [ 'a', 'b' ] },
  dirty: { b: true, c: true },
  value: { b: NaN, c: NaN, a: 1 }
}
```

that's about right. what could possibly be the use
to get nan values ... so let's put back the circle
detection.

```js
// ...
let stack = [];
// ...
let run = (name) => {

    if (stack.indexOf(name) !== -1) fail("circular reference");
    // ...
    stack.push(name); let val = fn[name](); stack.pop();
    // ...
```

```js
{
  running: undefined,
  fn: { b: [Function], c: [Function] },
  deps: { b: [ 'a', 'c' ], c: [ 'a', 'b' ] },
  dirty: { b: true, c: true },
  value: { b: NaN, c: NaN, a: 1 },
  stack: []
}
```

hmmm why isn't it detecting the circle?

struggling to figure this out:

1. we set `a`
2. we loop through `a`'s dependents
3. for each one, loop through _their_ dependents

so what will happen in the above case?

1. we set `a`
2. we loop through _all_ the dependents first i.e. `b` and `c`
3. so we are on `b`: loop through what it depends on
4. `b` is a function - add to stack, so `stack = ['b']`
5. the first dependent of `b` is `a`. `a` is dirty already - ignore
6. the next dependent is `c`. it's not dirty so we recurse.
   but first since it's a function we add it to the stack so `stack = ['b','c']`
   note the stack is backwards i.e. `b <- c` i.e. "`b` depends on `c`"
7. we are recursing through `c` now. but note: we don't add it to the stack immediately:
   so we only add to the stack when we loop through dependencies...
8. the first dependent is `a`. dirty. nevermind
9. the next dependent is `b` it's dirty but it's a function...
   so we should check first if a dependent is a function.
   does it matter that it's not dirty?

i've decided to use the word `stale` instead.

```js
let set_stale = (name, stack) => {

    Object.keys(deps).forEach(n => {

        if (deps[n].indexOf(name) !== -1)
        {
            // ok, we have found 'name' as a dependent of something i.e. of 'n'
            // (wish this could be simpler...)

            if (fn[n]) // so n is a function which depends on n
            {
                if (stack.indexOf(n) !== -1)
                {
                    let msg = ''; stack.forEach(s => msg += s + ' -> '); msg += n; // a -> b -> c
                    console.log(msg);
                    return;
                }
                stack.push(n);
            }

            if (!stale[n] && deps[n].indexOf(name) !== -1 )
            {
                stale[n] = true;
                if (n[0]=='#') run(n);
                set_stale(n,stack); // since it's dependency is dirty it must be too!
            }

            if (fn[n]) stack.pop();
        }
    })
}
```

```
b -> c -> b
{
  running: undefined,
  fn: { b: [Function], c: [Function] },
  deps: { b: [ 'a', 'c' ], c: [ 'a', 'b' ] },
  stale: { b: true, c: true },
  value: { b: NaN, c: NaN, a: 1 }
}
```

woohoo! though it should print things out backwards...

```js
if (stack.indexOf(n) !== -1)
{
    let msg = n; while (stack.length>0) msg += ' -> ' + stack.pop(); // a -> b -> c
    console.log(msg);
    return;
}
```

## 015_no_console_log.js

instead of logging out to the console when something
goes wrong i.e. a fatal error, i'm going to put say
if you specify a special function which should run
when a fatal error happens

```js
let $ = auto({
    // ...
    '#': ($) => console.log("fatal:",$._.fatal)
})
```

bit weird using just `#` but it's already used
to specify that a function doesn't write out
a variable... maybe i should call it `#fatal` ?

```js
let fail = (msg) => { res._.fatal = msg; if (fn['#fatal']) fn['#fatal'](res); }
```

```js
if (stack.indexOf(n) !== -1)
{
    let msg = n; while (stack.length>0) msg += ' -> ' + stack.pop(); // a -> b -> c
    fail("circular dependency",msg);
    return;
}
```

```js
let $ = auto({
    a: null,
    b: ($) => $.a + $.c,
    c: ($) => $.a + $.b,
    '#fatal': ($) => console.log('fatal:',$._.fatal)
})

$.a = 1;
```

```
c:\Users\karlp\auto\docs\devlog>node 014_back_to_stack.js
fatal: circular dependency b -> c -> b
```

maybe i could use `#` functions to do something every time
any internal variable changes ...

## setters don't run functions

busy with tests. check out `007_value_set_with_dependent_function.js`

```js
module.exports = {
    obj: {
        data: null,
        count: ($) => $.data ? $.data.length : 0 
    },
    fn: ($) => {
        $.data = [1,2,3];
    },
    _: {
        deps: { count: ['data'] },
        stale: { count: true },
        value: { data: [1,2,3], count: 0 }
    }
}
```

even though we set `data` `count` is not updated.

perhaps this is a good principle to keep in mind:
**setting sets stale**. also worth noting: setting
is only done on _values_. so set:

 1. saves to `value`
 2. sets `stale`

hmm but check this out: we know only function
values can be stale. so really the same result
to setting stale is just __removing the function
key from value__ !.

so we have two options:

a. instead of checking `stale` everywhere we just check if the function key is in `value`
b. functions have their own `value`-like structure...

supoose it's cleaner just to have one `value` object? though is that
confusing?

it's also weird you won't be able to see from the internal
data which functions need updating ... but if the internal
structure is simpler then that should win out.

## 015_no_stale_structure.js

let's see what it looks like.

`getter` is a bit simpler:

```js
let getter = (name) => {

    if (running) deps[running].push(name);
    if (fn[name] && !value[name]) value[name] = run(name);
    
    return value[name];
}
```

(we just don't have to delete from `stale`).

what about `set_stale` ? what name should we use?
what we are doing is "unsetting dependent function
values"...

the only section we need to change is where `stale`
is mentioned:

```js
if (value[n] && deps[n].indexOf(name) !== -1 )
{
    delete(value[n]);
    if (n[0]=='#') run(n);
    set_stale(n,stack); // since it's dependency is dirty it must be too!
}
```

but also we need to check it so this is inside the
function check (should have been like this before)

```js
if (fn[n]) // so n is a function which depends on n
{
    if (stack.indexOf(n) !== -1)
    {
        let msg = n; while (stack.length>0) msg += ' -> ' + stack.pop(); // a -> b -> c
        fail("circular dependency "+msg);
        return;
    }
    stack.push(n);

    if (value[n] && deps[n].indexOf(name) !== -1 )
    {
        delete(value[n]);
        if (n[0]=='#') run(n);
        set_stale(n,stack); // since it's dependency is dirty it must be too!
    }

    stack.pop();
}
```

## 016_back_to_stale.js

we get infinite loops if we don't have a separate `stale` structure:

```js
let getter = (name) => {

    if (running && deps[running].indexOf(name) == -1) deps[running].push(name);
    if (fn[name] && !value[name]) run(name);

    return value[name];
}
```

so if the function value is not set run the function,
but in `run`...

```js
let run = (name) => {

    deps[name] = [];
    running = name;
    let val = fn[name]();
    if (name[0] != '#') value[name] = val;
    running = undefined;
}
```

run then runs the function _before_ setting `value` !
so you go into the function which calls `getter`
before the value has been set .... so it keeps going.

having a separate `stale` structure means we don't have
to wait for functions to finish in order to know if they
have been made un-stale... but... don't we still need
to wait for it to return?

```js
let getter = (name) => {

    if (running) deps[running].push(name);
    if (fn[name] && stale[name])
    {
        value[name] = run(name);
        delete(stale[name]);
    }
    return value[name];
}
```

so we run `run` ... which runs the function ...
which runs `getter` ... hmmm .... i don't get it.

ok - the reason it doesn't hang is because at first
there is nothing in `stale`! remember `stale` is only
modified by a setter... ok, so having `stale` is making
more and more sense now.

## tests/010_circle_detection.js

one weird thing about this test:

```js
module.exports = {
    obj: {
        tick: ($) => $.tock,
        tock: ($) => $.tick
    },
    fn: ($) => {
        $.tick = 1;
    },
    _: {
        deps: { tick: ['tock'], tock: ['tick'] },
        value: { tick: undefined, tock: undefined },
        stale: {}
    }
}
```

well, firstly: it doesn't work. it should die saying
we have a circle but it doesn't. also - we only detect
circles on `set` hence the need for `$.tick = 1` in `fn`.

ok i figure we should put circle detection in `runner` too...

```js
let run = (name, stack) => {

    stack = stack || [];
    deps[name] = [];
    running = name;
    if (stack.indexOf(name) !== -1)
    {
        circle(stack,name);
        return;
    }
    stack.push(name);
    let val = fn[name]();
    stack.pop(name);
    running = undefined;
    return val;
}
```

i don't like how this is all tied together now: it use to be
that `setter` and `getter` were separate i.e. `setter` was
the only one that set `stale`. however, the issue with that
was we don't see when we have a circle when updating things...

also it's strange both `run` and `setter` each use a separate
stack to detect issues...

## boot order

what should happen on boot, i.e. when you just say `let $ = auto(...)`
and nothing else?

it would be nice to just do nothing - so everything is on-demand,
so to speak. however we need to figure out the initial dependencies
first; otherwise how would you know what to do when a value is set?

so that is the reason for looping through and saying `run` on all
the functions:

```js
Object.keys(fn).forEach(name => { if (name[0]!='#') value[name] = run(name); })
```

why are we leaving out functions that start with `#`? they have relationships
too. they just don't write to `value`.

what if there's an error? what if the first `run` generates a fatal - 
should we stop running the rest? in fact, what should `fatal` do?
should we just shut everything down?

 - we could put a check for `fatal` at the start of `getter` and `setter`.
   it makes sense since `fatal` essentially means undefined behavior.

however, would you want things to keep working even if there's a fatal error?
perhaps it's easiest for now just to shut it all down and we can revisit that.

### 017_fatal_shutdown_and_back_to_no_stale.js

ok lets do a full rewrite again - fatal shuts things down,
we no longer use stale
and only `run` checks for circles using a global `stack`
variable.

first thing: rename run to `update` and no return value:

```js
Object.keys(fn).forEach(name => update(name));
```

and update everything. next kill the whole of `set_stale`.
but what do we do in `setter` now?

```js
let setter = (name, val) => {

    if (running) fail("can't have side affects inside a function")
    else {
        value[name] = val;
        set_stale(name);
    }
}
```

don't we just go through the dependencies ... erm... and delete
all the values? so we don't calculate things, hmmm ...

```js
let setter = (name, val) => {

    if (running) fail("can't have side affects inside a function")
    else {
        value[name] = val;
        delete_deps(name);
    }
}
```

```js
let delete_deps = (name) => {

    Object.keys(deps).forEach( key => {

        if (name == key)
        {
            delete(value[key]);
            delete_deps(name);
        }
    })
}
```

seems simple enough.

## setting

so `014_conditional_circle_triggered.js` works

```js
module.exports = {
    obj: {
        data: null,
        a: ($) => $.b,
        b: ($) => $.c,
        c: ($) => $.data ? $.a : 0
    },
    fn: ($) => {
        $.data = true;
        $.a;
    },
    _: {
        deps: { a: [], b: ['c'], c: ['data', 'a'] },
        value: { data: true, a: 0, b: 0, c: 0 },
        fatal: {
            source: 'run',
            msg: 'circular dependency',
            stack: [ 'a', 'b', 'c', 'a' ]
        }
    }
}
```

but what bothers me is `$.a` in `fn` - should we
tell that there is a problem when we say `$.data = true` ?
i guess **auto** is designed as a lazy-evaluator - setting
variables just makes things stale: no function is run...
what are the drawbacks of this?

hmmm, one really cool feature is _batching_ i.e. i don't
need to implement it! it batches automatically. right up
until you try to access a variable... but that is pretty
cool.

and another cool feature, i.e. how this fixes a major issue
i had before, is ordering - i think... i mean i _think_
that by waiting for the user to trigger functions
(by using `getter` essentially) everything should evaluate
in the right sequence? how do i test this? when will things
_not_ evualuate in the right sequence?

## 018_optimized_subs.js

huge rewrite in the previous post. getting things working
in my svelte app. one thing i realised is i can optimize
the sub access greatly:

```js
let run_subs = (name) => {
        
    Object.keys(subs).forEach(tag => { 
        if (tag.length == name.length+4 && tag.substring(0,name.length+1) == '#'+name)
            subs[tag](value[name]); 
    });
}
```

we don't need to use a flat list. right now the subs look like this:

```js
{
    '#data000': [Function],
    '#data001': [Function],
    '#count000': [Function]
}
```

so i loop through _all_ the values and check what matches
the name. i did this before because i have the subs in
with all the other functions. i don't need to do that:
just group them with their dependent values (remember
every sub just one _one_ dependent)

```js
{
    'data': [
        '000': [Function],
        '001': [Function]
    ],
    'count': [
        '000': [Function]
    ]
}
```

and so now the subs code is

```js
let run_subs = (name) => {
        
    if (subs[name]) Object.key(subs[name]).forEach( tag => subs[name][tag](value[name]) )
}
```

simpler and way more efficient. before for every variable
access we looped through and checked it again each sub.

just need to change how we define the `subscribe` method:

```js
res['#'][name].subscribe = (f) => {
    
    let subtag = get_subtag(name);

    if (!subs[name]) subs[name] = {}; // added this
    subs[name][subtag] = (v) => f(v); // now inside [name]
    
    f(value[name]);

    // return unsubscribe method
    return () => { delete(subs[name][subtag]); } // now inside [name]
};
```

oh and the subtag calc is a bit simpler too (no hash or name):

```js
let get_subtag = (name) => {

    let val = 0;
    let tag = () => val.toString().padStart(3, "0"); // e.g. #012
    while( subs[name] && tag() in subs[name] ) val += 1; // increment until not found
    return tag();
}
```

and now this is what `tests/015_subscribe.js` is

```js
module.exports = {
    obj: {
        data: null,
    },
    fn: ($) => {
        $['#'].data.subscribe( () => {} );
    },
    _: {
        fn: [],
        deps: [],
        subs: { data: ['000'] },
        value: { data: null },
        fatal: {}
    }
}
```

## dependency bug

i noticed something with the getter that was wrong

```js
let getter = (name) => {

    if (fatal.msg) return; // do nothing if a fatal error occured

    if (running && deps[running].indexOf(name) === -1) deps[running].push(name);
    if (fn(name)) update(name);
    return value[name];
}
```

so i was running `update` for every function if you try to get it...
which means they all get run all the time forever. so what is the point
of `delete_deps`?

```js
let delete_deps = (name) => {

    Object.keys(deps).forEach( key => {

        if (name == key)
        {
            delete(value[key]);
            delete_deps(name);
        }
    })
}
```

hmmm that's wrong too - it removes the wrong thing!
remember `deps` looks like this:

```js
{
    'count': ['data']
}
```

and the function name is wrong: `delete_deps`
does not delete from `deps`, instead it deletes
from `value`. it clears out all the values
that ... are generated by a function ... whose
dependent has changed.

```js
let clear_touched_values = (name) => {

    Object.keys(deps).forEach( key => { // loop through all the dependencies... ('key' is actually 'function'...)

        deps[key].forEach( sub => { // the dependency thing is an array

            if (name == sub) // ok - so we found a function (key) which is dependent on name
            {
                delete(value[key]); // delete the value for this function ... cause it's no longer correct
                clear_touched_values(key);   // and loop through - since _this_ value has changed, so are any other values (functions) based on it
            }
        })
    })
}
```

and the getter needs to change too.

```js
let getter = (name) => {

    if (fatal.msg) return; // do nothing if a fatal error occured

    if (running && deps[running].indexOf(name) === -1) deps[running].push(name);
    if (!(name in value)) update(name);
    return value[name];
}
```

i feel like this could be a lot clearer:

 - `deps` lists what values a function depends on
 - `value` is a list of values ...
 - `getter` checks `value`. if it's not there, it needs updating

hmmm so what does `setter` do again?

```js
let setter = (name, val) => {

    if (fatal.msg) return; // do nothing if a fatal error occured

    if (running) fail("function "+running+" is trying to change value "+name)
    else {
        if (value[name] !== val)
        {
            value[name] = val;
            clear_touched_values(name);
            run_subs(name);
        }
    }
}
```

ok so all `setter` really does is `clear_touched_values`
(such a bad name).

it's weird that when you run `set` the right values aren't calculated...
is it weird? maybe we should, i dunno, calculate the values on
set? i dunno, that seems like ... well i think that will bring
up the ordering issue again.

## back to subscriptions

so i just implemented a test to ensure that subscriptions fire
(before i was just checking that they were defined ...)
and it turns out they _don't_ fire when you sort of want them to:

```js
module.exports = {
    obj: {
        data: null,
        count: ($) => $.data ? $.data.length : 0
    },
    fn: ($, global) => {
        $['#'].count.subscribe( v => { console.log('setting global'); global.msg = "count is "+v} );
        $.data = [1,2,3];
    },
    _: {
        fn: [ 'count' ],
        deps: { count: ['data'] },
        subs: { count: ['000'] },
        value: { data: [1,2,3] },
        fatal: {}
    },
    global: {
        msg: "count is 3"
    }
}
```

i'm getting `msg: "count is 0"` for the global (see
the todo doc for a rundown on this new check) which
means the subscription only fires once, on boot.
which, really, is part of the design - to only
evaluate things when you get them. settting
things, i.e. `$.data = [1,2,3]` just invalidates
the values (just removes them...). i'm amazed
this all worked in my app ...

what to do? of course, if you subscribe to something
you expect the function to fire if and when the value
has changed. not just if someone happened else happens
to ask for it triggering an update. so... do i just
say we have to update everything on set? is that
going to be a problem? should we just go through and
try to only update values with a subscription?

back to basics: the idea behind auto is to replace
computed values with functions. and these values
use other computed values, meaning you don't have
to worry about doing things in the right order.
they will all evaluate correctly.

one simple fix really is just to do what i was doing
before - with every set we invalidate what we need ...
and then run through every function and execute them
all?

maybe instead i just change `run_subs` to ... recursively go
through any and all values that have changed ...
good lord. i don't like it when things are complicated.
why am i a coder?

ok - let's try instead of saying `run_subs(name)`
in `setter` we just say `run_subs()`

```js
let setter = (name, val) => {

    if (fatal.msg) return; // do nothing if a fatal error occured

    if (running) fail("function "+running+" is trying to change value "+name)
    else {
        if (value[name] !== val)
        {
            value[name] = val;
            delete_deps(name);
            run_subs();
        }
    }
}
```

and then let's change `run_subs` to just run the things
that need running.

## 019_run_affected_subs_in_setter.js

```js
let run_subs = () => {
    // .... ???
}
```

ok what does `subs` look like?

```
subs: { count: ['000'] },
```

so we have keys for each variable ... erm ...

so basically we want to go through each sub,
and if that variable has changed, update the variable
and then run the subsequent subs. doesn't seem to bad, actually.

```js
let run_subs = () => {
    Object.keys(subs).forEach(name => {

        if (!(name in value))
        {
            update(name);
            // ...
        }
    });
}
```

hmmm problem is `run_subs` is inside of `update` ...

one thing i could do is just run all updates for values
that aren't set, i.e. move the updates into `setter`.
any value that is affected gets updated. no longer
lazy... i really don't want to get stuck into different
_ways_ this library can be. it should be as solid as
possible. it should do what one expects, including
only doing the work needed (if you are using it in
ways that aren't specified, like using the internals
yourself ... by that i mean expecting the `value`
field to be up-to-date all the time... then you
didn't read the manual).

i'm putting the updates into `getter` because that's
when you need those values. and of course updates
need to be in `setter` for subscriptions...

ok, the simplest thing (and it's nice because it
simplifies `update` greatly) is to take out
the subscriptions run in `update`

```js
let update = (name) => {   // update a function

    if (fatal.msg) return; // do nothing if a fatal error has occurred

    deps[name] = [];       // reset dependencies for this function
    running = name;        // globally set that we are running
    stack.push(name);

    if (stack.length>1 && stack[0] == stack[stack.length-1]) fail('circular dependency');
    else if (!fatal.msg && name[0]!='#') // any function that starts with '#' is a function that doesn't save a corresponding value
        value[name] = fn[name]();
    
    stack.pop()
    running = undefined;
}
```

wow so much cleaner.

then we put the check inside of the getter to see if something changed
and only then run the subscriptions

```js
let getter = (name) => {

    if (fatal.msg) return; // do nothing if a fatal error occured
    if (running && deps[running].indexOf(name) === -1) deps[running].push(name);

    if (!(name in value))
    {
        let val = value[name]; // save old value
        update(name);
        if (val != value[name]) run_subs(name);
    }

    return value[name];
}
```

overall better. it's worth noting that nothing happens at all
if there is a `value` set for the variable - `getter` doesn't
check if things need updating. that is done by the value deleting 
sweep in `setter`.

## undefined

so the side effect test is working now but a bunch of others
are now failing

```
C:\Users\karlp\auto\tests>node runall.js

latest file is ../docs/devlog/019_run_affected_subs_in_setter.js
copying to auto.js files

001_empty: passed
002_just_one_value: passed
003_just_one_function: passed
004_just_value_and_function: passed
005_dependent_function: passed
006_value_set: passed
007_value_set_with_dependent_function: passed
008_value_set_with_get: passed
009_nested_deps: passed
010_circle_detection: not same
value should be {}
value actual    { tock: undefined, tick: undefined }
011_nested_circle: not same
value should be { a: null }
value actual    { a: null, c: undefined, b: undefined }
012_actual_nested_circle: not same
value should be {}
value actual    { c: undefined, b: undefined, a: undefined }
013_conditional_circle_boot: passed
014_conditional_circle_triggered: not same
value should be { data: true }
value actual    { data: true, c: undefined, b: undefined, a: undefined }
015_subscribe: passed
016_unsubscribe: passed
017_unsubscribe_gaps: passed
018_no_side_affects: not same
value should be { data: null }
value actual    { data: null, count: undefined }
019_check_subscribe_effects: passed

latest file has changed. bumping minor version to 5
```

i'm actually quite happy with this: what's happening is
before when something failed i wouldn't set the
value. but now they are being set. so here
is `010_circle_detection.js` for example

```js
module.exports = {
    obj: {
        tick: ($) => $.tock,
        tock: ($) => $.tick
    },
    fn: ($) => {},
    _: {
        fn: ['tick','tock'],
        subs: [],
        deps: { tick: [], tock: ['tick'] },
        value: {},
        fatal: {
            msg: 'circular dependency',
            stack: [ 'tick', 'tock', 'tick' ]
        }
    }
}
```

the functions do run: we run all of them at the end
of the wrap:

```js
Object.keys(fn).forEach(name => update(name)); // boot process: update all functions, setting initial values and dependencies
```

i think it's more correct to say they have an undefined value.
previously, though, i was getting a bizarre value for `018_no_side_affects.js`

```
018_no_side_affects: not same
value should be { data: null }
value actual    { data: null, count: 10 }
```

that's because inside of `update` i was saving out
whatever got returned back:

```js
if (stack.length>1 && stack[0] == stack[stack.length-1]) fail('circular dependency');
else if (!fatal.msg && name[0]!='#') // any function that starts with '#' is a function that doesn't save a corresponding value
    value[name] = val;
```

but i should be checking if something failed after running the function and it did set the value to undefined

```js
if (stack.length>1 && stack[0] == stack[stack.length-1]) fail('circular dependency');
else if (name[0]!='#') // any function that starts with '#' is a function that doesn't save a corresponding value
{
    let val = fn[name]();
    if (!fatal.msg) value[name] = val;
    else value[name] = undefined;
}
```

> side note: why do functions that start with `#` get inside of `update`? why would they ever end up here?

i'm quite happy with this now. i should add a test, though, to confirm my understanding
that things are still lazy except for subscriptions.