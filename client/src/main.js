var React = require('react');
var ReactDOM = require('react-dom');

var Application = require('application');

if (process.env.PLATFORM === 'cordova') {
    document.addEventListener('deviceready', initialize);
} else if (process.env.PLATFORM === 'browser') {
    window.addEventListener('load', initialize);
}

console.log(process.env.PLATFORM);

function initialize(evt) {
    console.log('initializing');
    var appContainer = document.getElementById('app');
    if (!appContainer) {
        throw new Error('Unable to find app element in DOM');
    }
    var appProps = {
    };
    var appElement = React.createElement(Application, appProps)
    ReactDOM.render(appElement, appContainer);
}
