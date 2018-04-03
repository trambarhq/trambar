if (process.env.PLATFORM === 'cordova') {
    if (window.cordova) {
        document.addEventListener('deviceready', initialize);
        window.addEventListener("unhandledrejection", function(evt) {
            console.error(evt);
            evt.preventDefault();
        });
        window.addEventListener("error", function(evt) {
            console.error(evt.error || evt.message);
            evt.preventDefault();
        });
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
    var app = () => import('application' /* webpackChunkName: "app" */);
    var importFuncs = { app };
    var libraries = require('libraries');
    for (var key in libraries) {
        importFuncs[key] = libraries[key];
    }
    BootstrapLoader.load(importFuncs, progress).then((modules) => {
        var Application = modules['app'];
        var React = modules['react'];
        var ReactDOM = modules['react-dom'];
        var appElement = React.createElement(Application);
        ReactDOM.render(appElement, appContainer);
    });

    // install Safari specific shim
    var bodyStyle = getComputedStyle(document.body);
    if (bodyStyle.WebkitOverflowScrolling !== undefined) {
        // need to disable momentum scrolling when textarea has focus
        // to prevent rendering glitch
        window.addEventListener('focusin', (evt) => {
            if (evt.target.tagName === 'TEXTAREA') {
                document.body.style.WebkitOverflowScrolling = 'auto';
            }
        });
        window.addEventListener('focusout', (evt) => {
            if (evt.target.tagName === 'TEXTAREA') {
                document.body.style.WebkitOverflowScrolling = '';
            }
        });
        window.addEventListener('mousedown', (evt) => {
            if (evt.target.tagName === 'INPUT' || evt.target.tagName === 'LABEL') {
                document.body.style.WebkitOverflowScrolling = 'auto';
            }
        });
        window.addEventListener('mouseup', (evt) => {
            if (evt.target.tagName === 'INPUT' || evt.target.tagName === 'LABEL') {
                document.body.style.WebkitOverflowScrolling = '';
            }
        });
    }
}
