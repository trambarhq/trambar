var React = require('react');
var ReactDOM = require('react-dom');

var Application = require('application');

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
    var appElement = React.createElement(Application);
    ReactDOM.render(appElement, appContainer);
}

window.addEventListener("unhandledrejection", function(evt) {
    console.error(evt);
    evt.preventDefault();
});

window.addEventListener("error", function(e) {
    console.error(evt.error || evt.message);
    evt.preventDefault();
});
