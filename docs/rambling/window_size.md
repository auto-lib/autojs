i have a strange problem.

it's a list of periods, really just an array.
and i want to display a window of them,
basically a slice.

[2012,2013,2014,2015,2016]

i have a window size, w, which can be
1,2,3, etc.

what do i need? well i need to know the start
of the window, let's call it s, which is an
index.

so here is the code:

```js
let data = [2012,2013,2014,2015,2016];
let s = 2, w = 3;
let wind = data.slice(s,w);

console.log(wind);
```

which should give `[2014,2015,2016]`;
seems fine.

ok but what happens when the window is bigger
than the entire