
let script;
if (process.argv.length>2) script = process.argv[2]; // just run one script (easier with lots of debug info)

// let fs = require('fs');

import fs from 'fs';

let fail = (msg) => { console.trace(msg); process.exit(1); }

let devlog_path = "../docs/devlog/src"
	
/* this code bums me out. wish it was cleaner. man i don't like node... */
/* it's weird - auto's code is good. why is this different? */

/* we do three things
	1. copy latest test script over the auto scripts in root
	2. run all the tests
	3. update version number in package.json
*/

// https://stackoverflow.com/a/33486055/4295424
var MD5 = function (d) { var r = M(V(Y(X(d), 8 * d.length))); return r.toLowerCase() }; function M(d) { for (var _, m = "0123456789ABCDEF", f = "", r = 0; r < d.length; r++)_ = d.charCodeAt(r), f += m.charAt(_ >>> 4 & 15) + m.charAt(15 & _); return f } function X(d) { for (var _ = Array(d.length >> 2), m = 0; m < _.length; m++)_[m] = 0; for (m = 0; m < 8 * d.length; m += 8)_[m >> 5] |= (255 & d.charCodeAt(m / 8)) << m % 32; return _ } function V(d) { for (var _ = "", m = 0; m < 32 * d.length; m += 8)_ += String.fromCharCode(d[m >> 5] >>> m % 32 & 255); return _ } function Y(d, _) { d[_ >> 5] |= 128 << _ % 32, d[14 + (_ + 64 >>> 9 << 4)] = _; for (var m = 1732584193, f = -271733879, r = -1732584194, i = 271733878, n = 0; n < d.length; n += 16) { var h = m, t = f, g = r, e = i; f = md5_ii(f = md5_ii(f = md5_ii(f = md5_ii(f = md5_hh(f = md5_hh(f = md5_hh(f = md5_hh(f = md5_gg(f = md5_gg(f = md5_gg(f = md5_gg(f = md5_ff(f = md5_ff(f = md5_ff(f = md5_ff(f, r = md5_ff(r, i = md5_ff(i, m = md5_ff(m, f, r, i, d[n + 0], 7, -680876936), f, r, d[n + 1], 12, -389564586), m, f, d[n + 2], 17, 606105819), i, m, d[n + 3], 22, -1044525330), r = md5_ff(r, i = md5_ff(i, m = md5_ff(m, f, r, i, d[n + 4], 7, -176418897), f, r, d[n + 5], 12, 1200080426), m, f, d[n + 6], 17, -1473231341), i, m, d[n + 7], 22, -45705983), r = md5_ff(r, i = md5_ff(i, m = md5_ff(m, f, r, i, d[n + 8], 7, 1770035416), f, r, d[n + 9], 12, -1958414417), m, f, d[n + 10], 17, -42063), i, m, d[n + 11], 22, -1990404162), r = md5_ff(r, i = md5_ff(i, m = md5_ff(m, f, r, i, d[n + 12], 7, 1804603682), f, r, d[n + 13], 12, -40341101), m, f, d[n + 14], 17, -1502002290), i, m, d[n + 15], 22, 1236535329), r = md5_gg(r, i = md5_gg(i, m = md5_gg(m, f, r, i, d[n + 1], 5, -165796510), f, r, d[n + 6], 9, -1069501632), m, f, d[n + 11], 14, 643717713), i, m, d[n + 0], 20, -373897302), r = md5_gg(r, i = md5_gg(i, m = md5_gg(m, f, r, i, d[n + 5], 5, -701558691), f, r, d[n + 10], 9, 38016083), m, f, d[n + 15], 14, -660478335), i, m, d[n + 4], 20, -405537848), r = md5_gg(r, i = md5_gg(i, m = md5_gg(m, f, r, i, d[n + 9], 5, 568446438), f, r, d[n + 14], 9, -1019803690), m, f, d[n + 3], 14, -187363961), i, m, d[n + 8], 20, 1163531501), r = md5_gg(r, i = md5_gg(i, m = md5_gg(m, f, r, i, d[n + 13], 5, -1444681467), f, r, d[n + 2], 9, -51403784), m, f, d[n + 7], 14, 1735328473), i, m, d[n + 12], 20, -1926607734), r = md5_hh(r, i = md5_hh(i, m = md5_hh(m, f, r, i, d[n + 5], 4, -378558), f, r, d[n + 8], 11, -2022574463), m, f, d[n + 11], 16, 1839030562), i, m, d[n + 14], 23, -35309556), r = md5_hh(r, i = md5_hh(i, m = md5_hh(m, f, r, i, d[n + 1], 4, -1530992060), f, r, d[n + 4], 11, 1272893353), m, f, d[n + 7], 16, -155497632), i, m, d[n + 10], 23, -1094730640), r = md5_hh(r, i = md5_hh(i, m = md5_hh(m, f, r, i, d[n + 13], 4, 681279174), f, r, d[n + 0], 11, -358537222), m, f, d[n + 3], 16, -722521979), i, m, d[n + 6], 23, 76029189), r = md5_hh(r, i = md5_hh(i, m = md5_hh(m, f, r, i, d[n + 9], 4, -640364487), f, r, d[n + 12], 11, -421815835), m, f, d[n + 15], 16, 530742520), i, m, d[n + 2], 23, -995338651), r = md5_ii(r, i = md5_ii(i, m = md5_ii(m, f, r, i, d[n + 0], 6, -198630844), f, r, d[n + 7], 10, 1126891415), m, f, d[n + 14], 15, -1416354905), i, m, d[n + 5], 21, -57434055), r = md5_ii(r, i = md5_ii(i, m = md5_ii(m, f, r, i, d[n + 12], 6, 1700485571), f, r, d[n + 3], 10, -1894986606), m, f, d[n + 10], 15, -1051523), i, m, d[n + 1], 21, -2054922799), r = md5_ii(r, i = md5_ii(i, m = md5_ii(m, f, r, i, d[n + 8], 6, 1873313359), f, r, d[n + 15], 10, -30611744), m, f, d[n + 6], 15, -1560198380), i, m, d[n + 13], 21, 1309151649), r = md5_ii(r, i = md5_ii(i, m = md5_ii(m, f, r, i, d[n + 4], 6, -145523070), f, r, d[n + 11], 10, -1120210379), m, f, d[n + 2], 15, 718787259), i, m, d[n + 9], 21, -343485551), m = safe_add(m, h), f = safe_add(f, t), r = safe_add(r, g), i = safe_add(i, e) } return Array(m, f, r, i) } function md5_cmn(d, _, m, f, r, i) { return safe_add(bit_rol(safe_add(safe_add(_, d), safe_add(f, i)), r), m) } function md5_ff(d, _, m, f, r, i, n) { return md5_cmn(_ & m | ~_ & f, d, _, r, i, n) } function md5_gg(d, _, m, f, r, i, n) { return md5_cmn(_ & f | m & ~f, d, _, r, i, n) } function md5_hh(d, _, m, f, r, i, n) { return md5_cmn(_ ^ m ^ f, d, _, r, i, n) } function md5_ii(d, _, m, f, r, i, n) { return md5_cmn(m ^ (_ | ~f), d, _, r, i, n) } function safe_add(d, _) { var m = (65535 & d) + (65535 & _); return (d >> 16) + (_ >> 16) + (m >> 16) << 16 | 65535 & m } function bit_rol(d, _) { return d << _ | d >>> 32 - _ }

// https://javascript.plainenglish.io/4-ways-to-compare-objects-in-javascript-97fe9b2a949c
function isEqual(obj1, obj2) {

	//console.log("obj1 = ",obj1);
	//console.log("obj2 = ",obj2);

	if (typeof (obj1) != typeof (obj2)) return false;
	if (obj1 == null && obj2 == null) return true;
	if (obj1 == null && obj2 != null) return false
	if (obj1 != null && obj2 == null) return false;
	if (typeof obj1 === 'number' && isNaN(obj1) && isNaN(obj2)) return true; // NaN!

	if (typeof (obj1) === 'object') {
		let keys = Object.keys(obj1);
		if (keys.length != Object.keys(obj2).length) return false;
		let equal = true;
		keys.forEach(key => {
			equal = equal && isEqual(obj1[key], obj2[key])
		});
		return equal;
	}
	else return obj1 == obj2;
}

let assert_global_same = (name, should_be, actual) => {

	// arg generic object check
	if (!isEqual(should_be,actual))
	{
		console.log(name+": not equal");
		console.log("global should be:",should_be);
		console.log("global actual:   ",actual);
		return false;
	}
	return true;
}

let assert_internals_same = (name, should_be, actual) => {
	
	let diff = [];

	let missing_fn = false;
	let fns = [];
	Object.keys(actual.fn).forEach(name => {
		if (should_be.fn.indexOf(name) === -1 && name != '#fatal') missing_fn = true;
		fns.push(name);
	})
	actual.fn = fns; // flat list for display
	if (missing_fn) diff.push('fn');

	// subs looks like
	// {
	//      'data': {
	//        '000': [Function],
	//        '001': [Function]
	//      }
	//      'count': {
	//        '000': [Funcion]
	//      }
	// }
	// but to check we need it to look like
	// {
	//      'data': ['000','001'],
	//      'count': ['000']
	// }

	// (why don't i make it look like that? '000' could refer to a function in fn...)

	let subs = {};
	Object.keys(actual.subs).forEach(name => {
		let arr = [];
		Object.keys(actual.subs[name]).forEach(tag => {
			arr.push(tag);
		});
		subs[name] = arr;
	});
	actual.subs = subs; // replace with an array of names (can't really check the actual function definitions)

	let keys = ['subs', 'stack', 'deps', 'value', 'fatal'];

	keys.forEach(key => { if (!isEqual(should_be[key], actual[key])) diff.push(key); })

	if (diff.length > 0) {
		console.log(name + ": not same");
		diff.forEach(key => {
			console.log(key + " should be", should_be[key]);
			console.log(key + " actual   ", actual[key]);
		})
		return false
	}
	else return true;
}

let ignored = {
	'025_nested_functions': 'pausing inner object functionality',
	'026_array_of_objects': 'pausing inner object functionality'
}

let confirm = (name, test, $, global) =>
{
	let same = assert_internals_same(name, test._, $._); // start with the state object
	if (test.global) same = assert_global_same(name, test.global, global) && same; // also check global object if set (to ensure subscriptions run)
	if (same) console.log(name + ": passed")
}

let check = (auto, name, test) => {
	if (ignored[name]) console.log(name + ": ignored ("+ignored[name]+")")
	else
	{
		test.obj['#fatal'] = () => {}; // zero out default fatal behaviour
		let $ = auto(test.obj, test.opt);
		let global = {};
		try {
			test.fn($, global);
		}
		catch (e) {
			console.trace(e);
			console.log($);
			process.exit(1);
		}
		if (test.timeout) setTimeout( () => confirm(name, test, $, global), test.timeout);
		else confirm(name, test, $, global);
	}
}

let get_latest_path = () => {

	let latest_path;
	fs.readdirSync(devlog_path).forEach(name => {
		if (parseInt(name.substring(0, 3)) > 0) latest_path = name;
	});

	return latest_path;
}

let copy_latest_lib = (version) => {

	let latest_path = get_latest_path(devlog_path);

	console.log("\nlatest file is " + devlog_path + "/" + latest_path + "\ncopying to auto.js files\n")
	
	let latest = "\n// " + latest_path + "\n" + fs.readFileSync(devlog_path + "/" + latest_path).toString();

	// remove comments
	let lines = [];
	let prev_empty = false; // don't have more than one empty line
	latest.split('\n').forEach( (line,i) => {
		let was_empty = line.trim().length==0;
		line = line.replace('../../../types/index.d.ts','./types/index.d.ts');
		if (!was_empty) line = line.replace(/\/\/.*$/gm,'').trimEnd();
		if (line.trim().length>0 || (was_empty && !prev_empty && latest[i+1].trim().length>1)) lines.push(line);
		prev_empty = was_empty ? true : (line.trim().length == 0 ? true : false);
	});

	let cleaned = lines.join('\n');

	cleaned = cleaned.replace('v: undefined', "v: '1."+version.major+"."+version.minor+"'"); // save file name to lib

	fs.writeFileSync("../auto-no-export.js", cleaned);
	fs.writeFileSync("../auto-commonjs.js", "const { performance } = require('perf_hooks');\n\n" + cleaned + "\n\nmodule.exports = auto;");
	fs.writeFileSync("../auto-es6.js", cleaned + "\n\nexport default auto;");
}

let run_tests = () => {

	import('../auto-es6.js').then(auto => {

		fs.readdirSync("./files").forEach(name => {
			if (parseInt(name.substring(0, 3)) > 0) {
				if (!script || name == script)
				{
					import("./files/" + name).then(test => {
						// const test = require("./files/" + name);
						name = name.replace('.js', '');
						check(auto.default, name, test.default);
					})
				}
			}
		})
	})
}

let get_package_version = () => {

	let file = fs.readFileSync("../package.json").toString();

	let version;

	file.split("\n").forEach(line => {

		if (line.indexOf('version')>-1)
		{
			let sections = line.split('"'); // looks like "version": "0.1.0",
			let i = sections.indexOf('version');
			let numb = sections[i+2]; // it must be the second part after 'version'
			let numbs = numb.split('.');
			
			version = {
				major: parseInt(numbs[1]),
				minor: parseInt(numbs[2])
			}
		}
	})

	if (!version) fail("couldn't get version for package.json");

	return version;
}

let get_latest_version = () => {

	return parseInt(get_latest_path().substring(0, 3));
}

let clear_old_md5s = () => {

	let latest_name = get_latest_path().replace('.js','');

	fs.readdirSync("./").forEach(name => {
		if (name.indexOf('.md5')>-1 && name.indexOf(latest_name)==-1)
		{
			console.log("deleting "+name);
			fs.unlinkSync(name);
		}
	})
}

let write_package_version = (version) => {

	let file = fs.readFileSync("../package.json").toString();
	let output = "";

	file.split("\n").forEach(line => {

		if (line.indexOf('version')==-1)
		{
			output += line;
			if (line != '}') output += '\n';
		}
		else
			output += '  "version": "1.' + version.major + '.' + version.minor + '",\n'
	})

	fs.writeFileSync("../package.json", output);
}

let get_contents_empty_if_not_there = (path) => {

	if (!fs.existsSync(path)) return '';
	else return fs.readFileSync(path).toString();
}

let update_package_version = (save) => {

	if (save) clear_old_md5s(); // anything that doesn't match latest

	let version = get_package_version();
	let major = get_latest_version(); // 'latest' means 'the latest file in devlog' e.g. 016_go_away_karl.js

	if (major != version.major)
	{
		if (save) console.log("updating major version from "+version.major+" to "+major);
		version.major = major;
		version.minor = 0;
	}
	else
	{
		let latest_name = get_latest_path().replace('.js','');

		let latest_contents = get_contents_empty_if_not_there(devlog_path + '/' + latest_name+".js");
		let last_md5 = get_contents_empty_if_not_there(latest_name+".md5");

		let latest_md5 = MD5(latest_contents);

		if (latest_md5 != last_md5)
		{
			version.minor += 1;
			if (save) {
				console.log("\nlatest file has changed. bumping minor version to "+version.minor);
				fs.writeFileSync(latest_name+".md5", latest_md5);
			}
		}
		else
		{
			if (save) console.log("\nno changes to package version needed");
		}
	}

	if (save) write_package_version(version);
	return version;
}

let main = () => {

	let version = update_package_version(false); // get version but don't write out / send messages
	copy_latest_lib(version);
	run_tests();
	update_package_version(true); // again but save this time (if tests fail won't get here)
}


main();
