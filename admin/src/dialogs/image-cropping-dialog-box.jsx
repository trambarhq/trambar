var _ = require('lodash');
var React = require('react'), PropTypes = React.PropTypes;

var Database = require('data/database');
var Locale = require('locale/locale');
var Theme = require('theme/theme');

// widgets
var Overlay = require('widgets/overlay');
var PushButton = require('widgets/push-button');

require('./image-cropping-dialog-box.scss');

module.exports = React.createClass({
    displayName: 'ImageCroppingDialogBox',
    propTypes: {
        image: PropTypes.object,

        locale: PropTypes.instanceOf(Locale).isRequired,
        theme: PropTypes.instanceOf(Theme).isRequired,

        onChange: PropTypes.func,
        onCancel: PropTypes.func,
    },

    render: function() {
        return (
            <Overlay show={this.props.show}>
                {this.renderImage()}
                {this.renderButtons()}
            </Overlay>
        );
    },

    renderImage: function() {

    },

    renderButtons: function() {

    },
});
