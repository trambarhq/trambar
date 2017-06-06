var React = require('react');

var Relaks = module.exports = {};

Relaks.createClass = function(specs) {
    var mergedSpecs = {};
    for (var name in specs) {
        mergedSpecs[name] = specs[name];
    }
    if (!mergedSpecs.render) {
        mergedSpecs.render = render;

        if (specs.componentDidMount) {
            var componentDidMountCustom = specs.componentDidMount;
            mergedSpecs.componentDidMount = function() {
                componentDidMount.call(this);
                componentDidMountCustom.call(this);
            };
        } else {
            mergedSpecs.componentDidMount = componentDidMount;
        }
        if (specs.componentWillUnmount) {
            var componentWillUnmountCustom = specs.componentWillUnmount;
            mergedSpecs.componentWillUnmount = function() {
                componentWillUnmount.call(this);
                componentWillUnmountCustom.call(this);
            };
        } else {
            mergedSpecs.componentWillUnmount = componentWillUnmount;
        }

        if (!mergedSpecs.renderError) {
            mergedSpecs.renderError = renderError;
        }
        if (!mergedSpecs.shouldComponentUpdate) {
            mergedSpecs.shouldComponentUpdate = shouldComponentUpdate;
        }
    }
    return React.createClass(mergedSpecs);
};

function render() {
    var relaks = this.relaks;
    if (!relaks) {
        relaks = this.relaks = {
            progressElement: null,
            progressElementExpected: false,
            progressElementTimeout: 0,
            promisedElement: null,
            promisedElementExpected: false,
            meanwhile: null,
            promise: null,
        };
    }

    // see if rendering is triggered by resolution of a promise,
    // or by a call to meanwhile.show()
    if (relaks.promisedElementExpected) {
        // render the new promised element
        relaks.promisedElementExpected = false;
        return relaks.promisedElement;
    } else if (relaks.progressElementExpected) {
        // render the new progress element
        relaks.progressElementExpected = false;
        return relaks.progressElement;
    }

    // normal rerendering--we need to call renderAsync()
    // first cancel any unfinished rendering cycle
    if (relaks.meanwhile) {
        if (relaks.progressElementTimeout) {
            clearTimeout(relaks.progressElementTimeout);
            relaks.progressElementTimeout = 0;
        }
        var onCancel = relaks.meanwhile.onCancel;
        if (onCancel) {
            try {
                var evt = {
                    type: 'cancel',
                    target: this
                };
                onCancel(evt);
            } catch (err) {
                var element = this.renderError(err);
                return element;
            }
        }
        relaks.meanwhile = null;
    }

    /* Methods of the meanwhile object: */
    /**
     * Make sure the current cycle hasn't been superceded by a new one
     */
    var check = () => {
        if (meanwhile !== relaks.meanwhile) {
            // throw exception to break promise chain
            // promise library should catch and pass it to reject()
            // defined down below
            throw new AsyncRenderingInterrupted;
        }
    };
    /**
     * Show progress element, possibly after a delay, after checking first if
     * cycle is still current
     *
     * @param  {ReactElement} element
     * @param  {Number} delay
     */
    var show = (element, delay) => {
        check();

        var displayingProgressAlready = !!relaks.progressElement;
        relaks.progressElement = element;
        var update = () => {
            if (!synchronous) {
                // function might run even after clearTimeout() was called on the timeout
                if (relaks.progressElementTimeout) {
                    relaks.progressElementExpected = true;
                    relaks.progressElementTimeout = 0;
                    this.forceUpdate();
                }
            } else {
                // no need to force update since we're still inside
                // render() and it can simply return the progress element
            }
        };
        if (displayingProgressAlready) {
            // show it immediately
            update();
        } else {
            // show progress after a brief delay, to allow
            // it to be bypassed by fast-resolving promises
            if (!relaks.progressElementTimeout) {
                if (delay === undefined) {
                    delay = 50;
                }
                if (delay > 0) {
                    relaks.progressElementTimeout = setTimeout(update, delay);
                } else {
                    update();
                }
            }
        }
    };
    var meanwhile = relaks.meanwhile = { check, show, onCancel: null };

    // call user-defined renderAsync() in a try-catch block to catch potential errors
    try {
        var synchronous = true;
        var promise = this.renderAsync(meanwhile);

        // from here on, any call to meanwhile.show() is asynchronous
        synchronous = false;
    } catch (err) {
        // a synchronouse error occurred, return a rendering of the error immediately
        var element = this.renderError(err);
        relaks.promisedElement = element;
        relaks.meanwhile = null;
        return element;
    }

    if (isPromise(promise)) {
        // set up handlers for the promise returned
        relaks.promise = promise;
        var resolve = (element) => {
            if (meanwhile === relaks.meanwhile) {
                if (relaks.progressElement) {
                    if (relaks.progressElementTimeout) {
                        // cancel scheduled displaying of progress
                        clearTimeout(relaks.progressElementTimeout);
                        relaks.progressElementTimeout = 0;
                    }
                    relaks.progressElement = null;
                }
                // tell render() to show the element
                relaks.promisedElement = element;
                relaks.promisedElementExpected = true;
                relaks.meanwhile = null;
                relaks.promise = null;
                this.forceUpdate();
            }
        };
        var reject = (err) => {
            var element = this.renderError(err);
            resolve(element);
        };
        promise.then(resolve, reject);
    } else {
        // allow renderAsync() to act synchronously
        var element = promise;
        relaks.meanwhile = null;
        relaks.promisedElement = element;
    }

    // we have triggered the asynchronize operation and are waiting for it to
    // complete; in the mean time we need to return something
    //
    // first, see if we have a progress element provided immediately by renderAsync()
    if (relaks.progressElement) {
        // see if its display is set on a delay
        if (relaks.progressElementTimeout) {
            if (!relaks.promisedElement) {
                // show the progress immediately as the alternative is nothing
                clearTimeout(relaks.progressElementTimeout);
                relaks.progressElementExpected = false;
                relaks.progressElementTimeout = 0;
                return relaks.progressElement;
            }
        } else {
            return relaks.progressElement;
        }
    }
    // just show what was there before (or null)
    return relaks.promisedElement;
}

function renderError(err) {
    var text = '[error]';
    if (err) {
        if (typeof(err) === 'object') {
            text = err.stack || err.message;
        } else {
            // in case a string or something got thrown
            text = String(err);
        }
    }
    return <pre className="error">{text}</pre>;
}

function shouldComponentUpdate(nextProps, nextState) {
    if (!compare(nextProps, this.props)) {
        return true;
    }
    if (!compare(nextState, this.state)) {
        return true;
    }
    return false;
}

function componentDidMount() {
}

function componentWillUnmount() {
    var relaks = this.relaks;
    if (relaks) {
        relaks.progressElement = null;
        relaks.progressElementExpected = false;
        if (relaks.progressElementTimeout) {
            clearTimeout(relaks.progressElementTimeout);
        }
        relaks.progressElementTimeout = 0;
        relaks.promisedElement = null;
        relaks.promisedElementExpected = false;
        relaks.meanwhile = null;
        relaks.promise = null;
    }
}

/**
 * Return true if the given object is a promise
 *
 * @param  {Object} object
 *
 * @return Boolean
 */
function isPromise(object) {
    if (object && typeof(object.then) === 'function') {
        return true;
    }
    return false;
}

function compare(prevSet, nextSet) {
    if (prevSet === nextSet) {
        return true;
    }
    if (!prevSet || !nextSet) {
        return false;
    }
    for (var key in nextSet) {
        var prev = prevSet[key];
        var next = nextSet[key];
        if (next !== prev) {
            return false;
        }
    }
    return true;
}

function AsyncRenderingInterrupted() {
    this.message = 'Async rendering interrupted';
}

AsyncRenderingInterrupted.prototype = Object.create(Error.prototype)
