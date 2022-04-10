
let fs = require('fs');

function fail(msg) {
    console.log('ERROR '+msg);
    process.exit(1);
}

function get_library()
{
    console.log('getting latest library from dev/src');

    let path = './dev/src';
    if (!fs.existsSync(path)) fail(path+' does not exist');
   
    let files = fs.readdirSync(path);

    if (files.length==0) fail('no files in '+path);
    
    let latest = files.slice(-1)[0];
    if (latest.slice(-3) != '.js') fail('last file '+latest+' is not javascript');

    let lib;
    path = './../dev/src/' + latest;
    try {
        lib = require(path);
    }
    catch (e) {
        fail('could not import '+path+': '+e);
    }

    if (!('auto' in lib)) fail(path+' does not export auto');

    return lib.auto;
}

function get_tests()
{
    if (!fs.existsSync('./tests')) fail('tests/ folder not found');
    if (!fs.existsSync('./tests/src')) fail('tests/src/ folder not found');

    let tests = [];
    fs.readdirSync("./tests/src").forEach(name => {
        tests.push(name.replace('.js', ''));
    })
    return tests;
}

function check_test(library, name, test)
{
    console.log(name);
    console.log(' - obj',test.obj);
    let _ = library(test.obj);
    console.log(' - state',{
        cache: _.cache.state(),
        pubsub: _.pubsub.state()
    });
}

module.exports = {
    get_library, get_tests, check_test
}