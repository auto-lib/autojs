
# autolib javascript

this is the javascript version of the auto library.

## basic idea

the simplest example looks like this:

```js
let auto = require('@autolib/auto');

let _ = auto({
    x: 10,
    y: _ => _.x * 2,
    log: _ => console.log('y =',_.y)
})
```

when you run this you should see

```bash
$ node test.js
y = 20
```

the variable we get back (in this case `_`)
has accessors attached to it so you can

```js
// add this after let _ = auto({ ... })
_.x = 5
```

at which point both `y` and `log` will
get triggered, i.e.

```bash
$ node test.js
y = 20
y = 10
```

## separate objects

you can have several object that refer to one another.

```js
let { cache, error, pubsub } = require('@autolib/default');

let auto = obj => require('@autolib/auto')(obj, { cache, error, pubsub });

let a = auto({
    x: 10,
    y: _ => _.x * 2 + _.w,
    log: _ => console.log('y =',_.y) // this will run any time y changes
});

let b = auto({
    w: 2,
    z: _ => _.x + _.y,
    log: _ => console.log('z =',_.z) // this will also run but when z changes
});

a.x = 5;
b.w = 3;
```

each auto object uses a _cache_ for storing values,
an _error_ object for reporting on exceptions and
a _pubsub_ for connecting with a publish / subscribe
mechanism

above we get default objects for each of these (you can
also use your own custom objects, or wrap the defaults -
see below) and use them all to create `a` and `b`, which
each refer to values the other defines.

## custom core objects

you can easily pass in your own versions of the core
objects, for example
if you wish to use a database for the cache store,
want to send any errors to a server, or if you want
to connect auto objects over a transport (auto objects
are separable, see above).

all you need do is create a function which returns
the correct function names. see `cache.js`, `error.js`
and `pubsub.js` in the source for examples (they are
quite simple).

alternatively you could just wrap the core functionality
using the `prehook` (or `posthook`) function e.g.

```js
let evts = [];
let log = (obj,v,fn,parm) => parm ? evts.push({ obj,v,fn,parm }) : evts.push({ obj,v,fn });

let { cache } = require('@autolib/prehook')(log);
let auto = require('@autolib/auto');

auto({
    x: 10,
    y: _ => _.x * 2
})

console.log('evts',evts);
```

this will print out a log of everything that has occured in
the cache:

```bash
$ node test.js
evts [
  { obj: 'cache', v: 'x', fn: 'set', parm: 10 },
  { obj: 'cache', v: 'y', fn: 'has', parm: 'x' },
  { obj: 'cache', v: 'y', fn: 'get', parm: 'x' },
  { obj: 'cache', v: 'y', fn: 'set', parm: 20 }
]
```