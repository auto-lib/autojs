what if we allow adding pre and post to any variable like

```js
let _ = auto({
    x: 10
})

_['*'].x.pre( (v,err) => { if (v<0) err('x cannot be less than 0'); })
```

i'm assuming here `pre` adds a function i.e. there are a list of functions
that for every variable run ... and then if `err` is called we don't
run the function?

## many functions

it seems a bit hacky. it's not as clean as simply 'one function
per variable'. it seems quite specific.

also, you can implement this kind of behavior yourself with
a naming convention

```js
let _ = auto({
    '*x': 10,
    x: (_,set,err) => {
        let v = _['*x'];
        if (v<0) err('x cannot be less than 0');
        else return v;
    }
})
```

so we have a control variable ... which you will then have to
use when accessing from the outside, which might be confusing ...

