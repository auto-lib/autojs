//import make_channel from './channel';

let make_channel = require('./channel');

let ch = make_channel();

ch.sub('set x', msg => console.log(msg));
ch.msg('set x', { value: 10 });