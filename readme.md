## what

**auto** has just one keyword, `auto`,
which is used like so:

```js
let $ = auto({
    data: null,
    count: ($) => $.data ? $.data.length : 0,
    msg: ($) => $.data + " has " + $.count + " items"
})
```

 - `auto` wraps a plain object
 -  each object member refers to either a _value_ (e.g. `null`) or a _function_ (e.g. `($) => $.data ? $.data.length : 0`)
 - _functions_ take in the wrapped object as input i.e. `($) => ...`
 - _functions_ product a return value and refer to any other members (both _values_ and _functions_) e.g. `$.data` or `$.count`

## why

the idea is that we define the _relationships_ between variables
explicitly and so don't need to orchestrate function execution
when state changes. to explain:

### reactive variables

after you set a value member of the returned wrap object (`$`)

```js
$.data = [1,2,3]
```

any subsequent access to function
members will produce the correct result based
on the relationships you defined.

```js
console.log("msg =",$.msg);
```

```
msg = 1,2,3 has 3 items
```

### so?

notice that we defined a nested
dependency: `msg` depends on `count`
which depends on `data`. if you coded
this in the standard way, i.e. with functions,
it would have been succeptible to bugs:

```js
let data = null;
let count = (data) => data ? data.length : 0;
let msg = (data, count) => data + " has " + count + " items";

data = [1,2,3];
console.log("msg = ",msg(data, count(data));
```

in this case we are responsible for ensuring:

 - functions are called in the right order
 - functions are wired together properly

so this is why a reactive library can be
so great in software that has complex
relationships between variables
(though they can be used incorrectly
which can go [very badly](docs/bad-reactivity.md)).
however, what makes **auto** different from
other reactive libraries like MobX and
rxjs or the reactive functionality in SvelteJS?

### explainability

because of how most reactive libraries
are designed debugging why things occurred as
they did is neigh impossible (caveat: i actually
do not have experience in using MobX or rxjs
but i have a _ton_ of experience trying to
use the reactivity in SvelteJS, hence this library!,
so i may be wrong about this... :|) you never
know what caused things to execute in the order
they did, or even what order they ran in.

with **auto** it's very different: because of
how it is designed you can at any stage see
exactly why things are happening they way they
are by looking at the actual
internal state of the wrap
which determines all of the reactive
logic simply by accessing the special variable `$._`

```js
console.log($._)
```

after our two statements above this will print

```
{
  deps: { msg: [ 'count' ], count: [ 'data' ] },
  dirty: {},
  value: { data: [ 1, 2, 3 ], count: 3, msg: 'Got 3 items' }
}
```

 - `deps` what each function member depends on
 - `dirty` what function members need updating
 - `value` current value of each member

so for example we can see

## other notable features

### simple

the entire **auto** library is 100 lines long,
it has no external dependencies and uses just
five variables to manage its internal state
(the three we see in `$._` and two others not
worth printing out in debugging).
for a detailed
explanation of how everything works see
[docs/internals.md](docs/internals.md).

### robust

each of these are flat structures. the dependencies
of `get count()` in the example above are in an array
in `dep.count`. similarly for whether `count` needs
to be re-calculated (`dirty.count`) and what the
last calculated value is (`value.count`). all these
structures sit outside of the functions that change
things. these are the three methods internally in
the **auto** library:

 - `update(tag)` update the value of variable named `tag` (here we use `tag` and not `name` because of autorun blocks. see below)
 - `getter(tag)` get the value of `tag`, updating if dirty. if `running` is set, add to `running`s dependencies
 - `setter(tag,value)` put `val` into `tag`, updating / making dirty each dependency as needed


### explainable

this makes it trivial to understand what is happening
at any point in time: simply print out the `_` member
of the returned _auto_ object.

```js
console.log($._);
```

> {
>     dep: ['count': ['data'], 'msg': ['data','count']],
>     dirty: { msg: true },
>     value: { data: [1,2,3], count: 3 }
> }

(We leave out `running` and `fns` since they are not useful to see).

Notice how we can tell directly what is happening: what depends
on what, what will be updated on next access, and what the values
are now. This is the core of reactivity and `auto` makes these
explicit.

## environments

### npm and node

to use via npm install with `npm install @autolib/auto`
(the npm module is specified to use `auto-commonjs.js`)
and then, for example, put in `test.js`

```js
const auto = require('@autolib/auto');

let $ = auto({
    data: null,
    count: ($) => $.data ? $.data.length : 0,
    msg: ($) => "Got " + $.count + " items"
})

console.log($._);
```

Now running `node test.js` you should see

```
c:\Users\karlp\test-auto>node test.js
{ deps: {}, dirty: { count: true, msg: true }, value: {} }
```

### es6 module

for this simply use the right lib in the import, i.e.

```js
const auto = import('auto-es6.js');
```

and to test you could use, for example, `deno`
i.e. `deno run test.js`

### browser

to use directly in a `<script>`
tag use `auto-no-import.js`.
`tests/test.html` has an example of this:

```html
<!doctype html>

<html lang="en">
<head>
  <meta charset="utf-8">
  <title>auto test</title>

<script src="../auto-no-export.js"></script>

</head>

<body>

  <script>
    let $ = auto({
        data: null,
        count: ($) => $.data ? $.data.length : 0,
        msg: ($) => "Got " + $.count + " items"
    })

    console.log($._);
</script>

</body>
</html>
```

to see this working run `npx http-server` from the root repo folder
and then browse to `http://localhost:8080/tests/test.html`
and you should see `Object { deps: {}, dirty: {…}, value: {} }`
printed to the browser console (press CTRL-SHIFT-k in firefox).


## integrations

**auto** was originally developed to be used with Svelte (see below)
so works well with it. other integrations i.e. React, Vue and Mithril
still need to be looked at.

### svelte


## development

this library started as an attempt to create MobX-like observables
in Svelte. this was based largely on a video by MobX's creator.
see the [old readme](docs/old-readme.md) for more. then a new
approach was started and written from scratch in a day which
was documented in [extreme detail](docs/devlog).