**auto** is a reactivity tool for javascript.

## how it looks

**auto** has just one keyword `auto`
which is used like so:

```js
let $ = auto({
    data: null,
    count: ($) => $.data ? $.data.length : 0,
    msg: ($) => $.data + " has " + $.count + " items"
})
```

so explicitly:

 - `auto` wraps a plain object
 -  each object member refers to either a _value_ (e.g. `null`) or a _function_
 - _functions_ take in the wrapped object as input `($) => ...`
 - _functions_ return a value and can refer to any other members

## why

it's worth reading (why reactivity)[docs/why-reactivity.md]
and (bad reactivity)[docs/bad-reactivity.md] first if you haven't
already, but besides how reactivity can help in general
what distinguishes **auto** from other reactivity
solutions?

### explainability

with **auto** you can _always_ tell why things
occur where-as other tools are a black-box
making debugging a nightmare.
see (explainability)[docs/explainability.md]
for details.

### simple

the entire **auto** library is 100 lines long,
it has no external dependencies and uses just
five variables to manage its internal state.
it is thus very easy to understand completely
how it works. see
[docs/internals.md](docs/internals.md)
for a walk-through.
and for another perspective look at the [devlog](docs/devlog) for a
blow-by-blow account of its development.

## environments

you can use **auto** with node/npm,
as an es6 module and directly in the browser.

### npm and node

to use via npm install with `npm install @autolib/auto`
and then you can import it with `const auto = require('@autolib/auto';`.
see (docs/npm-and-node.md)[docs/npm-and-node.md] for
a detailed walkthrough.

### es6 module

for this simply use the right lib in the import, i.e.

```js
const auto = import('auto-es6.js');
```

and to test you could use, for example, `deno`
i.e. `deno run test.js`. you could use
(docs/npm-and-node.md)[docs/npm-and-node.md]
as a template (just replace the import statement).

### browser

to use directly in a `<script>` tag use `auto-no-import.js`.
see (docs/html.md)[docs/html.md] for a walk-through.

## integrations

**auto** was originally developed to be used with Svelte (see below)
but other specific integrations with React, Vue and Mithril etc.
still need to be done. however **auto**'s _subscribe_ method makes it easy
to tie it into any existing framework.

### subscribe

todo

### svelte

todo

## development

this library started as an attempt to create MobX-like observables
in Svelte. that original version was based largely on a video by MobX's creator
(see the [old readme](docs/old-readme.md) for more on this).
then a new approach written up from scratch in a day which
was documented in [extreme detail](docs/devlog).