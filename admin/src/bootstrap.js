window.addEventListener('load', initialize);

function initialize(evt) {
    var appContainer = document.getElementById('app-container');
    if (!appContainer) {
        throw new Error('Unable to find app element in DOM');
    }

    var progress;
    var progressBar = document.getElementById('bootstrap-progress-bar');
    var progressBarFilled = document.getElementById('bootstrap-progress-bar-filled');
    if (progressBar && progressBarFilled) {
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
        var AppCore = modules['app-core'];
        var Application = modules['app'];
        var React = modules['react'];
        var ReactDOM = modules['react-dom'];

        AppCore.start('admin').then((appProps) => {
            var appElement = React.createElement(Application, appProps);
            ReactDOM.render(appElement, appContainer);
        });
    });
}
