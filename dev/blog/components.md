
# components

i want to be able to split my app up into components.
and i want to have their behaviour be defined
so that i can change the implementation ...

and i want this all to be ... completely separate from
the display - so the display, like in reactjs, is just
a one-way function that takes in ... well, the variables
it needs to render and ... the function it needs to
make updates (have side effects).

> what about partial updates?
> because we have several variables
> we can do partial updates on our own ...

so for example _button_ could look like this:

```js
let button = {
    input: ['one','two'],
    output: ['three'],
    effects: ['four','five']
}
```

`inputs` are the variables it needs going in,
`outputs` are the transformation _specific to this component_.

this is an important point - we don't just want this massive
global scope.

_and_ we want to have, well ... the ability to make several
copies of the same thing, like a switch ...

`effects` are the list of ... global scope variables this
component can effect ...

> hmm but what about names - how can we have the same global
> name for a component that is being copied several times?
> we'd have to have a map from the input to the global
> scope ... hmmm why is that so messy ...

it feels like all of this really is ... can be implemented
using some kind of simple ...

we want checks on each - checks on the inputs, checks on the
outputs. and now we have this ... function that you call
to make the effect, probably just something like `set()`,
and that just wraps something like

```js
let set = (name,value) => {
    if (name != 'four' && name != 'five') console.log('this component can only set value named four or five');
    // ...
}
```

## example

ok. so in my work i have these drop-downs that need to be populated
correctly. and the logic behind whether they are is very complex.
and i want to have checks in place that make sure they are
behaving correctly, and be able to keep re-writing the program
ad nauseum and still check that each component is doing what it
should.

so i have a drop-down called `Currency`. and it lists the currencies
you can select which will convert whatever chart you are looking
at into the currency you chose. however, that list, the drop-down
list, changes based on the price data you have loaded, on the
conversion rates available, and what charts you are viewing.

## interlink

but it's more difficult than that - we also want to have a set
of interacts we can track, and that is across components.
so for example, if we select one of the drop-downs we want to
see what happens to other components ...

how do we specify that?

well, we would have to first say "ok we have these variables
for data and conversion rates and the chart names" and then
say "these should be the values in the currency drop-down"
and then "if you click on USD then this should be the value
of the latest price component" ...

how to specify this? in a way that ... has nothing to do
with a user interface, it's just values ...

> the point here is there is no need for a renderer,
> we don't have to worry about setting up an end-to-end
> tester. if we have the rule that the interface is
> rendered completely from variables - if there is no
> logic in it then we just need to check these values
> to be sure it's all working ...

again - i want to be able to quickly specify behavior,
and clearly. if i'm told "the currency drop-down should
not display at all if the chart data is from Vietnam"
then i want to be able to specify that.

which is interesting - because for that behaviour i
didn't specify ... the data variable ... for end-to-end
tests you specify all the inputs but in this case there
is no need to specify that data ... hmmm ...

but the tests wouldn't make sense without some starting
data ... ???

it's interesting - it's really all ... just setting values.
set this value. set that value. and it's a sequence ...

## want

we want a particular set of data and a particular
set of behaviours (applied to a particular
set of components)
to produce a particular set of results...

data. components. behaviour.

the behaviour is per-component.
the data is sort of global.
you attach each component to
the global state.

and then you have to attach all of this
to your ui library somehow - in my case
svelte.

ok. so you have a set of data - you can
define that. and then you have a set
of components - you can define that too.
those are separate. and then you have
a set of behaviours - that has to be
component-set specific. so each component
must have a name, a name specific to the
set you are making, since you can have
say three drop-downs ...

and then presumably the ... component-set
is ... well you instantiate a set of
variables, each of which have behaviours ...
and this is all just variable names ...

let's write it out.

```js
let data = {
    name: 'karl',
    age: null,
    msg: _ => `karl is ${_.age} years old`
}
```

data i suppose is just a normal store...
hmm ...

what do 'components' look like?

```js
let chart = {
    lines: null
}
let dropdown = {
    values: null
}
```

we want to define:
- what values are 'inputs'
- what values are 'outputs'
- what are intermediate values (i.e. not important in testing)
- what can a component 'do' i.e. what global values does it set ...

and i suppose we want to separate these -
so we define the component structure
differently, and then we just pass in ...
an auto object that should observe this
behaviour ...

maybe for inputs we define it with the name
and the check function at once:

```js
let dropdown = {
    inputs: {
        currencies: v => typeof(v) === 'Array'
    },
    outputs: {
        values: v => typeof(v) === 'Array'
    },
    actions: {
        currency: v => typeof(v) === 'string'
    }
}
```

then we can check various things:
 - that the component only ever reads from the 'input' list
   of values from the global state
 - that only the output values are ever read from the
   component
 - that the component only ever tries to change
   the action names in the global state ...

and then for a test we specify the global state,
attach the component(s), and then specify a list
of actions (which is a component and a name,
a name that must be in the actions list, and
a value).

```js
let test = {
    data: {
        // ...
    },
    components: {
        dropdown: 'dropdown',
        chart: 'chart'
    },
    actions: [
        {
            component: 'dropdown',
            action: { currency: 'usd' }
        }
    ]
}
```

i suppose we can specify the expected results
in two ways: after each action

```js
let actions = [
    {
        component: 'dropdown',
        action: { currency: 'usd' },
        result: {
            name: 'in dollars'
        }
    }
]
```

or after the whole thing.

## in or out

not sure if this should be part of the
auto library or if it is something separate.

of course, if there is an obvious way to
change auto to accomodate this cleanly ...

i think i have to try implement it before
i can see what that might be.

## versioning

what if i change the definition of a component?
then all the tests need to be re-written.

but if i then do that ... then all this working
code will be over-written. and you won't be able
to see it cleanly that it has occurred.

to have each component have a version,
like a number, and then you have a directory
for the definition and tests ... each with
a list of files ...

of course then you have to specific somehow
what version you want when you use a component
elsewhere.