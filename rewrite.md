
# rewrite

> 22 Nov 2025

ok i think i know what i want to do ...

## trade portal

> it occurs to me that this is all public ...
> and i'm writing as if it's a personal journal ... hmmm ...

ok. i have a project at work called the trade portal.
i realised this is what i want:

- to know whether code changes broke the charts

break, how?

ok, easy - url -> data -> vis. that's it.
i can easily check if the url (+source) gives the data.

now, how do we trace what changes caused the break?

## blocks, and toString()

this is how i define a block in my channel
experiment:

```js
let a = auto({
    name: 'a',
    state: {
        x: 10,
        y: _ => _.x * 2,
        z: _ => _.x + _.w /* note w isn't here */
    },
    imports: ['w'],
    exports: ['x','y'],
    actions: ['x'], // what can happen to it directly i.e. from outside
    channels: [ch],
    onerror
})
```

so we can literally just do an `md5` on `state.toString()`
to see whether the code for this block changed ... and
we can see the input/output for it ...

## tracing

so we have this simple input, a url ... a string ...
then it gets broken down into parts, that causes a fetch
from somewhere ... then data comes down, we transform it ...
use the url to do all of this ...

and the big concern is always - has this broken one of the
charts ... how can i be sure?

well, if each chart is just a set of numbers / values ...
then i can see, yup this chart looks right ... i just need
a clear way to decide what i'm going to check, what the
structure is of a 'chart' ...

## interleave

and how are the blocks structured? i could just write a
primary block:

```js
auto({
    name: 'chart',
    state: {
        url: null
    },
    imports: [],
    exports: [],
    actions: []
})
```

...

i mean, you make it explicit that it ... just takes in
a url, and outputs the chart data ... right? that
would be good ... but auto is not made to work like
that ...

you want to plug them all in, wire them together ...
the chart object uses the url object ... which i guess
takes in a string and outputs a config ... then you
have the source, we pull in api data ... transform it ...
how do we set this all up?

it would be so great if you could just easily see all
this, very simply, and be able to just swap out the
source for some local thing ... only see the details
you want to see ... break things out into simple
pluggable components ...