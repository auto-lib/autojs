
// --------------------

let TEST_DIR = 'tests/';
let TRACE = false; // show every signal
let BREAK_ON_FAILURE = true;

// --------------------

let check_member = (member, name, one) => {

    if (!(member in one)) throw `${member} not found`
    return true;
}

let check_array_array_unordered = (label, name, one, two) => {

    if (one.length != two.length) throw `${label} lengths not same`;

    let ok = true;
    let i;
    for (i = 0; i < one.length; i++)
    {
        if (two.indexOf(one[i])==-1){ ok = false; break; }
    }

    if (!ok) throw `field ${i} in ${label} (${one[i]}) not found in counterpart`

    return true;
}

let check_array_array_ordered = (label, name, one, two) => {

    if (one.length != two.length) throw `${label} lengths not same`;

    let ok = true;
    let i;
    for (i = 0; i < one.length; i++) if (one[i] != two[i]) ok = false;
    
    if (!ok) throw `field ${i} in ${label} not the same`

    return true;
}

let check_object_object = (label, name, one, two) => {

    let one_keys = Object.keys(one);
    let two_keys = Object.keys(two);

    if (one_keys.length==0 && two_keys.length==0) return true;
    if (one_keys.length != two_keys.length) throw `${label} lengths not same`

    let ok = true;
    one_keys.forEach(key => {

        if (typeof one[key] != typeof two[key])
            throw `${label}.${key} types not the same`
        else if ( (one[key] == null && two[key] != null) || (one[key] != null && two[key]) == null)
            throw `${label}.${key} not the same - one is null and the other is not`
        else if (Array.isArray(one[key]))
        {
            if (!check_array_array_ordered(label,name,one[key],two[key])) return false;
        }
        else if (one[key] != two[key])
            throw `${label}.${key} unequal`
    })

    return ok;
}

let check_fn = (name, test, $) =>
{
    if (!check_member('fn', name, test)) return false;
    if (!check_member('fn', name, $)) return false;
    
    return check_array_array_unordered('fn', name, test.fn, Object.keys($.fn));
}

let check_subs = (name, test, $) =>
{
    if (!check_member('subs', name, test)) return false;
    if (!check_member('subs', name, $)) return false;

    return check_object_object('fn', name, test.subs, $.subs);
}

let check_deps = (name, test, $) => 
{
    if (test.deps && !$.deps) throw `test has deps but response does not`
    if (!test.deps && $.deps) throw `test does not have deps but response does`

    if (!test.deps) return;

    Object.keys(test.deps).forEach(key => {
        if (!(key in $.deps)) throw `${key} not in deps`
        if (!Array.isArray(test.deps[key])) throw `test deps[${key}] is not an array`
        if (!Array.isArray($.deps[key])) throw `response deps[${key}] is not array`
        test.deps[key].forEach(dep => {
            if ($.deps[key].indexOf(dep)==-1) throw `${dep} not found in response deps for ${key} but it is in test`
        })
        $.deps[key].forEach(dep => {
            if (test.deps[key].indexOf(dep)==-1) throw `${dep} not found in test deps for ${key} but it is in response`
        })
    })

    return true;
}

let check_cache = (name, test, $) => 
{
    if (!check_member('cache', name, test)) return false;
    if (!check_member('cache', name, $)) return false;

    return check_object_object('cache', name, test.cache, $.cache);
}

let isEmpty = (o,n) => {
    if (!(n in o)) return true;
    if (o[n]==null) return true; // could be null
    if (Object.keys(o[n]).length==0) return true;
    return false;
}

let check_fatal = (name, test, $) => {

    if (isEmpty(test,'fatal') && !isEmpty($,'fatal')) throw `test has fatal but response does not`
    if (!isEmpty(test,'fatal') && isEmpty($,'fatal')) throw `test does not have fatal but response does`

    if (!test.fatal) return true;
    if (!$.fatal) {
        if (Object.keys(test.fatal).length==0) return true;
        throw `fatal not in ${name}`
    }
    if (test.fatal.msg != $.fatal.msg) throw `fatal message not the same`;
    return true;
    // if (!check_member('fatal', name, test)) return false;
    // if (!check_member('fatal', name, $)) return false;

    // return check_object_object('fatal', name, test.fatal, $.fatal);
}

let assert_internals_same = (name, test, $, ignore) =>
{
    let ok = true;

    ok = ok && (ignore.indexOf('fn')>-1 || check_fn(name, test, $));
    ok = ok && (ignore.indexOf('subs')>-1 || check_subs(name, test, $));
    ok = ok && (ignore.indexOf('deps')>-1 || check_deps(name, test, $));
    ok = ok && (ignore.indexOf('cache')>-1 || check_cache(name, test, $));
    ok = ok && check_fatal(name, test, $);

    return ok;
}

let confirm = (name, test, $, global) =>
{
    try {
        assert_internals_same(name, test._, $.internal().state, test.ignore || []);
    }
    catch (e) {
        if (test.should_fail) return true;
        console.log(`[${name}] FAIL ${e}`);
        console.log(test._);
        console.log($.internal().state);
        return false;
    }

    if (test.should_fail)
    {
        console.log(`[${name}] FAIL test should fail but it passed`);
        console.log(test._);
        console.log($.internal().state);
        return false;
    }

    return true;
}

let run_test = (auto, name, test) =>
{
    let $, global = {};
    if (!('state' in test))
    {
        console.log(`[${name}] FATAL 'state' not in test`,test);
        process.exit(1);
    }

    let obj = { name, state: test.state };
    try {
        $ = auto(obj,TRACE);
    }
    catch (e) {
        console.log('Could not initialise auto object',obj);
        console.trace(e);
        process.exit(1);
    }
    try { test.fn($, global); }
    catch (e) {
        console.trace(e);
        console.log($);
        process.exit(1);
    }

    let ok = confirm(name, test, $, global)

    if (ok) console.log(`[${name}] passed`);
    
    return ok;
}

let fs = require('fs');
let path = require('path');

let run_dir = (dir,auto) => {

    let ok = true;

    let files = fs.readdirSync(dir);
    for (let i=0; i<files.length; i++)
    {
        let name = files[i];
    
        // break as soon as one fails
		if (ok || !BREAK_ON_FAILURE)
        {
            let file = path.join(dir,name);
            if (fs.lstatSync(file).isDirectory())
                ok = run_dir(file, auto);
            else if (parseInt(name.substring(0, 3)) > 0)
            {
                const test = require('./'+file);
                name = name.replace('.js', '');
                ok = run_test(auto, file.replace('.js','').replace(TEST_DIR,''), test);
            }
        }
    }

    return ok;
}

let run_tests = () => {

	const auto = require('./auto.js');
	
	return run_dir(TEST_DIR, auto)
}

let main = () => {

    let ok = run_tests();

    if (ok) console.log('all tests passed');
    else if (!BREAK_ON_FAILURE) console.log('some tests failed');
}

main();