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

        if (!mergedSpecs.shouldComponentUpdate) {
            mergedSpecs.shouldComponentUpdate = shouldComponentUpdate;
        }
    }
    return React.createClass(mergedSpecs);
};

function render() {
    var relaks = this.relaks;
    if (!relaks) {
        // create Relaks context
        relaks = this.relaks = {
            progressElement: null,
            progressElementExpected: false,
            promisedElement: null,
            promisedElementExpected: false,
            meanwhile: null,
        };
    }

    // see if rendering is triggered by resolution of a promise,
    // or by a call to Meanwhile.show()
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
    //
    // first cancel any unfinished rendering cycle
    if (relaks.meanwhile) {
        var previously = relaks.meanwhile;
        relaks.meanwhile = null;
        // use a try block, in case the onCancel handler throws
        try {
            previously.cancel();
        } catch (err) {
            console.error(err);
        }
    }

    // create meanwhile object
    var meanwhile = relaks.meanwhile = new Meanwhile(this);

    // call user-defined renderAsync() in a try-catch block to catch potential errors
    try {
        var promise = this.renderAsync(meanwhile);

        // from here on, any call to Meanwhile.show() is asynchronous
        meanwhile.synchronous = false;
    } catch (err) {
        // a synchronouse error occurred, show any progress made or what was
        // there before
        console.error(err);
        relaks.meanwhile.clear();
        relaks.meanwhile = null;
        return relaks.progressElement || relaks.promisedElement;
    }

    if (isPromise(promise)) {
        // set up handlers for the promise returned
        var resolve = (element) => {
            meanwhile.clear();
            if (meanwhile !== relaks.meanwhile) {
                // a new rendering has started--do nothing here
            } else {
                // tell render() to show the element
                relaks.promisedElement = element;
                relaks.promisedElementExpected = true;
                relaks.progressElement = null;
                relaks.meanwhile = null;
                this.forceUpdate();
            }
        };
        var reject = (err) => {
            if (err instanceof AsyncRenderingInterrupted) {
                // the rendering cycle was interrupted--do nothing
            } else {
                console.error(err);
                var element = relaks.progressElement || relaks.promisedElement;
                resolve(element);
            }
        };
        promise.then(resolve, reject);
    } else {
        // allow renderAsync() to act synchronously
        var element = promise;
        relaks.meanwhile = null;
        relaks.promisedElement = element;
        relaks.progressElement = null;
    }

    // we have triggered the asynchronize operation and are waiting for it to
    // complete; in the mean time we need to return something
    if (relaks.promisedElement) {
        // show what was there before
        return relaks.promisedElement;
    }
    if (relaks.progressElement) {
        // a progress element was provided synchronously by renderAsync()--show that
        // clear the timeout if progress was set on a delay
        meanwhile.clear();
        return relaks.progressElement;
    }
    // umm, we got nothing
    return null;
}

function shouldComponentUpdate(nextProps, nextState) {
    if (!compare(this.props, nextProps)) {
        return true;
    }
    if (!compare(this.state, nextState)) {
        return true;
    }
    return false;
}

function componentDidMount() {
}

function componentWillUnmount() {
    var relaks = this.relaks;
    if (relaks) {
        if (relaks.meanwhile) {
            relaks.meanwhile.cancel();
        }
        this.relaks = null;
    }
}

function Meanwhile(component) {
    this.component = component;
    this.synchronous = true;
    this.showingProgress = false;
    this.updateTimeout = 0;
}

/**
 * Check if the rendering cycle isn't been superceded by a new one. If so
 * throw an exception to end it.
 */
Meanwhile.prototype.check = function() {
    var relaks = this.component.relaks;
    if (this !== relaks.meanwhile) {
        // throw exception to break promise chain
        // promise library should catch and pass it to reject()
        // defined down below
        throw new AsyncRenderingInterrupted;
    }
}

/**
 * Show progress element, possibly after a delay
 *
 * @param  {ReactElement} element
 * @param  {Number} delay
 */
Meanwhile.prototype.show = function(element, delay) {
    var relaks = this.component.relaks;

    // make sure the rendering cycle is still current
    this.check();

    // save the element so render() can return it eventually
    relaks.progressElement = element;

    // see if we're showing progress already...
    if (this.showingProgress) {
        // if so, show the new progress immediately
        this.update();
    } else if (this.updateTimeout) {
        // we've already schedule the displaying of progress
    } else {
        if (delay) {
            // show progress after a brief delay, to allow
            // it to be bypassed by fast-resolving promises
            this.updateTimeout = setTimeout(() => {
                this.update();
            }, delay);
        } else if (delay === 0) {
            // caller wants it to be shown immediately
            this.update();
        } else {
            // when no delay is given, then progress is shown only
            // if the component would be blank otherwise
            //
            // if the component was rendered before, then nothing happens
            // until all promises resolve--or if a call to show() is made
            // and a delay is given
        }
    }
};

/**
 * Rendering the progress element now
 */
Meanwhile.prototype.update = function() {
    var relaks = this.component.relaks;

    // indicate that the component is displaying progress
    this.showingProgress = true;
    console.log('Progress...');

    // toss the result of the previous rendering cycle
    relaks.promisedElement = null;

    if (this.synchronous) {
        // no need to force update since we're still inside
        // render() and it can simply return the progress element
        return;
    }
    // if the timeout is 0, then clearTimeout() was called on it
    // this function might still run on occasion afterward, due to
    // the way timeouts are schedule
    if (!this.updateTimeout) {
        return;
    }

    // tell render() that it isn't triggered in the normal fashion
    relaks.progressElementExpected = true;
    this.component.forceUpdate();
};

/**
 * Cancel the rendering of progress and fire any onCancel handler
 */
Meanwhile.prototype.cancel = function() {
    this.clear();
    if (this.onCancel) {
        this.onCancel({ type: 'cancel', target: this.component });
    }
};

/**
 * Cancel the any scheduled rendering of progress
 */
Meanwhile.prototype.clear = function() {
    var relaks = this.component.relaks;
    if (this.updateTimeout) {
        clearTimeout(this.updateTimeout);
        this.updateTimeout = 0;
    }
};

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
