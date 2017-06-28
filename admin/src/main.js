var React = require('react');
var ReactDOM = require('react-dom');

var Application = require('application');

window.addEventListener('load', initialize);

function initialize(evt) {
    var appContainer = document.getElementById('app-container');
    if (!appContainer) {
        throw new Error('Unable to find app element in DOM');
    }
    var appProps = {
    };
    var appElement = React.createElement(Application, appProps)
    ReactDOM.render(appElement, appContainer);
}
