
# 035 reintroducting inner objects

turns out i was right - i need inner objects
in order to make the dom work nicely.

...

it looks like what i really need,
unfortunately ... is namespaces.
or ... scope. so...

```js
let _ = auto({
	x: 10,
	y: (_) => _.x * 2,
	inner: {
		z: (_) => _.y * 4
	}
})
```

for the inner variable we could
create a new auto object. but
the problem is that object is
going to say "unknown variable `y`".
so ... maybe we should then bubble
up to the parent objects until you
find the variable (including the
current 'scope').

then i could do something like
this when i'm doing dom manipulation

```js
let _ = auto({
	name: 'karl'
	parent: null,
	el: document.createElement('div'),
	ad: (_) => _.parent ? _.parent.append(_.el) : []
	i0: {
		parent: null,
		el: document.createElement('p'),
		tx: (_) => _.el.innerHTML = 'Hello ' + _.name
		ad: (_) => _.parent ? _.parent.append(_.el) : []
	}
})
```

the issue is how do we make the inner `parent`
refer to the object above it?

we could just ... have this be a feature of
auto - say that `parent` is a special variable
that refers to what is above. then we would say

```js
{
	ad: (_) => _.parent.el.append(_.el)
}
```

since that would now refer to the variable we
want.

feels very hacky, very browser-dom specific.

also - how do i ensure order? i want to make
sure that a whole list of children is added
in the correct order ... i think we could...
hmmm ...

how do we implement this parent variable?
and the scope? i guess we just save the
auto variable as a value?

let's make a test, as always

```js
let _ = auto({
	w: 10,
	x: (_) => _.w * 2,
	inner: {
		y: 30
		z: (_) => _.x * _.y
	}
})
```

but what will the value look like?
i guess in the test evaluation we should
drill down if we find an object value ...

> so all objects are assumed to be auto?
> what if you want object values in your code?

> it shouldn't matter. the values will still
> be accessable as per normal ... i think
> (will you get back an object if you ask
> for it?)

> ok - we do a recursive search through
> the object. if we find any members that
> are functions, well - sorry, you're not
> getting that object back ... or maybe
> you do anyway when you refer to it ...

## the parent

so maybe this can all be done by being able
to pass a parent parameter into the options

```js

let a = auto({
	w: 10,
	x: (_) => _.w * 2
})

let b = auto({
	y: 30,
	z: (_) => _.x * _.y
},{
	parent: a
})

```

so we save `a` as the `parent` parameter
in the `b` auto object.

then when we perform a get we call a
get on `x` we don't find it in the local
object so we call it in the parent ...

but the parent object ... do we include
this for the deps?

## inner child

getting `NaN` values for the inner `z`
function. this might be because the
inner object ... we need to boot the
parent first.

```js
let is_auto_obj = (obj) => typeof obj == 'object' && !Array.isArray(obj) && obj != null && has_function(obj);

// setup a static value
// called from wrap() below

let setup_static = (name, res) => {

    // save whatever was defined originally
    // (we will deal with inner auto objects after we boot this one)
    if (!is_auto_obj(obj)[name])
    {
        value[name] = obj[name];
    
        // use our functions for get/set
        Object.defineProperty(res, name, { 
            get() { return getter(name) }, 
            set(v) { setter(name, v) } 
        })
    }
}
```

so the issue is not the parent itself:
we just create an auto object an pass it
into the value. so ... if you try to
access the value

```js
let _ = auto({
	w: 10,
	x: (_) => _.w * 2,
	inner: {
		y: 30
		z: (_) => _.x * _.y
	}
})

console.log(_.inner);
```

you will just get an auto object back.

ok. but the inner object needs
to ... well deps - we need ...

## the design

i feel as though i'm not actually
clear on how auto works.

i want to add a parent. what does
this mean? well ... well shit, it
means we need to have a `parent`
variable, and also `children`.
which sounds an awful lot like
the architecture we have already
to detect variable usage.

i think we need to go back to
the beginning. what does auto
do?

auto build a list of variables
which each function accesses.
it does this to know when to
re-run functions - any change
to dependents triggers a re-run.

this change can happen two ways:
either from the outside - direct
change - or from a function being
updated.

see, this is my issue: when someone
updates `w` in the object above
then `x` will update, but then
we have to trigger the child
function `z`! so the parent
does need to know about the child!

i wish the code were clearer ...

i feel as though there is a much
more elegant architecture underneath
this that would ... make the parent
idea just be completely natural.

what do we need in order to implement
an 'auto'-type functionality?

i mean... the truth is we could in
theory separate all the parts out:

```js
let a = auto({
	w: 10,
	x: (_) => _.w * 2
})
```

in a way this really is made up
of two objects that have been
combined:

```js
let a = {
	w: 10
}
let b = {
	x: (_) => _.w * 2
}
```

and then ... when we combine
them we're really just ...
talking about how they are related.

and funnily enough ... we can figure
out all the ... well, we can figure
out dependents independently.

you know, they are independent.
every time you access something
by saying `_.x` you are, or at
least you could be, calling some
thing ...

and really, remember, what we
are doing is just `get` and `set`
(and `subscribe`...). which, again,
we do just on one thing.

so we _could_ design this whole thing
as a per-variable thing - each variable,
each function or static is created
independently, and then we combine
them somehow ... somehow we link
their dependencies ...

that ... that would be a design
which would make this whole parent / child
idea (and others like siblings) very
natural.

is it worth it, though? is it ...
a cleaner design anyway, or would it
be messy?

> and i would have to re-write all
> the tests ... but if it makes the
> code clearer it may very well be
> worth it.

## independent members

ok, so now this new approach's code
will look something like:

```js
let auto = (obj, opt) => {

	let member = function(o) => {
		// each member has it's own
		//   fn: just o
		//   deps: variable names
		//   value: current value
		//   stack?
		//   fatal?
		//   subs
		//   watch: bool
		//   report_lag
		//   parent? child? sibling?
	}

	let mem = Object.keys(obj).map(v => member(obj[v], opt));
}
```


ok so for each member we produce this
object ... but now each object ...
so what happens when we call `get`
on the auto object?

we could loop through each member
until we find the right name...
obviously not a great idea (performance).

how about we have this ... i dunno,
trigger list. some kind of object,
a registry, for which we can say "hey,
i want to register this name".

ok, let's imagine the flow:

1. `console.log(_.x`
2. call ... the proxy?

still not 100% on how proxies work...

yes, so we have `Object.defineProperty`
which just allows us to assign functions
to `_.x` and `_.x = 10`.

so ... at some point we need to define
what happens there when we access it
from the outside. it might be worth
being explicit about this in the
code: a function like `set outside access`
would be much clearer ...

though are they the same as ... inside
access? when we are running through
updating dependents do we ever access
these defined properties? it would
be great to make this clear too.

it strikes me that ... again, there
_might_ be a really elegant approach
to all this: that the auto object
has outside access, each member has
outside access ...

you know, the auto object has triggers,
things that happen when you run `set`,
what happens when you run `get` ...

i mean, could this all be done
with a set of `defineProperty` calls?
all nested, somehow?

almost as though you could just have this...
recursive function that you keep calling
on the object...

```
let auto = (obj,opts) => {

	Object.keys(obj).forEach(key => obj[key] = auto(obj[key],opts));

}
```

ok so ... how do we get these two things
to connect?

```js
let a = {
	w: 10
}
let b = {
	x: (_) => _.w * 2
}

let aa = auto(a);
let bb = auto(b);

let c = merge(aa,bb);
```

```
let auto = (obj,opts) => {

	let objs = Object.keys(obj).map(key => auto(obj[key],opts));

	merge(objs);
}
```

hmmm...

## testing

i'm really struggling to find a wedge here.
let's write out the test we want to pass:

```js
let _ = auto({
	w: 10,
	x: (_) => _.w * 2,
	inner: {
		y: 30
		z: (_) => _.x * _.y
	}
})

assert(_.w == 10);
assert(_.x == 20);
assert(_.inner.y == 30);
assert(_.inner.z == 600);

_.w = 5;

assert(_.w == 5);
assert(_.x == 10);
assert(_.inner.y == 30);
assert(_.inner.z == 300);
```

doesn't look so bad.

it's worth noting that ... well this
really is just a namespacing issue:
we could very well simply rename
the inner variables and have a single
object ... like what i suggested
before ... why didn't that work?

well because of this

```js
let _ = auto({
	name: 'karl'
	parent: null,
	el: document.createElement('div'),
	ad: (_) => _.parent ? _.parent.append(_.el) : []
	i0: {
		parent: null,
		el: document.createElement('p'),
		tx: (_) => _.el.innerHTML = 'Hello ' + _.name
		ad: (_) => _.parent ? _.parent.append(_.el) : []
	}
})
```

the inner object is using it's own local
variable names ... but really we would have
to say

```js
tx: (_) => _.i0.el.innerHTML = 'Hello ' + _.name
```

which we can't do - we can't rename variable
access in each function. however ...

ok here is an idea - what if each function
has a different object that is passed in,
a different global object?

hmmmmmmmm.............

this already happens - in `setup_dynamic`
we create a proxy ... for some reason ...

still find that confusing.

i mean, i don't like having this huge
set of `fn` and `values` that look like

```js
{
	fn: [ 'name', 'parent', 'el', 'ad', 'i0.parent', 'i0.el', 'i0.tx', 'i0.ad' ],
	deps: { 
	    'ad': [ 'parent', 'el' ], 
	    'i0.tx': [ 'i0.el', 'name' ] },
	    'i0.ad': [ 'i0.parent', 'i0.el' ]
	value: { 
	    'tst.var1': [1,2,3],
	    'tst.var2': [2,3,4],
	    'tst.var3': ['two','three','four']
	},
```

but ... man this is so confusing / difficult.

so ... i already create this new global object
that is passed in ... i remember being very chuffed
at that ... like i was tricking the function.
i actually rewrite the function and pass in
a special object that ... runs update

```js
let _ = new Proxy({}, {
    get(target, prop) {
        if (!(prop in value)) {
            if (prop in fn) update(prop);
            else { fail('function '+name+' is trying to access non-existent variable '+prop); return undefined; }
        }
        return getter(prop,name);
    },
    set(target, prop, value) {
        fail('function '+name+' is trying to change value '+prop); 
    }
});
```

and then further below we save the function
using this object

```js
fn[name] = () => {
    if (fatal.msg) return;

    let v; try { v = obj[name](_, (v) => setter(name, v) ); }
    catch(e) { show_vars(name); if (!fatal.msg) fail('exception',true); console.log(e); }
    
    return v;
}
```

i suppose we could have a global object
array, one for each function:

```js
let glob = {}
```

and then we save it on setup

```js
let setup_dynamic = (obj, name, res) => {

	glob[name] = new Proxy({}, {
		...
	})
```

and then call _that_

```js
fn[name] = () => {

	if (fatal.msg) return;

    let v; try { 
    	v = obj[name]( glob[name], (v) => setter(name, v) );
    }
    catch(e) { show_vars(name); if (!fatal.msg) fail('exception',true); console.log(e); }
    
    return v;
}
```

why? well ... i suppose ...

man my brain hurts.

i'm trying to find an elegant way to preserve scope.
and by that i mean i need to specify an auto object,
it needs to be able to refer to it's own sibling
variables, but at the same time refer to other
variables in another, possibly parent, object.

so ... when you call a function ...

this can be dealt with by the object we pass in.
so ... this proxy object could check the current
scope. and if it's not there check the parent...

and then it would need to check _that_ parent too...
no idea how this would work.

and also - we need to trace the `get` call properly
too.

it's weird - each function has a special ... global
object, which is just used for `get`ing a value.

however... you also need to ...

ok, i forgot this is why i used a proxy:

```js
return getter(prop,name);
```

i pass in the name as the source (previously parent)!
which dramatically reduced tracing dependencies.
that's why `getter` is so simply;

```js
let getter = (name, source) => {

    if (fatal.msg) return;

    if (source) deps[source][name] = true;

    return value[name];
}
```

super simple. every function is written
using a global object that ... can see
what variable you are trying to access,
by name, and so we say "yeah sure here
is what you asked for" and now know
"ok so function `y` was just trying to
access variable `x`" so we write down
`x` in `y`'s dependency list.

how does that affect the parent stuff?

well ... again, the point of the dependencies
is in `set` (or `setter` ... hate how there
are different terms for that...)

```js
let setter = (name, val) => {

    if (fatal.msg) return;
    if (!(name in value))
    {
        console.trace('ERROR trying to set unknown variable '+name);
        fail('outside code trying to set unknown variable '+name);
        return;
    }

    value[name] = val; // save
    if (name in watch) console.log(name,'=',value[name],get_vars(name).deps);

    run_subs(name);    // run subscriptions to this value

    clear(name);

    // make sure any dynamic values dependent on this one
    // are updated
    Object.keys(fn).forEach( key => {
        if (!(key in value) && key[0] != '#') update(key);
    });
}
```

hmm weird. so the trick here is `clear` which ...
goes through all the `value`s and deleted them
recursively

```js
let clear = (name) => {

    Object.keys(deps).forEach( dep => 
        Object.keys(deps[dep]).forEach(child => {
            if (child == name && dep in fn)
            {
                delete(value[dep]);
                clear(dep);
            }
        })
    )
}
```

right so then at the end of `setter` we ...
run `update` for any key that isn't in value ...
basically any function that doesn't have
a value set ...

so in theory ... what we would have to do
if we wanted multiple, connected auto objects ...
is to go in and clear the values of that connected
objects in setter ... so `clear` now ... has to
go into the children ... unless the updates
at the end of `setter` ...

i wish this were simpler.
i just want to connect two objects.

```js
let a = auto({
	w: 10
})
let b = auto({
	x: (_) => _.w * 2
})
a.connect(b);
```

but ... what does connect mean?
i want to preserve the names,
so that `b` could have clashing
names! the whole point is to prevent
name clashing.

it's odd, because if you want to wire to
object together you need ... well i guess
you could do it with subscriptions.
you ... for each get in the child object
you check if it's in the parent, and
if so subscribe to said object, and
wire it to your own getter via
proxy. it's a mess but it will work.

in fact, the whole thing could be rewritten
in terms of subscriptions .... or could it?

## boxes

ok how about this - let's write out every
variable, every member, as a separate
thing. and then we just ... in the
most hacky, straight forward way try to
figure out how to have them connect somehow ...

ok so let's use the original `box` metaphor
(from the mobx guy / talk)

```js
let box = (v) => {}

let w = box(10);
let x = box( _ => _.w * 2 );
```

i love it already.

so ... i suppose each box has
a special object that ...
i mean `x`, when you want to
evaluate it, you have to ...

fuck.

ok what we want is

```js
...
console.log(w.value); // 10
console.log(x.value); // undefined

w.trigger(x); // ???
x.bind(w); // ???

console.log(x.value); // 20

w.set(5);

console.log(x.value); // 10
```

not sure ... if we want a function
for each box ... one to say "ok
well talk to this guy when you
change..." .... another to say
"talk to _this_ guy when you do
_other_ stuff!" ...???

boxes, boxes ... what do boxes
do? what ... different functions
can they have?

i suppose we could split this
up into 'static' boxes and
'function' boxes ... (perhaps
a better / more descriptive name
that 'dynamic').

what can a 'static' box do?

> i think this may be the abstraction
> i was looking for ....

- set value
- get value
- tell someone else value was set?
  or just ... "run these functions
  when you are set" ?

ok so ... i think that's it for
static boxes - get, set, subscribe ...
right? seems too simple somehow ...

so what can a dynamic box do?

- rerun (better than 'update'?)
- get
- subscribe
- ....

a function box (also ... it has
context, it's not just a 'function'...
it's more like a 'function with
context' box ... 'function on
a set of variables, with dependency
tracing' box, kinda...) has a
context ... so can you 'set' the
context?

it's kind of amazing because ...
if i get this right, defining
what each of these two kinds of
boxes do ... then i've done it,
that's all the functionality i
need, the rest is just, what's
that term? convenience functions.

so again, what can you do with
a ... c-box (maybe let's say s-box
and c-box for 'context'-box ...)...

i mean, what really is the difference
between an s-box and a c-box?

well an s-box has a value. it can
be set. you can subscribe to it.
simple stuff.

a c-box ... what can a c-box do?

> definitely a good idea inventing
> a new symbol for each of these ...
> makes it much easier to reason
> about them without getting confused / 
> thrown off by the name you've given them

ok, well first thing - a c-box contains
a function. and that function has
a particular structure: it is assumed
that the function takes in two parameters
which we call `_` and `set` and that these
functions will use `_` and `set` in a
particular way, with a particular meaning.

dealing with `_` first, the most important.
`_` means...

> hmmm splitting these two up like this,
> the box types i mean, shows how
> the c-box really is ... this separate
> thing, that ... really we are ...
> this is very interesting ... i've
> often wondered ... hmmm

`_` means 'use this as ... a way to
access ...' ...

this is really interesting: `_` means
pretty much everything. the only
other rule we have is that the function
should return a value. the only other
_meaning_ is a return value.

so ... and the _meaning_ of the return
value is that we will produce that value
in ...

ok. ok, so let's do it like this: start
without `_`. ok ......

## no `_`

ok check it

```js
let box = (v) => {}

let w = box(10);
let x = box( () => 2 * 3 );
```

ok so `x` contains a function.
and remember - it looks pure but
we do not restrict what the function
does at all.

> this is a very important point ...
> this has nothing to do with ...
> that high-theoretical stuff like
> we are inventing a new language.
> our functions can do anything -
> we can pull in stuff from the
> outside, we can freeze, do whatever ...

ok so with no `_` we, well ... what can
we do with this box?

i suppose it's simply `run` (better than
'rerun').

also `clear` ...

so in the box is: a value (which really
is "the last return value we got"....
which is interesting - we could store
a history if we wanted to...). then
we have the function. and we have `run`
(or `update`?) and `clear` ... which
does not set the value to `undefined`,
instead it sets the function as ...
it's a boolean which basically says ...
well i don't know. you can still
run `get` and that just brings back
the value ... which maybe we don't
call `get`, we instead just call
it `cache` - a single, static variable
you can access any time you want.

ok then why have a `clear` variable /
function?

so all we have is:

- the function (saved)
- `run` which runs the function and saves result in `cache
- `cache`

```js
let cbox = (fn) => {
	let cache;
	let fn = fn;
	return {
		fn,
		run: () => cache = fn(),
		cache
	}
}

let x = cbox( () => 2 * 3 );

x.run();
console.log('x =',x.cache);

```


hmmm...

really this box is just a caching utility.

of course we should talk about `set` - what happens
if this function takes a while to run.
we need to give it a way of setting the result.

```js
let x = cbox( (set) => {

	// do lots of stuff
	// like get v from internet

	set(v);
})
````

```js
let cbox = (fn) => {
	let cache;
	let set = (v) => { cache = v; }
	return {
		run: () => cache = fn(set),
		cache
	}
}

let x = cbox( (set) => {
	set(2 * 3)
});

x.run();
console.log('x =',x.cache);
````

hmmm getting undefined...

```js

let cbox = (fn) => {
	let cache;
	let set = (v) => { 
		console.log('setting cache');
		cache = v;
	}
	return {
		run: () => {
			console.log('running');
			cache = fn(set);
		},
		cache
	}
}

let x = cbox( (set) => {
	set(2 * 3)
});

x.run();
console.log('x =',x.cache);
```

this is what i'm getting

```
karl@Karls-Air doc % node 035_cbox_test.js
running
setting cache
x = undefined
```

which makes sense.

```js
let x = cbox( (set) => {
	return 2*3
});
```

still getting undefined. do i have
to ... use defineProperty? can i not
... return an object, and ...
modify that objects value directly?

```js
return {
	run: () => cache = fn(set),
	get cache() { return cache }
}
```

> https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/get


and ... i suppose we need a subscribe
method too ...

once we have subscribe, will that mean
we can wire everything together?
surely it does ...

all we need do then is ... create the
right context to pass in, to create
`_` ... which we can do separately ...
because all _it_ does it run all the
subscribe methods ...??!?

> not sure how happy i am about
> the getter but ok. maybe it won't
> matter.

## subscribe

let's add subscribe methods.

first to the s-box

```js
let sbox = (v) => {

	let value = v;
	let fns = [];

	let set = (v) => {
		cache = v;
		fns.forEach(fn => fn(v));
	}

	return {
		set,
		get value() { return value; },
		subscribe: (f) => { 
			fns.append(f);
			f(value);
		}
	}
}

let x = sbox(10);

x.subscribe( (v) => console.log('first func',v) )
x.subscribe( (v) => console.log('second func',v) )

x.set(20);

```

produces

```
karl@Karls-Air doc % node 035_tests.js
first func 10
second func 10
first func 20
second func 20
```

works great.

> is that really it for the static box?

> should we combine the two? they're both
> going to have the same getter, and
> the same subscribe ...


```js
let cbox = (fn) => {

	let cache = fn();
	let fns = [];
	
	return {
		run: () => {
			cache = fn();
			fns.forEach(fn => fn(cache));
		},
		get cache() { return cache; },
		subscribe: (f) => {
			fns.push(f);
			f(cache);
		}
	}
}

let y = cbox( () => 2 * 3 );

y.subscribe( (v) => console.log('c-box first sub',v) )
y.subscribe( (v) => console.log('c-box second sub',v) )

y.run();
```

i had to do `let cache = fn();` (running fn) at the
top so the subscribe would have the right value at first.

hmmm ... i guess we can't 'set' this box, so ...
right now there is no point to the subscriber
except to just 'run' it again.

```
let y = cbox( () => 2 * 3 );

y.subscribe( (v) => console.log('c-box first sub',v) )
y.subscribe( (v) => console.log('c-box second sub',v) )

y.run();
```

```
c-box first sub 6
c-box second sub 6
c-box first sub 6
c-box second sub 6
```

ok so it works.

## next

ok so ... now what?

firstly, what do we have?
we have ... really, just a value that
we can subscribe to. and ... one of them
you set with a value, and the other you
set by running a function...

incredibly similar. we could just call
`run` 'set' in the cbox and it would
be the same.

ok, but the real trick is this context.
this global object that we pass in.
and .. what is that object? what does
it do? why should we care?

ok, so ... this object, this really
special object ... it ...
well it has a repository of stuff
inside of it. it ... it is a connection
to other boxes. right? and ... and
it will call you whenever one of
those boxes changes. so, it will
setup subscribes for you - it will
subscribe to any boxes you try to
access for you, and then re-run you
if you ... hmmm ...

ok let's just dive in and make
this special object:

```js
let x = (b) => {

}
```

um ... ok so ... so `x` is the
object we create and ... pass
in when running ... a cbox

```js
let cbox = (fn) => {

	let _ = ctx(/*...*/);

	let cache = fn();
	let fns = [];
	
	return {
		run: () => {
			cache = fn(_); // NB
			fns.forEach(fn => fn(cache));
		},
		get cache() { return cache; },
		subscribe: (f) => {
			fns.push(f);
			f(cache);
		}
	}
}
````

ok so we create `_` using this special
function i've now called `ctx`.
and ... well there is an issue here -
what do we pass in? we can't pass in
anything at first... and we need to
use it when running the function ...
hmmm ...

and then we pass this into `fn` inside
of `run()`. however, we need to ..
inside of `ctx` must go the whole object.

why? well ... i suppose just to ... call
`run` ... ? is that all we need? we don't
need `get`. we don't need `cache` or `fns`
or `subscribe` ...

but we need `run` because it will save out
`cache` and run the subscriptions ...

but, bizarrely, `ctx` uses `run` and
`run` uses `_` which is built from `ctx` ...

maybe ... maybe we don't ... do it like this
at all ... maybe ... we just leave these
boxes, and then define the functions ...
hmmm

right, because we could just

```js

let _ = ctx();

let y = cbox( () => _.x + _.y );

```

right? so ... it really is just an fbox.
no context. we create the context somewhere
else ...

however, how does `_` know which function
to re-run when something changes?

# blerg

we could just ... add the function to ...

```js

let _ = ctx();

let y = cbox( (_) => _.x + _.y );

_.add(y);
```

but then we still don't know ...
that _this_ function means _that_
cbox. we have to associate them
somehow.

i suppose ... well one thing we could
do is pass it into something, so

```js
let _ = ctx([x,y]);
```

right ? then ... well then we could ...
i mean, we could get the function out
and run it and figure out what is
happening ... but that negates the
whole ... if we're going to pull
the function out anyway why have a box
around it?

it's also kind of weird defining something
like this:

```js
let y = cbox( (_) => _.x + _.y );
```

i mean, what is `_`? maybe ...
maybe cbox has a method for ...
setting it's parameter. maybe you
can, like, say "use this for the first
parameter" then we could ...

```js
let y = cbox( (_) => _.x + _.y );

let ctx = {
	cs: { y }, // cboxes
	deps: { y: {
		x: true,
		y: true	
	}},
	// could replace these with proxy ...
	get x() { return cs.x.cache; },
	get y() { return cs.y.cache; }
}

y.parm(ctx);
```

... this could work ... not sure how clean it
is ... is this clean? is this better than
before? can i easily test this?

god, i would have to re-write _all_ the
tests.

hmmm ... strangely `ctx` is very specific
to ... right, so this `ctx` is _just_ for
`y`

```js
let ctx = (box) => {

	// ...

	return new Proxy{
		get (target, prop) { /* ... */ },
	}
}
```

hmmm so building what to do ... when we
`get` ...

well, we need to actually get the value.
and ... we need to add to a list of ...
subscribers.

that we can do without the other ...
i mean, we can figure out what is inside
of this function, we can see what it is
trying to call ...

and we can add things later - we can
add ... we need to wire this to
something, maybe a global store?
maybe something called 'scope'?

also - we need to have ... a `pre`
and `post` hook for each box because ...
we need to reset the dependencies
before each run ... except we are going
to be doing the running ...

```js
deps = {};
box.run();
```

why not pass in the context directly
here?

```js
let cbox = (fn) => {

	// ...
	
	return {
		run: (...args) => {
			cache = fn(args);
			// ...
		}
```

# outer object

let's start from the outside ...
that is a proxy and ...
what do we do?

```js
let auto = (obj, opts) => {

	// ...

	return new Proxy({}, {
		get(o, name) {}
		set(o, name) {}
	});
}
```

one approach is to ... as before,
have a global `values` object that
stores everything ... so `get` just
looks at that. and maybe dies if
the value isn't in there?

and then `set`? well i guess it ...
has, well ...

what if we literally just get and
set using a list of boxes?

```js
let auto = (obj, opts) => {

	let boxes = {};

	return new Proxy({}, {
		get(o, name) { return boxes[name].value; }
		set(o, name, value) { boxes[name].set(value); }
	})
}
```

