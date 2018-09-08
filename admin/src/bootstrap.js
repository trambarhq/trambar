window.addEventListener('load', initialize);

function initialize(evt) {
    var appContainer = document.getElementById('app-container');
    if (!appContainer) {
        throw new Error('Unable to find app element in DOM');
    }

    // load application code and support libraries
    var BootstrapLoader = require('utils/bootstrap-loader');
    var importFuncs = {};
    var libraries = require('libraries');
    for (var key in libraries) {
        importFuncs[key] = libraries[key];
    }
    importFuncs['app'] = () => import('application' /* webpackChunkName: "app" */);
    BootstrapLoader.load(importFuncs, showProgress).then((modules) => {
        var AppCore = modules['app-core'];
        var Application = modules['app'];
        var React = modules['react'];
        var ReactDOM = modules['react-dom'];

        AppCore.start(Application).then((appProps) => {
            var appElement = React.createElement(Application, appProps);
            ReactDOM.render(appElement, appContainer);
            hideSplashScreen();
        });
    });
}

function hideSplashScreen() {
    var screen = document.getElementById('splash-screen');
    var style = document.getElementById('splash-screen-style');
    if (screen) {
        screen.className = 'transition-out';
        setTimeout(() => {
            if (screen.parentNode) {
                screen.parentNode.removeChild(screen);
            }
            if (style && style.parentNode) {
                style.parentNode.removeChild(style);
            }
        }, 1000);
    }
}

function showProgress(loaded, total) {
    let progressBar = document.getElementById('bootstrap-progress-bar');
    let progressBarFilled = document.getElementById('bootstrap-progress-bar-filled');

    if (progressBar && progressBarFilled) {
        if (loaded < total) {
            if (progressBar.className !== 'show') {
                progressBar.className = 'show';
            }
        } else {
            progressBar.className = '';
        }
        progressBarFilled.style.width = Math.round(loaded / total * 100) + '%';
    }
}
