var Promise = require('bluebird');

var beginFunc = null;
var doFunc = null;
var whileFunc = null;
var finallyFunc = null;
var construct = '';

exports.begin = function(f) {
	if (doFunc || whileFunc) {
		throw new Error('Cannot call begin() after while() or do()');
	}
	beginFunc = f;
}

exports.while = function(f) {
	if (whileFunc) {
		throw new Error('Cannot call while() consecutively');
	}
	if (doFunc) {
		construct = 'do-while';
	}
	whileFunc = f;
}

exports.do = function(f) {
	if (doFunc) {
		throw new Error('Cannot call do() consecutively');
	}
	if (whileFunc) {
		construct = 'while-do';
	}
	doFunc = f;
}

exports.finally = function(f) {
	if (!doFunc || !whileFunc) {
		throw new Error('Cannot call finally() without calling while() and do() beforehand');
	}
	finallyFunc = f;
}

exports.end = function() {
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
		finally: finallyFunc || nop,
		loop: loopFunc
	};
	beginFunc = null;
	doFunc = null;
	whileFunc = null;
	finallyFunc = null;
	construct = '';
	return run.call(context);
}

function run() {
	return Promise.resolve().then(() => {
		return this.begin();
	}).then(() => {
		return this.loop();
	}).then(() => {
		return this.finally();
	});
}

exports.result = exports.end;

function nop() {};
