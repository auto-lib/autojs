
## todo

a list of things i'd like to do with **auto**

### automatic version increase

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