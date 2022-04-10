let auto = (obj, opts) => {

	let boxes = {};

	return new Proxy({}, {
		get(o, name) { 
			if (! (name in boxes)) console.log('cannot get',name,': not found');
			else return boxes[name].value; },
		set(o, name, value) { 
			if (! (name in boxes)) console.log('cannot set',name,': not found');
			else boxes[name].set(value); }
	})
}

let _ = auto();

console.log(_.x);