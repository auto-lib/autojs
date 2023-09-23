# 024_more_loop_detection

i had a self referencing loop which i wasn't detected because
the loop didn't start at the beginning of the stack.

```
['filtered','view_periods','view_start','view_periods','view_start',...]
```

the issue is this line of the code:

```js
if (stack.length>1 && stack[0] == stack[stack.length-1]) fail('circular dependency');
```

i assume that loops will be at the start/end...

how do i fix this in an efficient way?
i guess better than to have a stack than just an object
which contains all the functions that have been run:

```js
if (name in called) fail('circular dependency');
```

so called just contains everything we've called thus far:

```js
{
    'filtered': true,
    'view_periods': true,
    'view_start': true
}

so to check we can just say `if (called[name])`

here is the test:

