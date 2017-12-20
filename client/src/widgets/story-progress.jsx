var React = require('react'), PropTypes = React.PropTypes;

var Locale = require('locale/locale');

// widgets
var Time = require('widgets/time');

module.exports = StoryProgress;

require('./story-progress.scss');

function StoryProgress(props) {
    var contents;
    var status = props.status;
    if (status) {
        var t = props.locale.translate;
        contents = t(`story-status-${status.action}-$progress`, status.progress);
    } else {
        contents = <Time time={props.story.ptime} locale={props.locale} />;
    }
    return <span className="story-progress">{contents}</span>;
}

StoryProgress.propTypes = {
    status: PropTypes.object,
    story: PropTypes.object.isRequired,
    locale: PropTypes.instanceOf(Locale).isRequired,
};
