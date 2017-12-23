var _ = require('lodash');
var Promise = require('bluebird');
var React = require('react'), PropTypes = React.PropTypes;

var Locale = require('locale/locale');
var Theme = require('theme/theme');

// mixins
var UpdateCheck = require('mixins/update-check');

// widgets
var DurationIndicator = require('widgets/duration-indicator');

require('./audio-editor.scss');

module.exports = React.createClass({
    displayName: 'AudioEditor',
    mixins: [ UpdateCheck ],
    propTypes: {
        resource: PropTypes.object,
        theme: PropTypes.instanceOf(Theme).isRequired,
        onChange: PropTypes.func,
    },

    render: function() {
        var duration = this.props.resource.duration;
        return (
            <div className="audio-editor">
                <div className="graphic">
                    <div className="icon">
                        <i className="fa fa-microphone" />
                    </div>
                    <div className="duration">
                        {DurationIndicator.format(duration)}
                    </div>
                </div>
            </div>
        );
    },
});
