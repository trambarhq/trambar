if (process.env.PLATFORM === 'cordova') {
    if (window.cordova) {
        document.addEventListener('deviceready', initialize);
    } else {
        // for testing in browser
        window.addEventListener('load', initialize);
    }
} else if (process.env.PLATFORM === 'browser') {
    window.addEventListener('load', initialize);
}

function initialize(evt) {
    var appContainer = document.getElementById('app-container');
    if (!appContainer) {
        throw new Error('Unable to find app element in DOM');
    }

    var progress;
    if (process.env.PLATFORM === 'browser') {
        var progressBar = document.getElementById('bootstrap-progress-bar');
        var progressBarFilled = document.getElementById('bootstrap-progress-bar-filled');
        var finished = false;
        setTimeout(() => {
            // don't show progress bar when loading finishes quickly
            if (!finished) {
                progressBar.className = 'show';
            }
        }, 500);
        progress = (loaded, total) => {
            if (loaded === total) {
                progressBar.className = '';
                finished = true;
            }
            progressBarFilled.style.width = Math.round(loaded / total * 100) + '%';
        };
    }

    // load application code and support libraries
    var BootstrapLoader = require('utils/bootstrap-loader');
    var importFuncs = {};
    var libraries = require('libraries');
    for (var key in libraries) {
        importFuncs[key] = libraries[key];
    }
    importFuncs['app'] = () => import('application' /* webpackChunkName: "app" */);
    BootstrapLoader.load(importFuncs, progress).then((modules) => {
        if (process.env.NODE_ENV === 'production') {
            var Promise = modules['bluebird'];
            Promise.config({
                warnings: false,
                longStackTraces: false,
                cancellation: false,
                monitoring: false
            });
        }

        var Application = modules['app'];
        var React = modules['react'];
        var ReactDOM = modules['react-dom'];
        var appElement = React.createElement(Application);
        ReactDOM.render(appElement, appContainer);
    });

    // install shims
    require('shims/iphone-overflow-scrolling');
    require('shims/iphone-image-reload');
}

window.addEventListener("unhandledrejection", function(evt) {
    var msg;
    if (evt.detail && evt.detail.reason) {
        var err = evt.detail.reason;
        if (process.env.NODE_ENV === 'production') {
            // don't display HTTP errors, since the browser automatically
            // dump that into the console
            if (!err.statusCode) {
                msg = err.message;
            }
        } else {
            // dump the error object during development
            msg = err;
        }
    }
    if (msg) {
        console.error(msg);
    }
    evt.preventDefault();
});
window.addEventListener("error", function(evt) {
    var msg;
    if (evt.error) {
        if (process.env.NODE_ENV === 'production') {
            msg = evt.error.message;
        } else {
            msg = evt.error;
        }
    } else {
        msg = evt.message;
    }
    if (msg) {
        console.error(msg);
    }
    evt.preventDefault();
});
