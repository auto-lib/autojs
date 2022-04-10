(async function() {

    let { get_library, get_old_tests, get_new_tests, check_test, convert_old } = require('./tests/lib');

    let library = get_library(); // get latest auto source in dev/src

    /* run old tests */

    let old = get_old_tests();

    if (old.length==0) console.log('WARN no old tests found');
    else
    {
        console.log('running tests in old/tests/files/');

        let fn = async (name) => {
            const test = require('./old/tests/files/' + name + '.js');
            let ok = await check_test(library, name, convert_old(test));
            if (!ok) process.exit(1);
        }
        
        for (const name of old) await fn(name);
    }

    /* run new tests */

    let tests = get_new_tests();

    if (tests.length==0) console.log('WARN no new tests found');
    else
    {
        console.log('running tests in tests/');
        
        let fn = async (name) => {
            const test = require('./tests/' + name + '.js');
            await check_test(library, name, test);
        }

        tests.forEach(name => fn(name))
    }

})();
