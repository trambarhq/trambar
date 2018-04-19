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
    BootstrapLoader.load(importFuncs).then((modules) => {
        var Application = modules['app'];
        var React = modules['react'];
        var ReactDOM = modules['react-dom'];
        var appElement = React.createElement(Application);
        ReactDOM.render(appElement, appContainer);
    });
}
