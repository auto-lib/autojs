
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
