
let fs = require('fs');
let { fail } = require('./common');

function get_tests()
{
    if (!fs.existsSync('./tests')) fail('tests/ folder not found');

    let tests = [];
    fs.readdirSync("./tests").forEach(name => {
        if (name.indexOf('.js') > -1) tests.push(name.replace('.js', ''));
    })
    return tests;
}

module.exports = { get_tests };