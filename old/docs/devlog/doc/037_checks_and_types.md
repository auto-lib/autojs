
# types and checks

it occurs to me that adding types is quite easy:

```js
auto({
	'x:int': 0,
	'y:int': (_) => _.x * 2
})
```

what we need is a way to add checks:

```js
auto({
	'x': 0,
	'y': (_) => _.x * 2
},{
	checks: {
		'x': (v) => typeof v == 'integer',
		'y': (v) => typeof v == 'integer'
	}
}
```

so we add a `checks` object which
has functions for each variable name
which are run before we set the value.

> do we set `fatal` for this?
> we don't want a fatal error, do we?
> that would break everything ...
> perhaps there needs to be a non-fatal
> error added...

my only issue is i don't really need
this in production right now so i can't
test it for myself.

## check classes

in the example above i'm using a special
kind of ... well, syntax to specify a
check _type_ instead of a specific check.
so ... so the auto object would look
like:

```js
auto({
	'x:int': 0,
	'y:int', (_) => _.x * 2
},{
	check_classes: {
		'int': (v) => typeof v == integer
	}
}
```

> don't like the name _check classes_

it's not really a type specifier, then,
but it functions like one - it covers
all types but it also includes a lot
more - it's a lot more powerful than
a type, and yet also simpler - it's
just a function that returns a bool
on the value.

funny how types are such a confusing
subject but you can ... implement
them (and a lot much else) using this
one simple mechanism.

i suppose we could ... have a whole
bunch of these checks added to values
all at once:

```js
auto({
	'x:int:pos': 0,
	'y:int:below(x)': (_) => _.x * 2
},
{
	'check_classes': {
		'int': (v) => typeof v == 'integer',
		'pos': (v) => v > 0,
		'below': (v,w) => v < w
	}
}
```

is that too complex for its usefulness?

we need a term for a kind of soft error - 
an error which means "keep going, but report
this". because when a check fails ...
maybe we just call it "check error" ...

> is there a better word than `check` ?

