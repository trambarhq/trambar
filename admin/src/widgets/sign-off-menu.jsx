var _ = require('lodash');
var Promise = require('bluebird');
var React = require('react'), PropTypes = React.PropTypes;
var Relaks = require('relaks');

var Database = require('data/database');
var Locale = require('locale/locale');
var Theme = require('theme/theme');

// widgets
var ProfileImage = require('widgets/profile-image');

require('./sign-off-menu.scss');

module.exports = Relaks.createClass({
    displayName: 'SignOffMenu',
    propTypes: {
        database: PropTypes.instanceOf(Database).isRequired,
        locale: PropTypes.instanceOf(Locale).isRequired,
        theme: PropTypes.instanceOf(Theme).isRequired,

        onSignOff: PropTypes.func,
    },

    renderAsync: function(meanwhile) {
        var db = this.props.database.use({ schema: 'global', by: this });
        return db.start().then((currentUserId) => {
            var criteria = {
                id: currentUserId,
            };
            return db.findOne({ table: 'user', criteria });
        }).then((user) => {
            var t = this.props.locale.translate;
            var p = this.props.locale.pick;
            var url = require('pages/user-summary-page').getUrl({ userId: user.id });
            return (
                <div className="sign-off-menu">
                    <a href={url}>
                        <ProfileImage user={user} theme={this.props.theme} size="large" />
                        <div className="name">
                            {p(user.details.name)}
                        </div>
                    </a>
                    <div className="sign-off" onClick={this.props.onSignOff}>
                        {t('sign-off-menu-sign-off')}
                    </div>
                </div>
            );
        });
    },
});
