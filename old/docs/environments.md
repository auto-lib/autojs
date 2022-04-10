## environments

each version of **auto** is in the root folder:

 - `auto-commonjs.js`
 - `auto-es6.js`
 - `auto-no-export.js`

they are all the same except for the last line (the export statement).

### npm and node

run `npm install @autolib/auto`
and then import with `const auto = require('@autolib/auto');`.
see [docs/npm-and-node.md](docs/npm-and-node.md) for
a walkthrough.

### es6 module

simply use the right, i.e. `const auto = import('auto-es6.js');`
to test you could use `deno`
i.e. `deno run test.js`. see
[docs/npm-and-node.md](docs/npm-and-node.md)
for a template - just replace the import statement.

### browser

in a `<script>` tag link to `auto-no-import.js`.
see [docs/html.md](docs/html.md) for a walk-through.