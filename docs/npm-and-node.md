## npm and node

### init package.json

start by creating an empty directory and initialising
`package.json`

```
npm init -y
```

### install **auto**

now install **auto** with

```
npm install @autolib/auto
```

### create test.js

put the following into `test.js`

```js
const auto = require('@autolib/auto');

let $ = auto({
    data: null,
    count: ($) => $.data ? $.data.length : 0,
    msg: ($) => "Got " + $.count + " items"
})

console.log($._);
```

### running

Now running `node test.js` you should see

```
c:\Users\karlp\test-auto>node test.js
{ deps: {}, dirty: { count: true, msg: true }, value: {} }
```