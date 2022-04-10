
let { get_library, get_tests, check_test } = require('./tests/lib.js');

let tests = get_tests();

if (tests.length==0) console.log('WARN no tests found');
else
{
    let library = get_library();

    console.log('running tests');
    
    tests.forEach(name => {
        const test = require('./tests/src/' + name + '.js');
        check_test(library, name, test);
    })
}