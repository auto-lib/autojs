**auto** is a reactivity tool for javascript.

## how it looks

just one keyword `auto` is used like this:

```js
let $ = auto({
    data: null,
    count: ($) => $.data ? $.data.length : 0,
    msg: ($) => $.data + " has " + $.count + " items"
})
```

## what this means

the totality of **auto**'s syntax is:

 - `auto` wraps a plain object
 - each object member pairs with either a value (e.g. `null`) or a function
 - each function takes in the wrapped object `$` as input, returns a value and can refer to any other members via the wrapped object

> actually i've left out two things: _auto blocks_ and _subscribe_ which i will document soon

## usage

you use the returned wrap as a normal object:

```js
$.data = [1,2,3];
console.log("msg =",$.msg);
```

and everything updates automatically i.e. the above prints

```
msg = 1,2,3 has 3 items
```

## why

> it's worth reading [docs/why-reactivity.md](docs/why-reactivity.md)
> and [docs/bad-reactivity.md](docs/bad-reactivity.md) first.

besides how reactivity can help in general
what distinguishes **auto** from other reactive
libraries?

### simple

the entire **auto** library is 100 lines long,
has no external dependencies and uses just
five variables to manage its internal state.
you can understand the whole thing.
see [docs/internals.md](docs/internals.md)
for a walk-through of the code and also
[docs/devlog](docs/devlog) 
for a blow-by-blow account of its development
and design choices.

### explainability

**auto**'s internal variables are
so easy to interpret that at any point you
can understand behavior. they can be
accessed in a special variable `_`.

```js
console.log($._)
```

outputs something like

> {
>     dep: ['count': ['data'], 'msg': ['data','count']],
>     dirty: { msg: true },
>     value: { data: [1,2,3], count: 3 }
> }

see [docs/explainability.md](docs/explainability.md)
for details on these three (the other
two are not in `_` because they aren't really useful for debugging).

## environments

you can use **auto** with node/npm,
as an es6 module and directly in the browser.

### npm and node

to use via npm install with `npm install @autolib/auto`
and then you can import it with `const auto = require('@autolib/auto';`.
see [docs/npm-and-node.md](docs/npm-and-node.md) for
a detailed walkthrough.

### es6 module

for this simply use the right lib in the import, i.e.

```js
const auto = import('auto-es6.js');
```

and to test you could use, for example, `deno`
i.e. `deno run test.js`. you could use
[docs/npm-and-node.md](docs/npm-and-node.md)
as a template (just replace the import statement).

### browser

to use directly in a `<script>` tag use `auto-no-import.js`.
see [docs/html.md](docs/html.md) for a walk-through.

## integrations

**auto** was originally developed to be used with Svelte (see below)
but other specific integrations with React, Vue, Mithril etc.
still need to be done. however **auto**'s _subscribe_ method makes it easy
to tie it into any existing framework.

### subscribe

todo

### svelte

todo

## development

this library started as an attempt to create MobX-like observables
in Svelte. that original version was based largely on a video by MobX's creator
(see the [docs/old-readme.md](docs/old-readme.md) for more on this).
then a new approach written up from scratch in a day which
was documented with extreme detail in [docs/devlog](docs/devlog).