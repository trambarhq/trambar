var _ = require('lodash');
var React = require('react'), PropTypes = React.PropTypes;

var Route = require('routing/route');
var Locale = require('locale/locale');
var Theme = require('theme/theme');

// mixins
var UpdateCheck = require('mixins/update-check');

// widgets
var Tooltip = require('widgets/tooltip');
var ProfileImage = require('widgets/profile-image');

require('./user-tooltip.scss');

module.exports = React.createClass({
    displayName: 'UserTooltip',
    mixins: [ UpdateCheck ],
    propTypes: {
        users: PropTypes.arrayOf(PropTypes.object),
        project: PropTypes.object,
        route: PropTypes.instanceOf(Route).isRequired,
        locale: PropTypes.instanceOf(Locale).isRequired,
        theme: PropTypes.instanceOf(Theme).isRequired,
        disabled: PropTypes.bool,
    },

    render: function() {
        if (this.props.users == null) {
            return null;
        }
        var t = this.props.locale.translate;
        var route = this.props.route;
        var label = t('user-tooltip-$count', this.props.users.length);
        var users = this.props.users;
        var ellipsis;
        if (users.length > 10) {
            users = _.slice(users, 0, 10);
            ellipsis = <div className="ellipsis"><i className="fa fa-ellipsis-v" /></div>;
        }
        var list = _.map(users, (user, i) => {
            var url;
            if (this.props.project) {
                url = route.find(require('pages/user-summary-page'), {
                    project: this.props.project.id,
                    user: user.id,
                });
            } else {
                url = route.find(require('pages/user-summary-page'), {
                    user: user.id,
                });
            }
            return (
                <div className="item" key={i}>
                    <a href={url}>
                        <ProfileImage user={user} theme={this.props.theme} />
                        {' '}
                        {user.details.name}
                    </a>
                </div>
            );
        });
        var listUrl;
        if (this.props.project) {
            listUrl = route.find(require('pages/member-list-page'), {
                project: this.props.project.id,
            });
        } else {
            listUrl = route.find(require('pages/user-list-page'));
        }
        return (
            <Tooltip className="user" disabled={list.length === 0}>
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
});
