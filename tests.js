
let { get_library, get_tests, check_test } = require('./tests/lib');

let tests = get_tests();

if (tests.length==0) console.log('WARN no tests found');
else
{
    let library = get_library(); // get latest auto source in dev/src

    console.log('running tests in tests/');
    
    tests.forEach(name => {
        const test = require('./tests/' + name + '.js');
        check_test(library, name, test);
    })
}