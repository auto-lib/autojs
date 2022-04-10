# separate boxes

source is in `037_separate_boxes.js`.

again i am coming back to ... something i think
i was writing about before while trying to
introduce separate objects.

i'm busy trying to tie the browser to the server
using events (nsq and websockets) and then i
saw a video about erlang (actually elixir) which
apparently uses messages to make things concurrent,
which makes me think ... well this is a way to
tie this all together: i need namespaces, i need
to split things up ... i want to clean up the code
somehow ... and it just seems cleaner, perhaps it's
cleaner, to have one object per member of the auto
object, we just make a list of them and they all
update themselves, somehow ...

then we can have auto objects connected across space
and time, it can be completely abstract, we define
the transport for notifying changes ...

so in the case of autojs, we can keep our battery
of tests, we just need a transport that modifies
the same state variables.

so the code then might look like this:

```js
let transport = () => { /* ... */ }
let box = (v,tx) => { /* ... */ }
let auto = (obj,opt) => {

    let boxes = {};
    Object.keys(obj).forEach(name => boxes[name] = box(obj[name], transport));
    return boxes;
}
```

is that it? so i initialise each box, and give each a transport.
surely the transport ... needs some parameters?
i suppose it's actually a single transport ... what does a box
do? (i know i've been over this but let's do it again).

a box declares that it has changed ... or does it?
fuck.

ok. each box is a name. and each name is an event.
and a box subscribes to events.

> maybe it is much cleaner to break out this idea
> of an 'event' or perhaps instead a 'channel'
> like a list of things that can occur ...

ok so you can set a variable through a box
with `box.set(10)` and that is an event on
a topic. so we literally just publish onto
that like the nsq intro docs say:

```t
publish an initial message (creates the topic in the cluster, too):

$ curl -d 'hello world 1' 'http://127.0.0.1:4151/pub?topic=test'
```

so here the variable name is `test` and we are assigning it
a value of `'hello world'`

> hmmm this is exciting me ...

so `nsq` is just a transport (transport?) that we can
use ... but then we need ... an executor? an object
on the pipeline that receives changes to all the
variables and then publishes changes based on ...

well i suppose each box sits on the nsq pipe,
they all sit there separately ... ?

## box

let's go back to the code

```js
let transport = () => { /* ... */ }
let box = (v,tx) => { /* ... */ }
let auto = (obj,opt) => {

    let boxes = {};
    Object.keys(obj).forEach(name => boxes[name] = box(obj[name], transport));
    return boxes;
}
```

what should each box have?
each box will know about it's dependencies.
it will also have subscriptions to these ...

let's take a basic example:

```js
let boxes = {
    x: 10,
    y: _ => _.x * 2
}
```

hmmm which actually should look like

```js
let boxes = {
    x: box(10),
    y: box(_ => _.x * 2)
}
```

ok. and then maybe we initialise it?
like with a context? how would the `y`
box know what that `x` is?

right - which again might clarify what
these values, what a box really is - 
really it's just a pub-sub mechanism
(for when it's a static value)
but then in the special case a function
with a context.

and what is that context? what _is_ a
context? can it change? what is it's
minimum properties?

look at the function for `y`: `_ => _.x * 2`.
that can be run anywhere. that's what is
so interesting.

ok, one thing we can be sure of it ...
well we need to, i suppose ... add
context to a box? like, when do we tell
the box what the context is?

ok, at some point we will be running
the function, right? of course we will.
there is no other option - we have to,
at some point, run the function and we
have to give it parameters, especially
the `_` parameter but also set and others,
maybe...

> it's interesting to note, though: why
> are the parameters `_` and `set` ?

what is the point of a function? well,
you run it and get a return value back.
then you publish (and cache) this value.

so what do we _know_ so far we need for
this special function box?

 - run
 - publish
 - cache

another thing we know: when we run the
function we will ... well we will at
some point pass in a special access
parameter. that is the fundamental
design of this thing, that really is
the whole point of auto: be write out
functions which access all variables
through some special parameter

> multiple parameters too, maybe? ...
> with different purposes?
> like different variable types?
> what if we have the type defined in the
> accessor, like `int` and `string` so you
> specify the type while accessing it like
> `str.name` ... that way you ensure types
> while using a variable, not just when
> declaring it ... i think that's a very interesting
> idea ...

```js
auto({
    'x:int': 10,
    'y:int': _ => _['x:int'] * 2
})
```

hmmm i think that's quite cool ... and would
be very easy to implement ...

> it might seem a strange thing to do but ...
> you are just adding checks for yourself,
> just annotating your code ... though might
> get very verbose if you have that throughout ...
> but it will make your code very understandable ...
> plus it's easy to make that optional

> it seems like ... well, if you are going to
> annotate the variables ... then we should
> be able to see straight off whether you
> are using them correctly ... right? so can
> we catch things like ... `_['x.int'](20)`
> i.e. we are assuming it's a function ...
> i mean, we can see it right there ...
> though the editor could catch that ...

> but it would be nice if the auto library
> could tell that you are doing something
> weird, like trying to multiply an array ...
> but we want to catch that at 'compile'
> time, or rather 'edit' time in this case ...

## hmmm

```js
publish(value)
subscribe(name)
clear_subs()
get_cache()
save_cache(value)
```

is that it?
here are the internal vars we have currently

```js
let deps = {};   // subscribe / clear_subs
let fn = {};     // get_cache / save_cache
let value = {};  // get_cache / save_cache
let stack = [];  // execute
let fatal = {};  // execute
let subs = {};   // subscribe / clear_subs
```

`execute` is not defined by the box. it's an
external method...

```js
let get = (box,cb) => {
    let set = (v,sc) => { 
        if (sc) box.save_cache(v);
        box.publish(v);
        if (cb) cb();
    }
    if (!box.fn || !box.dirty)
        set(box.get_cache(),false);
    else
    {
        let ctx = (name) => {
            box.subscribe(name);
            return get(getbox(name), cb);
        }
        box.clear_subs();
        set(box.fn(ctx,set),true);
    }
}
```

do we define these functions per box?
or we could just ... pass them in?

```js
let get = (box,cb) => {

    let { name, fn, dirty, handler } = box;
    let { save_cache, publish, get_cache, clear_subs } = handler;
    
    let set = (v,sc) => {
        if (sc) save_cache(name,v);
        publish(name,v);
        if (cb) cb();
    }
    
    if (!fn || !dirty)
        set(get_cache(name), false);
    else
    {
        let ctx = (n) => {
            subscribe(name, n);
            return get(getbox(n), cb);
        }
        clear_subs(name);
        set(fn(ctx,set),true);
    }
}
```

so a `handler` just describes a set of functions.

hmmm, but i mean ... why do we have two things,
we should just merge them in ... i mean, why
save just the name, fn and dirty in the box ?

```js
let box = (name,value,handler) => {

    handler.add(name,value);
    
    let fn; if (typeof value === 'function') fn = value;
    
    let dirty = true;

    return {
        name, fn, dirty, handler
    }
}
```

ok so ... the handler doesn't ... well it doesn't
run the function, it doesn't set the box as
dirty ... it just stores the subs, and handles
the cache ... so maybe we split them out too?

```js
let box = (name,value,cache,pubsub) => {

    let fn, dirty = true;

    if (typeof value === 'function') fn = value;
    else cache.save(value);

    return {
        name, fn, dirty, cache, pubsub
    }
}
```

ok so we create objects for a particular
box ...

```js
let memcache = () => {
    let value;
    return {
        save: v => value = v,
        get: _ => value
    }
}
```

```js
let arrpubsub = () => {
    let deps = [];
    let subs = [];
    return {
        publish: () => {},
        subcribe: (name) => { if (subs.indexOf(name)==-1) subs.append(name) },
        clear_subs(): () => subs = []
    }
}
```

```js
let auto = (obj,cache,pubsub) => {
    let boxes = [];
    Object.keys.forEach(name => boxes.append(box(name,obj[name],cache(),pubsub())));
    return boxes;
}
```

