# 034a add browser version

i've added a browser version - something you can just pull
right into your browser and use

```html
<script type="module" src="https://cdn.jsdelivr.net/npm/@autolib/auto/auto-browser.js"></script>

<script>

	let _ = auto({
		x: 10,
		y: (_) => _.x * 2
	})
</script>
```

much easier for mocking things up.

all it does is change `let auto = ()` to `window.auto = `
i.e. just puts `auto` into the global namespace.