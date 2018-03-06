var _ = require('lodash');
var Promise = require('bluebird');
var React = require('react'), PropTypes = React.PropTypes;
var Relaks = require('relaks');
var UserFinder = require('objects/finders/user-finder');

var Database = require('data/database');
var Route = require('routing/route');
var Locale = require('locale/locale');
var Theme = require('theme/theme');

// widgets
var ProfileImage = require('widgets/profile-image');

require('./sign-off-menu.scss');

module.exports = Relaks.createClass({
    displayName: 'SignOffMenu',
    propTypes: {
        database: PropTypes.instanceOf(Database).isRequired,
        route: PropTypes.instanceOf(Route).isRequired,
        locale: PropTypes.instanceOf(Locale).isRequired,
        theme: PropTypes.instanceOf(Theme).isRequired,
    },

    renderAsync: function(meanwhile) {
        var db = this.props.database.use({ schema: 'global', by: this });
        return db.start().then((currentUserId) => {
            return UserFinder.findUser(db, currentUserId).then((user) => {
                var t = this.props.locale.translate;
                var p = this.props.locale.pick;
                var url = require('pages/user-summary-page').getURL({ userId: user.id });
                return (
                    <div className="sign-off-menu">
                        <a href={url}>
                            <ProfileImage user={user} theme={this.props.theme} size="large" />
                            <div className="name">
                                {p(user.details.name)}
                            </div>
                        </a>
                        <div className="sign-off" onClick={this.handleSignOffClick}>
                            {t('sign-off-menu-sign-off')}
                        </div>
                    </div>
                );
            })
        });
    },

    handleSignOffClick: function() {
        var db = this.props.database.use({ by: this });
        db.endSession().then(() => {
            this.props.route.push(require('pages/start-page'));
        });
    },
});
