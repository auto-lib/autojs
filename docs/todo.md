
## todo

a list of things i'd like to do with **auto**

### testing subscriptions

i have yet to figure out how to robustly check that
subscriptions run correctly. the problem is that
as a rule subscriptions can't change the program
state ... so how do i test that they ran?

the problem is that the tests ... just check the
state. i porbably need to modify the tests to ...
check external state? hmmm ... maybe i'll have
a global object ... or maybe i just make the
subscriptions ... hmmm ...

i was going to say "change some of the variables"
which is what they aren't suppose to do ...
but if other parts of the software can do that,
why not the auto functions? ...

i'll table that for another discussion (my instinct
is it's cleaner not to allow functions to edit
the main state object) so i'll have to ... define
another editable global state to check that
the subscriptions did in fact do what they said they
would / were suppose to. this might be a good way
to check that any functions run? nope - variable
functions aren't suppose to do anything except update
their values (which is something i don't know one
can enforce in javascript...).

```js
let $ = auto({
    data: null,
    count: $.data ? $.data.length : 0
})

let state = {}; // external, non-auto-related state

$['#'].count.subscribe( v => state.msg = "count is "+count );
```

then with the test object we pass in a (perhaps voluntary)
additional object which must be matched exactly ...

ok so this is how i'm going to do the test, here is `019_check_subscribe_effects.js`

```js
module.exports = {
    obj: {
        data: null,
        count: $.data ? $.data.length : 0
    },
    fn: ($, state) => {
        $['#'].count.subscribe( v => state.msg = "count is "+count );
        $.data = [1,2,3];
    },
    _: {
        fn: [],
        deps: [],
        subs: { data: ['000'] },
        value: { data: null },
        fatal: {}
    },
    state: {
        count: "count is 3"
    }
}
```

so now `fn` has a variable `state` passed in which we assume starts
off as an empty object ... and at the end if there is a `state`
parameter passed in we check that against this object...

and now this is what the check code looks like in `runall.js`

```js
let check = (auto, name, test) => {
	let $ = auto(test.obj);
	let state = {};
	test.fn($, state);
	let same = assert_same(name, test._, $._); // start with the state object
	if (test.state) same = same && assert_same(name, test.state, state);
	if (same) console.log(name + ": passed")
}
```

### already done

i push these to the bottom of this doc when they are done

#### automatic version increase

right now the primary lib files (`auto-es6.js`, `auto-commonjs.js` and `auto-no-export.js`),
which live in the root folder,
are built by the `runall.js` script in [tests/](tests/):

> it takes the last file e.g. `018_did_some_feature_change.js` in `tests/`
> and copies it to the lib files - all the same, just changing the last line.

i really like this - so my workflow is:

1. rant about what needs doing in [docs/devlog](docs/devlog)
2. all the while editing a new file called `029_quantum_fields.js`
3. any time i make a change i have a console open at `/tests` and i run `runall.bat` (just runs `node runall.js`... :|)
4. this ensures that `a.` my current changes don't break anything, and `b.` any push to github / publish to npm will have the
latest version

anyway - the problem is the version number for `npm` which currently languishes
in `package.json` until i change it manually, which is a bummer.
i'd like it if `runall.js` does this for me:

1. check to see if the latest file has changed
2. if so, bump the minor version number up
3. use the filename as the medium version number

so if the current version is `0.18.2` and i made a change to `018_make_mochito.js`
and go `runall.bat` then it should change the version in
`package.json` to `0.18.3` (the 18 being from the file name).