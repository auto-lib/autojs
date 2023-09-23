
## html

`tests/test.html` has an example of this:

```html
<!doctype html>

<html lang="en">
<head>
  <meta charset="utf-8">
  <title>auto test</title>

<script src="../auto-no-export.js"></script>

</head>

<body>

  <script>
    let $ = auto({
        data: null,
        count: ($) => $.data ? $.data.length : 0,
        msg: ($) => "Got " + $.count + " items"
    })

    console.log($._);
</script>

</body>
</html>
```

to see this working run `npx http-server` from the root repo folder
and then browse to `http://localhost:8080/tests/test.html`
and you should see `Object { deps: {}, dirty: {…}, value: {} }`
printed to the browser console (press CTRL-SHIFT-k in firefox).