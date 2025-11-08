
# signal

```js
let a = auto({})
```

- check value passed in
- check value is object

if either of these doesn't work,
call the error handler.

> in order for that to work,
> i.e. in order to have errors
> from bad configuration,
> we must pass in the error handler
> after the object?

```js
let a = auto({},onerror);
```

> we could just ... we'll have
> a default error handler that
> just logs to console ...
> not sure we need more than that

now we need to initialise
state, import, export, channels:
the state must react to changes,
import must pull values from
channels, export must publish changes
to the channels ...

- if state value defined
-- initialise state
--- make sure state value is object

## single mechanic

i want to see if all of this can be
done with a single underlying mechanic.
what might that be?

it strikes me that ... publishing and
subscribing to imports and exports
is similar to setting up ... dependencies
in functions.

i just wonder if all of this, perhaps even
all software, can be written using this
kind of ... set of dependent relations.

as i was writing out all the logic for
the latest auto implementation ... it
just irritated me that it was getting
so convoluted.

a question struck me: what could this
look like?

```js
let { init } = load({
    init: {
        pre: [], // always wait for these first
        autoinit: true, // get dependencies automatically
        fn: () => {
            console.log('init fn');
        }
    }
})
```

i mean ... so we have a function ...
and we wrap it. and return the wrap.
and ... we can specify things like 'run
this right away' (which seems silly)
but also 'ensure these run beforehand
(`pre`)' and also 'calculate the
dependencies of this function first'
(which is another way of saying 'make
sure these run beforehand').

again, as i've spoken about ad nauseum
before, this is about sequencing - that
software may be ... far easier to deal
with if we formalise the notion of
order of events. why not ... write
literally everything out flat and have
the software determine what order to
execute everything in?

ok and if everything then is just a
set of disembodied functions ...
then how do they connect?

well, then the function would have to
say 'i will respond when such-and-such
occurs'. and it will also ... make
such and such things occur as well.

you know, so you can say 'as soon as
this and this occurs, do this'.

and ... maybe each function then
decides on it's own what ...
'occurances' to make, what to
trigger, what 'signals' to produce ...

is that ... enough to build what
i'm trying to build?

so you entire program is a set of
functions. and each function is
wrapped with details regarding
what needs to happen in order for
it to run.

can any function produce any signal?

maybe ... maybe we just start with
this simple idea - which is ... what?
just normal pub/sub?

```js
function auto(obj)
{
    load({
        init: {
            pre: ['set obj'],
            fn: () => {}
        }
    })

    signal('set obj',obj)
}
```

 - how do we pass `obj` into `fn`?
 - how to we tie `signal` to `load`?

we could have a state for each load.
then how do we write a server which
has multiple sets on the same variable,
i.e. request ?

of course, we could have each signal
have state ... so you pass the state
in ... hmmm

let's start by saying: we have a signal
called 'set obj' and ... it's floating
around in space, no worries - we push
it onto a stack somehow. a queue.
and then somehow we have to figure out:
ok we first need to run these checks,
and if any of them fails then we bail
and show an error.

```js
function auto(obj)
{
    let { init } = load({
        init: {
            pre: [
                obj => typeof obj !== 'undefined',
                obj => isObject(obj)
            ],
            fn: obj => {

                ({ name, onerror, state, channels, imports, exports } = obj);

                let err = e => console.log('ERROR',e);

                if (typeof onerror !== 'function') console.log('CRITICAL error handler is not function:',onerror);
                else err = onerror;

                if (state) init_state(name, err, state, deps, cache, imports);
            }
        }
    })
}
```

it's starting to feel as though ... all i'm doing is trying
to reduce how much typing, how much text there is on the
screen ...

this is all about, once again, sequencing - all software is
a sequence of steps. and ... i just don't want to have to
think about that. i want to write ... i want to write software
without it, because it's redundant - why am i orchestrating
everything?

ok, so we have this thing called `obj`. and ... whenever it
is set we first need to check if it is ok, if it looks right.
then from that we pull out other variables. and we need to
check those. then when those are ok we do some more things
like ... saving values ...

so perhaps state, a state per load, is normal. not sure how
the server thing will work. but maybe we split things up
into state and functions.

```js
function auto(obj)
{
    let { set, run } = load({
        state: {
            obj: {
                checks: [
                    obj => typeof obj !== 'undefined',
                    obj => isObject(obj)
                ]
            }
        },
        functions: {

        }
    })
}
```

hmmm ... i mean, we could have a function for `state`
(passed in from auto obj) but ... then we would have
a state variable for that too... which suggests we
should merge them ...

let's just specify if something is a variable or
not (and why not just specify that it's ... what
is that name for something where it's just one
variable, i.e. not multiple instances?)

```js
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
```

hmmm ... amazing overkill for saying `let { state } = obj`.
do we really need to write everything out like that?

i suppose if we are going to try ... simplify things
to some basic elements then ... well it's going to
get messy doing things that were straight forward in
other ways. so ... we decide to define every bit of
state in terms of: what it comes from, under what
conditions does it appear, when do we throw an error ...

which is incredibly messy. and what do we get for it?
well, again (x1000), no more sequencing - if we define
every piece of state in terms of inputs and functions
then we needn't again have to hold in our minds
the process of orchestrating it in concert with everything
else (and everything else may include 100 other pieces).
perhaps that really is the point of all of this - 
we shouldn't be holding this stuff all in our heads.

auto: don't hold everything in your head.

the previous attempts at fixing the 'do not hold it
all in your head' issue was, well ... i mean, objects?
functional programming? really?

ok, so i use to feel as though everything was a value ...
really because that is the software i was working on
where pretty much everything was a value ...

but now i see that values are important but ...
sometimes things are no really values but just
reactions. chains of reactions, really. that
some reactions don't produce values, and reactions
to those reactions, well, i mean they do produce
values but they don't change the global state.
well ... maybe they change the global state but ...

this is about a server - every request needs to
be reacted to, and it does produce a response
and that response needs to be reacted to as well ...

but it's not about building out the global state.
it's not all about the global state.

so what is it all about?

perhaps what it is all about is ... signals?
a name/value pair?

and here you must define the sequence - what
sequence of events must be run first? and some
of them must be able to block? or should we just
write out ... how do we stop a sequence?

so any signal depends on other signals.

```js
{
    'obj undefined': obj => typeof obj === 'undefined'
}
```

perhaps we just have a generic `stop` function passed in

```js
{
    'obj undefined': (obj, stop) =>
    {
        if (typeof obj === 'undefined') stop()
    }
}
```

or maybe just `err`...

how do we make sure it runs in the right sequence?
'obj undefined' must be run before pulling values
out of it ...

so we start with a signal called `set obj` and it
has a bunch of reactions. presumably that just
results in a set of other signals - so the entire
software program is a set of signals.

- `set obj` { ...}
- `error` 'obj is undefined'

i really like that since all programs then are
easily reproducable and testable, including
each step - for every step we can see what
signals are produced in response. in fact,
you could write things out as a tree structure

- `set obj` {...}
-- `error` 'object is undefined

we could just write out tests as a set of
signal steps

- `set obj`
-- `error` 'object is undefined'

just those two lines could be a complete test!

i love it.

ok so perhaps we just write out the sequence
for certain events explicitly:

```js
{
    'set obj': {
        params: ['obj'],
        sequence: [
            (obj,sig) => if (typeof obj !== 'undefined') { sig('error','object is undefined'); sig('stop'); }
        ]
    }
}
```

i love it.

so we have a special signal called `stop`

- `set obj`
-- `error` object is undefined
-- `stop`

are we done? what about the rest of it?

```js
{
    'set obj': {
        params: ['obj'],
        sequence: [
            (obj,sig) => if (typeof obj !== 'undefined') { 
                sig('error','obj is undefined'); 
                sig('stop'); },
            (obj,sig) => if (!isObject(obj)) { 
                sig('error','obj is not object'); 
                sig('stop'); },
            obj => sig('init state',obj);
        ]
    },
    'init state': {
        params: ['obj'],
        sequence: [
            (obj,sig) => if (typeof obj['state'] === 'undefined') { 
                sig{'msg','no state in obj'}; 
                sig('pass'); },
        ]
    }
}
```

... it's really getting pretty verbose. and for what?
i suppose ... again, we get such a granular view of
what is happening. i mean, who cares if it's verbose?
we could find a way to make it less typing ...

and i suppose the real meat comes in when things start
to really become complicated. that's when, perhaps, it
will become clear how ... the complexity you see above
is really as complex as it will get. maybe.

really, so far all we've done is re-written everything
in terms of `stop`, `pass` and, well, `goto` ...

let's try clean it up a bit.

```js
function auto(obj)
{
    let edf = v => (v,sig) => if (typeof v !== 'undefined') { sig('error','undefined'); sig('stop'); }
    let eob = v => (v,sig) => if (!isObject(v)) { sig('error','not object'); sig('stop'); }
    let pnx = (v,n) => (v,sig) => if (typeof v[n] === 'undefined') { sig('msg','no '+n); sig('pass'); }

    'set obj': {
        params: ['obj'],
        sequence: [ edf(obj), eob(obj), sig('init state',obj) ]
    },
    'init state' {
        params: ['obj'],
        sequence: [ pnx(obj,'state') ]
    }
}
```

here i wrote `edf` to mean `error defined` i.e. 'throw an error if this
variable is undefined'. `eob` is `error is object` and `pnx` is `pass not exist`...

not sure this is as clear as can be ... really the sequence is
'try to set object' -> check object exists -> check object is object -> init state
and each step really depends on the previous...

it's an odd thing, saying that everything generates a signal ... when in
this case what happens is, well, a function is run (`init`?) with a parameter
and we are reacting to said parameter ...

so i guess what we have is

```js
{
    'obj ok': {
        depends_on: ['is object']
    }
}
```

and then i guess `is object` is another function ... with dependencies ...

one reason to split these all up into all these steps is
well ... then we have this one global error ...

we could just have ... well

```js
if (typeof obj !== 'undefined') sig('error','object undefined');
else if (!isObject(obj)) sig('error','not object');
else
{
    // ...
}
```

i mean, sure. but that is all wrapped inside of code.
and if we explicitly write these out as separate functions
with steps then we can visualise it - see if happening in
a console or even graphics.

i mean ... well if we have this global idea of values,
values being passed in, checked, passed ... then
why not use it here? and why are we writing these in
terms of functions that are explicitly stopping?

```js
{
    obj: {
        fail: [
            obj => typeof obj === 'undefined',
            obj => !isObject(obj)
        ]
    },
    state: {
        pass: state => typeof(state) === 'undefined'
    }
}
```

so we have a particular kind of signal, a variable,
and for each we have a particular set of ...
checks that decide - should we break / fail here?
should we just continue here?

right - because all a signal has is, well, it's
name and a value.

```js
{
    obj: {
        fail: [
            obj => typeof obj === 'undefined',
            obj => !isObject(obj)
        ],
        fn: (obj,sig) => {
            sig('name',obj.name);
            sig('state',obj.state);
            sig('imports',obj.imports);
            sig('exports',obj.exports);
            sig('channels',obj.channels);
        }
    },
    name: {
        pass: name => typeof(name) === 'undefined',
        fail: name => typeof(name) !== 'undefined' && !isString(name),
        fn: () => sig('local',{ name }) // update local variable?
    }
    state: {
        pass: state => typeof(state) === 'undefined',
        fail: state => typeof(state) !== 'undefined' && !isObject(state),
        fn: () => {

        }
    },
    imports: {
        pass: imports => typeof(imports) === 'undefined',
        fail: imports => typeof(imports) !== 'undefined' && !isArray(imports),
        fn () => {
            
        }
    }
}
```

right? so ... every signal has a value associated
with it. and we say "ok so the obj signal produces
four more signals - name, state, imports, exports.

i think this is good... so we can then say

```js
function auto(obj)
{
    let sig = load({});

    sig('obj',obj);
}
```

... yeah i mean ... so far i'm pretty happy with this.


# maps

well maybe we could take a leaf in the ... well reactive
programming model. or ... lodash? streams?

so every entry in the object is, well, i suppose an 'event',
and each 'event' has a parameter ... and for each event
we treat like a stream which can produce other events ...
and can be filtered.

which is interesting because we can use `map` to produce
signals from a particular signal ...

```js
{
    obj: {
        filter: [],
        error: [],
        map: v => ({
            name: v.name,
            state: v.state
        })
        //map: v => ({ ...v }) // name, state, etc ...
    },
    state: {
        filter: {
            fn: v => typeof v === 'undefined',
            msg: 'skipping undefined state'
        },
        error: {
            fn: v => !isObject(v),
            msg: 'state is not object'
        }
    }
}
```

