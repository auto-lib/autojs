`auto` is a tool for eliminating [orchestration](docs/orchestration.md) in your
javascript codebase.

## mini tutorial

you define all the relationships between your variables
using functions and let the library ensure everything
is updated when something changes

```js
let _ = auto({
    data: null,
    count: (_) => _.data ? _.data.length : 0,
    msg: (_) => _.data + " has " + _.count + " items"
})

_.data = [1,2,3];

console.log("msg =", _.msg);
```

```
msg = 1,2,3 has 3 items
```

you tie this to your view library using subscriptions

```js
_['#'].count.subscribe(v => console.log('count is',v));
```

for asynchronous code you use a second `set` parameter
for when the data comes back

```js
let _ = auto({
    data: (_, set) => 
        fetch('https://cats.org/yummy.json')
        .then(res => json.parse(res)
        .then(dat => set(dat))
        .catch(err => console.trace('error fetching cats:',err))
})
```

## installation

you can install `auto` via npm with the command
`npm install @autolib/auto`. see [docs/environments.md](docs/enviroments.md)
for other options.

## manual

`auto` has a lot of pecadillos that are yet to be detailed in the [docs/manual.md].

## tutorial

a step-by-step tutorial is being planned that will show `auto` integrated with
Svelte, Vite and Tailwind CSS.

## development

`auto` started as an attempt to create MobX-like observables
in Svelte with a design based on a video by MobX's creator.
see the [docs/old-readme.md](docs/old-readme.md) for more on this.
a new approach was written in a day which was documented with extreme 
detail in [docs/devlog](docs/devlog).
