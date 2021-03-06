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

## why

> it's worth reading [docs/why-reactivity.md](docs/why-reactivity.md)
> and [docs/bad-reactivity.md](docs/bad-reactivity.md) first.

besides how reactivity can help in general
what distinguishes **auto** from other reactive
libraries?

### explainability

with **auto** you can _always_ tell why things
occur where-as other tools are a black-box
which make debugging a nightmare.
see [docs/explainability.md](docs/explainability.md)
for details.

### simple

the entire **auto** library is 100 lines long,
has no external dependencies and uses just
five variables to manage its internal state.
it is very easy to understand it completely.
see [docs/internals.md](docs/internals.md)
for a walk-through and also the [docs/devlog](docs/devlog) 
which gives a blow-by-blow account of its development
and design choices.

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