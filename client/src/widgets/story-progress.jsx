var React = require('react'), PropTypes = React.PropTypes;
var StoryUtils = require('objects/utils/story-utils');

var Locale = require('locale/locale');

// widgets
var Time = require('widgets/time');

module.exports = StoryProgress;

require('./story-progress.scss');

function StoryProgress(props) {
    var t = props.locale.translate;
    var contents;
    if (props.pending || !StoryUtils.isActuallyPublished(props.story)) {
        // not saved yet
        contents = t('story-status-storage-pending');
    } else {
        var status = props.status;
        if (status) {
            contents = t(`story-status-${status.action}-$progress`, status.progress);
        } else {
            contents = <Time time={props.story.ptime} locale={props.locale} />;
        }
    }
    return <span className="story-progress">{contents}</span>;
}

StoryProgress.propTypes = {
    status: PropTypes.object,
    story: PropTypes.object.isRequired,
    locale: PropTypes.instanceOf(Locale).isRequired,
};
