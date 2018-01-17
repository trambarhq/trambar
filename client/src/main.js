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

window.addEventListener("unhandledrejection", function(e) {
    console.log(e);
    e.preventDefault();
});

// NOTE: event name is all lower case as per DOM convention
window.addEventListener("rejectionhandled", function(e) {
    console.log(e);
    e.preventDefault();
});

window.addEventListener("error", function(e) {
    console.log(e);
})
