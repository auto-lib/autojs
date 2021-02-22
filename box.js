"use strict";

/*
You use this like so:

const state = require('./')();

This fires off the only export: this function.
This should give you a brand new state
with all the accessor functions you need.
*/

/* This is based on this video (go to 30min in)
   https://www.youtube.com/watch?v=NBYbBbjZeX4&t=1923
   which shows how to implement MobX's 'box' and 'autorun'
   functions (which automatically track and react to changes
   in a function...).

   I also add a subscribe method which makes the box
   compatible with svelte, i.e. it's a svelte store
   https://svelte.dev/docs#Store_contract

   Aside: the Svelte store contract looks very similar
   to what you get implementing the autorun tracking from
   MobX, but I have yet to see how to connect the two
   (so I implement both together...)
*/

let currentlyRunning;

export function box(initial) {

  //let value = initial;

  let obj = {};

  obj.value = initial;

    // i'm still not sure why... value is above and observers is in this object?
  obj.observers = [];

  obj.get = () => {
      // this is the magic part
      // so now we automatically get a list of variables
      // that any running function is dependant on
      if (currentlyRunning) currentlyRunning.observing.push(obj);
      return obj.value;
    }

  obj.set = (val) => {
      obj.value = val;
      obj.observers.splice(0).forEach(r => r.run());
    }
  
  obj.subscribe = (fn) => autorun(() => fn(obj.get()))

  return obj;

};

/* This must be in the same module
   because of currentlyRunning ! */

export function autorun(fn) {
  const reaction = {
    observing: [],
    run() {
      currentlyRunning = this;
      this.observing = [];
      fn();
      this.observing.forEach(box => box.observers.push(this));
      currentlyRunning = undefined;
    }
  };
  return reaction.run();
}
