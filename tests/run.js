
let { get_library, get_tests, check_test } = require('./lib.js');

let tests = get_tests();

if (tests.length==0) console.log('WARN no tests found');
else
{
    let library = get_library();

    console.log('running tests');
    
    tests.forEach(name => {
        const test = require('./src/' + name + '.js');
        check_test(library, name, test);
    })
}