
# 035 reintroducting inner objects

turns out i was right - i need inner objects
in order to make the dom work nicely.

...

it looks like what i really need,
unfortunately ... is namespaces.
or ... scope. so...

```js
let _ = auto({
	x: 10,
	y: (_) => _.x * 2,
	inner: {
		z: (_) => _.y * 4
	}
})
```

for the inner variable we could
create a new auto object. but
the problem is that object is
going to say "unknown variable `y`".
so ... maybe we should then bubble
up to the parent objects until you
find the variable (including the
current 'scope').

then i could do something like
this when i'm doing dom manipulation

```js
let _ = auto({
	name: 'karl'
	parent: null,
	el: document.createElement('div'),
	ad: (_) => _.parent ? _.parent.append(_.el) : []
	i0: {
		parent: null,
		el: document.createElement('p'),
		tx: (_) => _.el.innerHTML = 'Hello ' + _.name
		ad: (_) => _.parent ? _.parent.append(_.el) : []
	}
})
```

the issue is how do we make the inner `parent`
refer to the object above it?

we could just ... have this be a feature of
auto - say that `parent` is a special variable
that refers to what is above. then we would say

```js
{
	ad: (_) => _.parent.el.append(_.el)
}
```

since that would now refer to the variable we
want.

feels very hacky, very browser-dom specific.

also - how do i ensure order? i want to make
sure that a whole list of children is added
in the correct order ... i think we could...
hmmm ...

how do we implement this parent variable?
and the scope? i guess we just save the
auto variable as a value?

let's make a test, as always

```js
let _ = auto({
	w: 10,
	x: (_) => _.w * 2,
	inner: {
		y: 30
		z: (_) => _.x * _.y
	}
})
```

but what will the value look like?
i guess in the test evaluation we should
drill down if we find an object value ...

> so all objects are assumed to be auto?
> what if you want object values in your code?

> it shouldn't matter. the values will still
> be accessable as per normal ... i think
> (will you get back an object if you ask
> for it?)

> ok - we do a recursive search through
> the object. if we find any members that
> are functions, well - sorry, you're not
> getting that object back ... or maybe
> you do anyway when you refer to it ...

