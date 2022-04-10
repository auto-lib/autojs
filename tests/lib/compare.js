// https://javascript.plainenglish.io/4-ways-to-compare-objects-in-javascript-97fe9b2a949c
function compare(obj1, obj2) {

	// if you don't specify an object in the test,
	// but it's empty anyway (like resolve) let the test pass
	// (so that we don't _have_ to specify it in the test...)
	if (obj1 == undefined && typeof(obj2) == 'object' && obj2 != undefined && Object.keys(obj2).length==0) return true;
	if (typeof(obj1) == 'object' && obj2 == undefined && obj1 != undefined && Object.keys(obj1).length==0) return true;

	if (typeof (obj1) != typeof (obj2)) return false;

	if (typeof(obj1) == 'object' && typeof(obj2) == 'object' && Array.isArray(obj1) && !Array.isArray(obj2))
	{
		// if one is {} and the other is [] return true...
		if (Object.keys(obj1).length==0 && Object.keys(obj2).length==0) return true;
		return false;
	}

	if (obj1 == null && obj2 == null) return true;
	if (obj1 == null && obj2 != null) return false
	if (obj1 != null && obj2 == null) return false;

	if (typeof obj1 === 'number' && isNaN(obj1) && isNaN(obj2)) return true; // NaN!

	if (typeof (obj1) === 'object') {

		
			let keys = Object.keys(obj1);
			if (keys.length != Object.keys(obj2).length) return false;
			let equal = true;
			keys.forEach(key => {
				// console.log('obj1[',key,']=',obj1[key]);
				// console.log('obj2[',key,']=',obj2[key]);
				let eq = compare(obj1[key], obj2[key]);
				// console.log('is equal',eq);
				equal = equal && compare(obj1[key], obj2[key])
			});
			return equal;
		
	}
	else return obj1 == obj2;
}

module.exports = { compare }