import { box, autorun } from '../box.js';

var names = box();
var count = box()
var msg = box();

autorun( () => msg.set( "Got " + names.get() + " which have " + count.get() + " fields" ));
autorun( () => count.set( names.get() ? names.get().length : 0 ));

console.log("Message at start is",msg.get());
names.set([1,2,3]);
console.log("Message after setting names is",msg.get());