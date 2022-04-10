
let fs = require('fs');
let { fail } = require('./common');

function get_old_tests()
{
    if (!fs.existsSync('./old/tests/files/')) fail('old/tests/files folder not found');

    let tests = [];
    fs.readdirSync("./old/tests/files").forEach(name => {
        if (name.indexOf('.js') > -1) tests.push(name.replace('.js', ''));
    })
    return tests;
}

function get_new_tests()
{
    if (!fs.existsSync('./tests')) fail('tests/ folder not found');

    let tests = [];
    fs.readdirSync("./tests").forEach(name => {
        if (name.indexOf('.js') > -1) tests.push(name.replace('.js', ''));
    })
    return tests;
}

module.exports = { get_old_tests, get_new_tests };