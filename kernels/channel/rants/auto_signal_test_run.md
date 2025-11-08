
# auto, signal, test, run

events.
async.

what would a test look like
that included these?

```js
// 024_out_of_order_functions.js
module.exports = {
    state: {
        data1: null,
        func2: ($) => $.func1 ? $.func1.length : ($.data2 ? $.data2.length : 0),
        func1: ($) => $.data1 ? $.data1.length : null,
    },
    fn: ($) => {
    },
    _: {
        fn: [ 'func1', 'func2' ],
        subs: [],
        deps: { func2: ['func1','data2'], func1: ['data1'] },
        cache: { data1: null, data2: null, func1: null, func2: 0 },
        fatal: {}
    },
    should_fail: true
}
```

what about

```js
{
    state: {},
    events: {}
}
```

or what about like in signal?

```js
{
    state: {},
    delayed: {},
    immediate: {},
    hooks: {}
}
```

in `auto` you can make `state`
be reactive. what about putting
that into `immediate` and `delayed`?

> are there better names that _immediate_
and _delayed_ for async? is it async?

