
# resolve

ok so ... the easiest thing to do
is to have a new structure called
`resolve` which simply maps the
variables for a particular function
to a new name:

```js
let resolve = {
	'inner.x': {
		'y': 'inner.y',
	}
}
```

this is for this situation:

```js
let _ = auto({
	x: 10,
	y: (_) => _.x * 2,
	inner: {
		w: 20,
		z: (_) => _.y * _.w
	}
})
```

so inner refers to both the outside `y`
and in inner `w`, which will be stored
thus:

```js

let fn = {
	y: /* ... */,
	inner.w: /* ... */,
	inner.z: /* ... */
}

let value = {
	x: 10,
	y: 20,
	inner.w: 20,
	inner.z: 400
}

```

## struggling

having a hard time getting this working.
the idea is simple: because the function ...
we can't rewrite the function so it will
always refer to the 'wrong' variable name.
so we have to map it. so that's why the
`resolve` object is per-function: each
function name has a map that converts
the name the function is trying to access
to the name that it actually should use - 
always just adding a prefix ...

it's not that hard initially. however,
what messes with me is i want to use
this to build user interfaces on the
web. and for that ... for that we will
be adding and substracting elements,
which means ... adding and subtracting
from the ... well, from the auto object.
and so ... so we have to re-calculate
all the internal variables.

i haven't really done that. the values ...
the internal structure doesn't really 
change, what changes is just ... values
and dependencies ... but now having
all that change ...

> is it an insane idea to try ...
> build the resolve logic using auto
> itself?

## why?

what is the point of this again?

it's to do this:

```jsx
<div class="blah">
	{ (_) => _.rows.map( row => 
		<tr><td>{row}</td></tr>
	)}
</div>
```

> hmmm mixing div in table, not right,
> i know.

i mean, how else to write out ...
to combine html and javascript?
how else to specify ... to cleanly
resolve a list into a list of elements?
and to specify the html around that
list? or to, say, set the on click
event on an element?

i mean, in that case, in the case of
on click, you can just use normal
event listeners ... which i think
normal html has? and just edit
the global auto object directly.

but ... what we want is to specify
the frame, the 'outside' html ...
and then change it however we
want, with a function, with code.

which is why the jsx approach makes
sense - you are just ... actually
replacing html with javascript code.

i still think it looks ugly:

```jsx
function renderSquare(i) {
    return <Square value={i} />;
}
```

```jsx
let Square = (_) =>
  <button className="square">
    {this.props.value}
  </button>
```

```jsx
let x = _ => <div>Hello {_.name}</div>
```

not sure how it could be cleaner ...
i just don't like the loop
syntax

```jsx
<div>
  {names.map(name => (
    <li>
      {name}
    </li>
  ))}
</div>
```

