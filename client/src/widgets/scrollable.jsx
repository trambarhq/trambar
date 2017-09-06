var _ = require('lodash');
var React = require('react');

module.exports = Scrollable;

require('./scrollable.scss');

function Scrollable(props) {
    var className = 'scrollable';
    if (props.className) {
        className += ' ' + props.className;
    }
    props = _.clone(props);
    props.className = className;
    return <div {...props}>{props.children}</div>;
}