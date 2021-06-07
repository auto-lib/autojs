# 023_update_on_sub

there was an error when svelte tried to subscribe to
an auto var after init - turns out svelte only subscribes
when it needs to / when something is imported (i had
an if statement controlled which control to show).
the error was caused because on subscribe the value
wasn't up to date. we must make sure that it is,
because svelte asks that on subscribe you run the
sub function with the current value.

I added this to the sub method, just before running
the function.

```js
if (tag in fn && !(tag in value)) update(tag); // make sure it's up to date
```