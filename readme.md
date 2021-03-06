**auto** is a simple, robust and explainable
reactivity library.

## simple

the entire **auto** library is 100 lines long,
has no external dependencies and uses five variables
to manage its internal state. for a detailed
explanation of how everything works see
[docs/internals.md](docs/internals.md).

## robust

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


## explainable

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

## usage

this is what using **auto** looks like no matter where you are
running it from:

```js
let $ = auto({
    data: null,
    count: ($) => $.data ? $.data.length : 0,
    msg: ($) => "Got " + $.count + " items"
})

console.log($._);
```

however getting the `auto` keyword loaded
depends on the environment you are using.

## environments

there are three versions of the **auto** library in the root folder, each
contained in separate files:

 - `auto-commonjs.js`
 - `auto-es6.js`
 - `auto-no-export.js`

these are all exactly the same file except for the last line
which determines if it can be used with `npm` (and `node),
can be used as an `es6` module, and can be used directly in
a browser:

 - `auto-commonjs.js` for `npm` and `node` (last line is `module.exports = auto;`)
 - `auto-es6.js` for use as es6 module (last line is `export default auto;`)
 - `auto-no-export.js` for use in `<script>` tag (no export statement)
 
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

## development

this library started as an attempt to create MobX-like observables
in Svelte. this was based largely on a video by MobX's creator.
see the [old readme](docs/old-readme.md) for more. then a new
approach was started and written from scratch in a day which
was documented in [extreme detail](docs/devlog).