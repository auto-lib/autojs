
## ok but what is auto

in modern parlance reactivity is about functions which run
themselves [docs/what-is-reactivity.md](docs/what-is-reactivity.md).
**auto** takes these functions and let's them do one thing:
update a value.
[docs/automatic-values.md](docs/automatic-values.md).
and just as importantly each value has only one function
[docs/one-value-one-function.md](docs/one-value-one-function.md).

> i really don't like the term _automatic values_. somehow it
> reminds me of ... i dunno, i cliche? it's technically spot on
> but i feel myself tuning out and assuming this is old hat...
> which it is, to be fair. but i want to word it differently
> so as not to have it be stale.

> this really all seems almost trite: because you define everything
> in terms of a javascript object, and each object has a set of
> 'values' or 'keys', then of course each value is associated
> with just one function ... though it's also somehow really
> important to be explicit about this: the fact that every
> value in your state has only one code path associated with it,
> and it's right there - you always know _exactly_ what made
> the value the way it is. this ... is a major part of what i
> realised in making the dynamic front-end: if you have a global
> variable i.e. one that multiple parts of your app uses
> and those variables can be changed by different parts of your
> code ... then you really are screwed when you are debugging,
> because you can never see what happened .... this ... might be
> the real core of this all. which is what? `global values
> must have just one piece of code which determines them` ....
> erm and also `you should never have to decide when to
> run this piece of code` .... that's a catch phrase right there.

## a better attempt

let's break it down like this. the entire setup of an **auto**
reactive global state is through a flat object

```js
var obj = {
    data: // ...,
    count: // ...,
    blerg: // ...
}
```

where every _key_ in the flat object will become your _global state values_

```js
// somewhere in your code
$.data = '...'
if ($.blerg == 21) do_something();
```

ok. so that's it - it just an object. so what? you could just say
`obj.data = '...'; if (obj.blerg == 21) do_something()`. what's
the point of using **auto**. well when you wrap the object

```js
var $ = auto(obj);
```

then any functions you assigned to any of the object keys
represent _how that key value is produced_ e.g.

```js
var obj = {
    data: null, // not a function i.e. just a plain value you can get/set with impunity
    count: ($) => $.data ? $.data.length : 0, // this is saying "here is how you produce the 'count' value
}
```

look at it like this: let's say you had some complicated function
you used to produce some important value that was used throughout
your application. how would you do this? well, you would create
a function

```js
var important_value_used_everywhere = function_to_produce_important_value();
```

ok but now you have a _lot_ of problems:

 - how do you pass this value around?
 - what values does this function use?
 - when do you re-run the function to reproduce that value?

ok, let's say you have some global variable `charts` describes what
you'd like to draw in your interactive web app. and let's say that
you have several buttons in your ui that makes changes to the
chart (e.g. `add-chart`, `convert-to-usd` etc). what does the program
flow look like?

 1. user clicks button `convert to usd`. what happens now?

well one way to do it is to call a function called `convert_chart_to_usd()`:

```js
let convert_chart_to_usd = () => {

    chart.points.forEach( point => point.value *= currency_to_usd() );
}
```

ok - we loop through all the points in the `chart` object (which is
global). each point has a `value` (the y-value in the chart).
and we multiply it by the current conversion rate.

the problem is we have permanently changed this global object - what about
if we want to reverse it?

```js
let unconvert_chart_to_usd = () => {

    chart.points.forEach( point => point.value /= currency_to_usd() );
}
```

i suppose that would work. but what happens if we have multiple charts?

```js
let convert_charts_to_usd = () => {

    charts.forEach( chart => {
        chart.points.forEach( point => point.value *= currency_to_usd() );
    })
}
```

that works fine but what happens when we want to add/remove a chart?

```js
let add_chart = (chart) => {

    charts.add(chart);
}
```

hmmm, what happens if we did that _after_ running `convert_chart_to_usd()` ?
the new chart wouldn't be converted. how do we solve this?

we could change our convert function to take a chart

```js
let convert_chart_to_usd = (chart) => {

    chart.points.forEach( point => point.value /= currency_to_usd() );
}
```

then we call that from the convert on the global object

```js
let convert_charts_to_usd = () => {

    charts.forEach( chart => convert_chart_to_usd(chart) )
}
```

and finally we have to use this in our add_chart function

```js
let add_chart = (chart) => {

    charts.add(convert_chart_to_usd(chart));
}
```

hmmm, this is wrong - ok, `add_chart` needs to know if we are
currently converting. so we need a state variable like `convert_to_usd`.
then we can say

```js
let add_chart = (chart) => {

    if (convert_to_usd) convert_chart_to_usd(chart);
    charts.add(chart);
}
```

sure but what about our original problem: the button?
what happens when you click (or toggle) `Convert to USD` ?
well of course we need to update our state variable:

```js
let toggle_convert_to_usd_button = () => {

    convert_to_usd = !convert_to_usd; // global

    // ... now what?
```

ok for the actual function ... well i suppose we have to
use `convert_chart_to_usd` since `add_chart` uses it.
but we can go through and convert everything.

```js
let toggle_convert_to_usd_button = () => {

    convert_to_usd = !convert_to_usd; // global

    charts.forEach( chart => convert_chart_to_usd(chart) );
```

right and so now we need to use the `convert_to_usd` global
in our convert function:

```js
let convert_chart_to_usd = (chart) => {

    chart.points.forEach( point => {
        if (convert_to_usd)
            point.value *= currency_to_usd();
        else
            point.value /= currency_to_usd();
     } );
}
```

hmmm... no, this is really bad design; this function does
not do what it says. if you by mistake ran it twice you
would be screwed.

let's go back to what we have: two features

1. "show in usd" toggle
2. add chart button

i suppose this isn't so complicated: the toggle affects a global,
`convert_to_usd`. it also converts the values on the fly.
the add chart button then just uses the toggle to convert
if needs be the added chart. no biggie.

so what's the issue? well the issue is that with just two
features we are already managing everything ourselves.
really it doesn't seem like a lot but that's because it's
just _two features_. it's the whole too-much-self-belief
issue i see all the time (in myself especially). don't believe
me? ok, let's add another feature then!

let's say we want to view just a portion of the chart - a window.
the chart is really long but we have a mini-window that let's
you zoom in, so-to-speak. so you have a `start` and `end`
global and you want to have a variable called `windows`
assigned to each chart which lists the points which fall between these two:

```js
let get_windows = () => {

    charts.forEach( chart => {

        chart.windows = []; // reset
        chart.points.forEach( point => if (point.x > start && point.y < end) chart.windows.add(point) )
    }
}
```

ok. so now the interface: we have two sliders which each set `start` and `end`,
respectively. what should they do?

```js
let move_left_slider = (val) => {

    start = val;
    get_windows(); // refresh
}

let move_right_slider = (val) => {

    end = val;
    get_windows(); // refresh
}
```

we have to re-run `get_windows()` to make sure the window
values are correct. but we also need to do it whenever
we add a chart:

```js
let add_chart = (chart) => {

    if (convert_to_usd) convert_chart_to_usd(chart);
    charts.add(chart);
    get_windows();
}
```

what about the usd toggle itself? well it needs to go through
and update the window values too:

```js
let convert_chart_to_usd = (chart) => {

    chart.points.forEach( point => {
        if (convert_to_usd)
            point.value *= currency_to_usd();
        else
            point.value /= currency_to_usd();
     } );

     chart.windows.forEach( window => {
        if (convert_to_usd)
            window.value *= currency_to_usd();
        else
            window.value /= currency_to_usd();
     } );
}
```

i suppose we could pull those sections out into a function,
i dunno `convert_section_to_usd(section)` ?

man do i feel like i'm rambling myself into a corner.

ok, but again - so what?
the point this - can you not see how much we are managing now?
how many parts all connect to one another, how easily things
can break because one disparate piece falls over?
you are creating work for yourself. you've made a monster, a
machine where in a week's time you will have no idea how things
work, you will have to re-learn what's going on each time
something goes wrong.

let me put it this way: this is what you have now:

 - global variables
 - functions
 - wiring

by wiring i mean you have functions which update
values and call other functions, which may or may
not update a global variable.

> why is this so difficult for me to clarify

with **auto** this is what you have:

 - global variables, each possibly with a function

that's it. that will replicate all you have above.
except what you don't have is some convaluted
mess, some special thing you knew back when and
that seemed like a good idea at the time. designing
with blinkers on.

## older attempt

**auto** is a reactivity tool where you connect _values_ to _functions_.
so you create an object

```js
var obj = {
    name1: null,
    name2: 'hello',
    name3: ($) => /* some function */
}
```

and pass it to auto

```js
var $ = auto(obj);
```

and then use `$` in all your dealing

```js
$.name2 = 'jim';
if ($.name3 == 20) console.log("hmmm");
```

but here is the important point: `each function must return a value`.
and this return value is the value of said value...

let's try again: **auto** connects `functions` to `names`. so
in the above `name3` will _always_ have the value corresponding
to it's function. this feels like it can be said a lot more straight-forwardly.

typically in "reactive programming" ... i mean, reactive programming
is really about island functions:

```js
(x) => 2*x
```

so ... you define a function, and don't have a reference to it.
how bizarre - it just sits there and nobody knows about it. in
ordinary programming ... what happened in the development of
computers is someone said "hey let's have functions and then
**call** them" and that seemed like a good idea and it is.
but what about if we don't want to call the function - what
if we want to call the _variable_ .... :|

> that's actually a great tag-line for **auto** - call the variable.
should be a t-shirt

in what people call "reactive programming" today really all it
amounts to is functions that auto-run - a piece of code that
somehow knows, or someone knows, that it is referencing some
values and knows it needs to ... it will have a different
effect ... that one of it's variables change. so:

`function` <- `[variable,variable,variable]`

right. ok, so all functions depend of variables (well functions _can_
depend on variables, or reference variables. better - reference).
and reactive code is basically the statement "what if we have functions
which re-run themselves whenever their referenced variables change?"

and the answer is - well a real nightmare, is what happens. too
much cleverness or assumed cleverness.

anyway, and the point of **auto** is saying "hey, no that is pretty
cool but as long as the function _doesn't change anything_ except
for **one variable** and that variable is only _ever_ changed
by that **one function**.

> hmmm ... `one function one variable` is another great tag-line
> for **auto**. where does that come from? one woman one child?
> that's weird... why would women only be allowed one child?

## the laws of auto

**auto** is reactivity as we know it today except for one rule:

 - `one function one variable`

so any state is determined by only one function - nothing else
is allowed to access it! you cannot access it directly

```js
let $ = auto({data: ($) => 10})
$.data = 20;
```

```
fatal: you cannot set the value of a function (data)
```

and neither can other functions access it

```js
let $ = auto({
    data: ($) => 10,
    func: ($) => $.data = 20
})
```

```
fatal: function func is trying to set the value of a function data
```

and functions can't set plain values either!

```js
let $ = auto({
    data: null,
    func: ($) => $.data = 10
})
```

```
fatal: function func is trying to set value data
```

so ... what on earth does this mean?

 - from the outside you can only change on thing: plain values
 - from the inside functions do just one thing: return a value

and that value is ... man i need to stop rambling...