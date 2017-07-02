var _ = require('lodash');
var React = require('react'), PropTypes = React.PropTypes;
var ReactMarked = require('react-marked');

module.exports = MarkDown;

function MarkDown(props) {
    var text = props.children;
    if (!text) {
        return null;
    }
    var options = props.options;
    var contents = ReactMarked(text, options);
    var containerProps = _.omit(props, 'options', 'children');
    return (
        <div {...containerProps}>
            {contents}
        </div>
    );
}

MarkDown.propTypes = {
    children: PropTypes.string,
};
