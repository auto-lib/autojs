`auto` is a small tool for simplifying the logic in your web apps.

## tutorial

you use `auto` like this

```js
let _ = auto({
    data: null,
    count: (_) => _.data ? _.data.length : 0,
    msg: (_) => _.data + " has " + _.count + " items"
})
```

everything updates according to the relationships defined

```js
_.data = [1,2,3];
console.log("msg =",$.msg);
```

```
msg = 1,2,3 has 3 items
```

writing logic like this avoids [sequence orchestration](docs/sequences.md)
which is a major source of software complexity.

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
