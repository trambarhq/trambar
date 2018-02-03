var React = require('react'), PropTypes = React.PropTypes;
var ReactionUtils = require('objects/utils/reaction-utils');

var Locale = require('locale/locale');

// widgets
var Time = require('widgets/time');

module.exports = ReactionProgress;

require('./reaction-progress.scss');

function ReactionProgress(props) {
    var t = props.locale.translate;
    var contents;
    if (!ReactionUtils.isActuallyPublished(props.reaction)) {
        // not saved yet
        contents = t('reaction-status-storage-pending');
    } else {
        var status = props.status;
        if (status) {
            contents = t(`reaction-status-${status.action}`);
        } else {
            contents = <Time time={props.reaction.ptime} locale={props.locale} />;
        }
    }
    return <span className="reaction-progress">{contents}</span>;
}

ReactionProgress.propTypes = {
    status: PropTypes.object,
    reaction: PropTypes.object.isRequired,
    locale: PropTypes.instanceOf(Locale).isRequired,
};
