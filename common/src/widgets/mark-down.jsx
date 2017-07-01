var _ = require('lodash');
var React = require('react'), PropTypes = React.PropTypes;
var ReactMarked = require('react-marked');

module.exports = MarkDown;
module.exports.isFormatted = isFormatted;

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

function isFormatted(text, options) {
    var check = function(children) {
        children = React.Children.toArray(children);
        return _.some(children, (element) => {
            if (element && element.type && element.props) {
                if (element.type !== 'p') {
                    return true;
                } else if (element.props.children) {
                    return check(element.props.children);
                }
            }
        })
    };
    var contents = ReactMarked(text, options);
    return check(contents);
}
