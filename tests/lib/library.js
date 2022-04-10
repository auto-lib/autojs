
let fs = require('fs');
let { fail } = require('./common');

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
    path = './../../dev/src/' + latest;
    try {
        lib = require(path);
    }
    catch (e) {
        fail('could not import '+path+': '+e);
    }

    if (!('auto' in lib)) fail(path+' does not export auto');

    return lib.auto;
}

module.exports = { get_library };