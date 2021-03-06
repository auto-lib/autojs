## explainability

### other reactive tools

because of how most reactive libraries
are designed debugging why things occurred as
they did is neigh impossible (caveat: i actually
do not have experience in using MobX or rxjs
but i have a _ton_ of experience trying to
use the reactivity in SvelteJS, hence this library!,
so i may be wrong about this... :|) you never
know what caused things to execute in the order
they did, or even what order they ran in.

### auto

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