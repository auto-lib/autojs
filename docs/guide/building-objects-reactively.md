
## building objects reactively

often one needs complex objects as part of the state.
the most direct way of building them using wrapped
functions is to produce them all in one shot:

```js
let $ = auto({
    totals: ($) => {

        let names = /* ... */;
        let prices = /* ... */;

        return { names, prices };
    }
})
```

we could use use other wrapped functions
for each object component

```js
let $ = auto({
    names: ($) => /* ... */,
    people: ($) => /* ... */,
    totals: ($) => ({
        prices: $.names,
        people: $.people
    })
})
```

however what if we want to construct a list
of objects?

```js
let objs = [
    {
        names: [],
        people: [],
        totals: []
    },
    {
        /* ... */
    }
]
```

```js
let $ = auto({
    totals: ($) => {

        let res = [];
        $.something.forEach( item => res.push({
            names: getNames(item),
            prices: getPrices(item),
            people: getPeople(item)
        })
        return res;
    }
})
```

the only problem is we generate the entire
list of objects every time something changes.
what if we wanted just the parts that have
changed to update?

one way is to create lists of each component and then
piece them together:

```js
let $ = auto({
    names: ($) => /* ... */,
    prices: ($) => /* ... */,
    people: ($) => /* ... */,
    accounts: ($) => names.map( (name,i) => ({
        name,
        prices: $.prices[i],
        people: $.people[i]
    }),
})
```

because we are just point to arrays as references
whenever a subcomponent changes all that the main
object does is point to a new array.

> it might be worth looking into a syntax that would
> allow specifyingt these two things: arrays and objects.
> can't imagine though what that would look like?
> the rule is that each variable name has their own
> function ... but what if ...

> the issue is simply caching - auto should tell when
> only a sub-part needs updating i.e. not the whole
> function. but to do that we need to indicate to
> it somehow what the sub-parts are (otherwise
> how would it know which values to cache...? is that
> necessary?)

i mean, presumably we could have a convention that
replicates the above example: so it creates these
arrays in the background and ties them into an object.
so it's a way to map over some variable and for each
one generate a list, based on some function...

```js
let $ = auto({
    accounts: ($) => names.map( name, => ({
        name,
        prices: ($) => /* some function with name? */,
        people: ($) => /* another function with name? */
    })
})
```

and ... auto sees that there is a function in there?
or it sees there is a map? i dunno. i can imagine
we could come up with some convention but how will
it be clean?

```js
let $ = auto({
    names: ($) => /* ... */,
    'accounts[names]': ($,name) => {
        name,
        prices: ($,name) => /* ... */,
        people: ($,name) => /* ... */
    }
})
```

hmmm ok that doesn't look too bad ...
and i think that could work.
but is it too clever for it's own good?
will too many of these mess up being
able to understand things intuitively?

i suppose the rule could be: all weird
features come in naming conventions;
just need to look at the list of "ok
here are the conventions" and then any
extra features just look at that...
maybe even have a pluggable architecture...

so in this case the manual will be like:

### building arrays of objects

use the name `var[list]` to map over
`list` to produce an array of objects
called `var`. auto will create lists
for each field of your object in the
background so they will only change
if your original `list` changes ...

> hmmm ok so where is the caching? ...
> ok, the caching is all in the
> functions for each part i.e. `prices`
> and `people`. so yes - if `names`
> changes everything must be re-run
> but ... what if `prices` uses some
> variable like `conversion_rate`
> then only the `prices` list will
> be updated...

-----------

ok again, is this all just too clever
for it's own good? all this work just
to save on some caching? i suppose
that is the real problem in computer
science... but putting it all under
the umbrella of "variable name convensions"
is good. but this is just one case -
a list of objects. what if you want an
object with a list of objects? what then?
is this a generic tool ... or just a
one-shot? could we develop a variable
name convension which goes as deep
as you want?

this is really gonna screw up my
"look how tiny this library is" thing...