var _ = require('lodash');
var React = require('react');

module.exports = PushButton;

require('./push-button.scss');

function PushButton(props) {
    props = _.clone(props)
    if (props.className) {
        props.className = 'push-button ' + props.className;
    } else {
        props.className = 'push-button';
    }
    return <button {...props}>{props.children}</button>;
}

PushButton.defaultProps = {
    className: 'submit'
};
