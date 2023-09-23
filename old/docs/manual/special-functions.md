
## special functions

> not sure if _special functions_ is the best term

as mentioned in [manual/syntax.md](docs/manual/syntax.md) **auto**
syntax is quite simple: name and (value or function):

```js
let $ = auto({
    name1: val1,
    name2: val2,
    name3: function1,
    name4: function2
})
```

however, in order to make things clean extra features
are encoded by using special names for functions.
right now just one convention is used: that of putting
a hash symbol `#` at the start.

```js
let $ = auto({
    data: null,
    '#print': ($) => console.log('data =',$.date);
})
```

so starting with a hash means "ok this is a function
however there is no value it is going to save out".
i want to use the term _no side effects_ but i'm 
using that to explain what **auto** is for so it
would be confusing.

if you look in the code a name that starts with `#`
just means "don't save out any values". so you
can call them anything you like e.g. `#notify metrics api`
which is useful because you can debug it easily
when printing out the internals.

### specific hash names

i've got one specific hash name `#fatal` which
is what to do when there is a fatal error.
it still doesn't write to a value. originally
i put that in so that the tests were clean - they
didn't log to the console when i was checking
if a fatal error occurred. but i like how it works,
you can tie in your own responses to errors.

i also think it may be worth looking at other
conventions. one i thought would be very helpful
is adding an asterix would print out when the
value changes ... or maybe just `#data` would
react when `data` changes so you can decide
how to print it out (this is almost exactly
how the subscriptions works...).
