
## auto is asynchronous

there has been discussions recently about how javascript
does not handle asynchronous code properly, which is an
issue because its primary usage is in the browser.
**auto** fixes this automatically because **auto**
is asynchronous - when you write your logic with
functions connected one-on-one to variables
every piece of your logic is asynchronous.

```js
let $ = auto({
    data: null,
    count: $.data ? $.data.length : 0;
})
```

setting `data` with `$.data = ...` can be done
by a synchronous or asynchronous function - it
doesn't change the behavour at all. which is why
**auto** solves javascript's [two color function](https://journal.stuffwithstuff.com/2015/02/01/what-color-is-your-function/)
problem.

> should also talk about or look at https://www.hobofan.com/blog/2021-03-10-rust-async-colored/
> lots of discussions about this right now https://news.ycombinator.com/item?id=26421148