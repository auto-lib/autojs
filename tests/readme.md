# tests

each file in this directory is another test
and looks like `001_check_something.js`,
and each of these files exports the same
object structure:

```js
export default {
    obj: {

    },
    fn: ($) => {

    },
    _: {
        dep: [],
        dirty: [],
        value: []
    }
}
```

so `obj` is the state object with derivated values / auto blocks,
`fn` is the function to run on this once it's been `wrap`ed,
and `res` is the `_` is what the exact internal state
of the wrap should be once `fn` has been run. so this is how
each test is run:

```js
import wrap from '../wrap.js'; // auto?
import test from './001_check_something.js`;

let $ = wrap(test.obj);
test.fn($);
assert_same(test._, $._);
```

that's it. as mentioned before, this is a _robust_ check because
it is confirming the entire internal state of the wrap.

here is an example:

```js
export default {
    obj: {
        data: null,
        get count() { return this.data ? this.data.length : 0 },
    },
    fn($): {
        $.data = [1,2,3];
    },
    _: {
        dep: ['count': ['data']],
        dirty: {},
        value: { data: [1,2,3], count: 3 }
    }
}
```

