var _ = require('lodash');
var Promise = require('bluebird');
var Moment = require('moment');
var React = require('react'), PropTypes = React.PropTypes;

var Locale = require('locale/locale');
var Theme = require('theme/theme');

// mixins
var UpdateCheck = require('mixins/update-check');

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
                        {formatDuration(duration)}
                    </div>
                </div>
            </div>
        );
    },
});

function formatDuration(duration) {
    duration = Math.round(duration / 1000);
    var hr = String(Math.floor(duration / 3600));
    var min = String(Math.floor(duration / 60) % 60);
    var sec = String(duration % 60);
    if (hr.length === 1) {
        hr = '0' + hr;
    }
    if (min.length === 1) {
        min = '0' + min;
    }
    if (sec.length === 1) {
        sec = '0' + sec;
    }
    return `${hr}:${min}:${sec}`;
}
