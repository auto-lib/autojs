let sbox = (v) => {

	let value = v;
	let fns = [];

	let set = (v) => {
		cache = v;
		fns.forEach(fn => fn(v));
	}

	return {
		set,
		get value() { return value; },
		subscribe: (f) => { 
			fns.push(f);
			f(value);
		}
	}
}

let cbox = (fn) => {

	let cache = fn();
	let fns = [];
	
	return {
		run: () => {
			cache = fn();
			fns.forEach(fn => fn(cache));
		},
		get cache() { return cache; },
		subscribe: (f) => {
			fns.push(f);
			f(cache);
		}
	}
}

let x = sbox(10);

x.subscribe( (v) => console.log('s-box first sub',v) )
x.subscribe( (v) => console.log('s-box second sub',v) )

x.set(20);

let y = cbox( () => 2 * 3 );

y.subscribe( (v) => console.log('c-box first sub',v) )
y.subscribe( (v) => console.log('c-box second sub',v) )

y.run();
