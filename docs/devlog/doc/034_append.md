# 034 append

so now i'm busy trying to get auto working on the dom.
i needed to add an append method.
it's easy enough to understand: you can add values to the
object after it has been created:

```js
let _ = auto({
	x: 10,
	y: (_) => _.x * 2
})

_.append({
	z: (_) => _.y * 2
})
```

i suppose i should add a test for this....