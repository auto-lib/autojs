
## map chains

what if i want an object where each member is a map
over a sibling?

```js
let obj = {
    var1: [1,2,3],
    var2: var1.map( v => var2_func(v) ),
    var3: var2.map( v => var3_func(v) )
}
```

in **auto** currently i can't reference the
sibling members directly so i have to make
separate lists for each and then stitch
them together

```js
let $ = auto({
    obj_var1: [1,2,3],
    obj_var2: ($) => $.obj_var1.map( v => var2_func(v) ),
    obj_var3: ($) => $.obj_var2.map( v => var3_func(v) ),
    obj: ($) => ({
        var1: $.obj_var1,
        var2: $.obj_var2,
        var3: $.obj_var3
    })
})
```

> what really bums me out is using `$` everywhere.
> i wish i could go into functions, search through
> the variables they reference, and if there aren't
> any in the scope say "hey - check if this variable
> is inside this object i.e. `$`"

i suppose that isn't too messy. another way though
would be to support nested functions:

```js
let $ = auto({
    obj: ($) => ({
        var1: [1,2,3],
        var2: ($) => $.obj.var1.map( v => var2_func(v) ),
        var3: ($) => $.obj.var2.map( v => var3_func(v) )
    })
})
```

that actually doesn't look too bad.