var _ = require('lodash');
var React = require('react'), PropTypes = React.PropTypes;

var Locale = require('locale/locale');
var Theme = require('theme/theme');

// pages
var MemberListPage = require('pages/member-list-page');
var UserSummaryPage = require('pages/user-summary-page');

// widgets
var Tooltip = require('widgets/tooltip');

require('./user-tooltip.scss');

module.exports = UserTooltip;

function UserTooltip(props) {
    if (props.users == null) {
        return null;
    }
    var t = props.locale.translate;
    var label = t('user-tooltip-$count', props.users.length);
    var users = props.users;
    var ellipsis;
    if (users.length > 10) {
        users = _.slice(users, 0, 10);
        ellipsis = <div className="ellipsis"><i className="fa fa-ellipsis-v" /></div>;
    }
    var list = _.map(users, (user, i) => {
        var url = UserSummaryPage.getUrl({
            projectId: props.project.id,
            userId: user.id,
        });
        var resources = _.get(user, 'details.resources');
        var profileImage = _.find(resources, { type: 'image' });
        var imageUrl = props.theme.getImageUrl(profileImage, 24, 24);
        return (
            <div className="item" key={i}>
                <a href={url}>
                    <img className="profile-image" src={imageUrl} />
                    {' '}
                    {user.details.name}
                </a>
            </div>
        );
    });
    var listUrl = MemberListPage.getUrl({
        projectId: props.project.id,
    });
    return (
        <Tooltip className="user">
            <inline>{label}</inline>
            <window>
                {list}
                {ellipsis}
                <div className="bottom">
                    <a href={listUrl}>{t('tooltip-more')}</a>
                </div>
            </window>
        </Tooltip>
    );
}

UserTooltip.propTypes = {
    users: PropTypes.arrayOf(PropTypes.object),
    project: PropTypes.object.isRequired,
    locale: PropTypes.instanceOf(Locale).isRequired,
    theme: PropTypes.instanceOf(Theme).isRequired,
};
