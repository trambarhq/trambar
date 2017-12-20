var _ = require('lodash');
var React = require('react'), PropTypes = React.PropTypes;

var Locale = require('locale/locale');
var Theme = require('theme/theme');

module.exports = MediaPlaceholder;

require('./media-placeholder.scss');

function MediaPlaceholder(props) {
    if (props.theme.mode === 'columns-1') {
        return null;
    }
    var t = props.locale.translate;
    var phraseIds;
    if (process.env.PLATFORM !== 'mobile') {
        if (props.showHints) {
            phraseIds = [
                'story-drop-files-here',
                'story-paste-image-here',
            ]
        }
    }
    var messages = _.map(phraseIds, (phraseId, index) => {
        var style = {
            animationDelay: `${10 * index}s`
        };
        return (
            <div key={index} className="message" style={style}>
                {t(phraseId)}
            </div>
        )
    });
    return (
        <div className="media-placeholder">
            {messages}
        </div>
    );
}

MediaPlaceholder.propTypes = {
    showHints: PropTypes.bool,
    locale: PropTypes.instanceOf(Locale).isRequired,
    theme: PropTypes.instanceOf(Theme).isRequired,
};
