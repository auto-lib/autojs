
## auto architecture observations

a few things worth nothing about how **auto** behaves

### `setter` doesn't react

`setter` is the internal method called when you set
a value in **auto** [manual/internals.md](docs/manual/internals.md).
what's interesting to note is that this method never
calls any of the functions you have defined:

```js
let setter = (name, val) => {

    if (fatal.msg) return; // do nothing if a fatal error occured

    if (running) fail("function "+running+" is trying to change value "+name)
    else {
        if (value[name] !== val)
        {
            value[name] = val;
            delete_deps(name);
            run_subs(name);
        }
    }
}
```

all that happens is the dependencies connected to the value
are deleted which in a way marks them as needed an update.