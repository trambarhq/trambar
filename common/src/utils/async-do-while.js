var Promise = require('bluebird');

var beginFunc = null;
var doFunc = null;
var whileFunc = null;
var returnFunc = null;
var construct = '';

exports.begin = function(f) {
	if (doFunc || whileFunc) {
		throw new Error('Cannot call begin() after while() or do()');
	}
	if (!(f instanceof Function)) {
		throw new Error('Argument must be a function');
	}
	beginFunc = f;
}

exports.while = function(f) {
	if (whileFunc) {
		throw new Error('Cannot call while() consecutively');
	}
	if (!(f instanceof Function)) {
		throw new Error('Argument must be a function');
	}
	if (doFunc) {
		construct = 'do-while';
	}
	whileFunc = f;
}

exports.do = function(f) {
	if (doFunc) {
		console.log(doFunc.toString())
		throw new Error('Cannot call do() consecutively');
	}
	if (!(f instanceof Function)) {
		throw new Error('Argument must be a function');
	}
	if (whileFunc) {
		construct = 'while-do';
	}
	doFunc = f;
}

exports.return = function(f) {
	if (!doFunc || !whileFunc) {
		throw new Error('Cannot call return() without calling while() and do() beforehand');
	}
	if (!(f instanceof Function)) {
		throw new Error('Argument must be a function');
	}
	returnFunc = f;
}

exports.end = function() {
	if (!doFunc || !whileFunc) {
		throw new Error('Cannot call end() without calling while() and do() beforehand');
	}
	var loopFunc;
	if (construct === 'while-do') {
		loopFunc = function() {
			// first call whileFunc
			return Promise.resolve(this.while()).then((result) => {
				// if it returns true...
				if (result) {
					// call doFunc
					return Promise.resolve(this.do()).then(() => {
						// then run the loop again
						return this.loop();
					});
				}
			});
		};
	} else if (construct === 'do-while') {
		loopFunc = function() {
			// first call do()
			return Promise.resolve(this.do()).then(() => {
				// then call while()
				return Promise.resolve(this.while()).then((result) => {
					// if it returns true...
					if (result) {
						// run loop() again
						return this.loop();
					}
				});
			});
		};
	}
	var context = {
		begin: beginFunc || nop,
		do: doFunc,
		while: whileFunc,
		return: returnFunc || nop,
		loop: loopFunc
	};
	beginFunc = null;
	doFunc = null;
	whileFunc = null;
	returnFunc = null;
	construct = '';
	return run.call(context);
}

var AsyncBreak = new Error;

exports.break = function() {
	throw AsyncBreak;
}

function run() {
	return Promise.resolve().then(() => {
		return this.begin();
	}).then(() => {
		return this.loop();
	}).catch((err) => {
		if (err !== AsyncBreak) {
			throw err;
		}
	}).then(() => {
		return this.return();
	});
}

function nop() {};
