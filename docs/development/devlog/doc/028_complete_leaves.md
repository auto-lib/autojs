# 028_complete_leaves.md

hmmm should be 033_complete_leaves to match with the js...

what happens when you have something which depends on two things...

```js
{
    data: null,
    partners: (_) => _.data.map(),
    grouped: (_) => {
        let res = {};
        _.totals.forEach(row => {

        })
    },
    final_data: (_) => _.partners.map(key => grouped[key])
}
```

what happens when `data` gets updated? well, it's dependents
get updated, and then their dependents. but in what order?

see this matters, because we don't want `final_data` to be
run until _both_ `partners` and `grouped` are updated.

it's a problem when combining two variables which each
connect to a parent higher up.

you can just put in checks to stop weird errors from happening.
but that shouldn't be the problem of the user. plus you're
doing more calculations than you need.

we need a test that makes sure.. well this is how it worked
before - i would basically mark everything as dirty once
a set is called, and then not evaluate anything until
you call a get. which didn't work because of subscriptions...
we needed to make sure those values were updated.

how do you make sure you update things in the right order?
it starts with the set - you take the values dependent
on that guy ... and then you, well...

```
{
    data: [1,2,3],
    func_1: (_) => _.data.length,
    func_2: (_) => _.data.map(d => d + _.func1)
}
```

how do we know that if you set `data` then `func2` will
only run once `func1` has run?

maybe this is only an issue with async code...

## boo

ok so this is failing:

```
// devlog/docs/028_complete_leaves.md

module.exports = {
    obj: {
        data: [1,2,3],
        func_1: (_) => _.data.length,
        func_2: (_) => _.data.length + 10,
        combine: (_) => _.func_1 + _.func_2
    },
    fn: ($) => {
        $.data = [1,2,3,4];
    },
    _: {
        fn: [ 'func_1', 'func_2', 'combine' ],
        deps: { 
            func_1: { data: true }, 
            func_2: { data: true }, 
            combine: { func_1: true, func_2: true } },
        subs: { },
        value: { data: [1,2,3,4], func_1: 4, func_2: 14, combine: 18 },
        fatal: { }
    }
}
```

