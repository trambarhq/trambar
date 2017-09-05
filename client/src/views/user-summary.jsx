var React = require('react'), PropTypes = React.PropTypes;

var Database = require('data/database');
var Route = require('routing/route');
var Locale = require('locale/locale');
var Theme = require('theme/theme');

// mixins
var UpdateCheck = require('mixins/update-check');

// widgets
var UserSection = require('widgets/user-section');
var Time = require('widgets/time');

require('./user-summary.scss');

module.exports = React.createClass({
    displayName: 'UserSummary',
    mixins: [ UpdateCheck ],
    propTypes: {
        user: PropTypes.object,
        roles: PropTypes.arrayOf(PropTypes.object),
        story: PropTypes.object,
        cornerPopUp: PropTypes.element,

        database: PropTypes.instanceOf(Database).isRequired,
        route: PropTypes.instanceOf(Route).isRequired,
        locale: PropTypes.instanceOf(Locale).isRequired,
        theme: PropTypes.instanceOf(Theme).isRequired,
    },

    render: function() {
        return (
            <UserSection className="summary">
                <header>
                    {this.renderProfileImage()}
                    {this.renderRoles()}
                    {this.props.cornerPopUp}
                </header>
                <subheader>
                    {this.renderName()}
                </subheader>
                <body>
                    {this.renderRecentActivities()}
                </body>
                <footer>
                    {this.renderMoreLink()}
                </footer>
            </UserSection>
        );
    },

    renderProfileImage: function() {
        var resources = _.get(this.props.user, 'details.resources');
        var profileImage = _.find(resources, { type: 'image' });
        var url = this.props.theme.getImageUrl(profileImage, { width: 80, height: 80 });
        return (
            <div className="profile-image">
                <img src={url} />
            </div>
        );
    },

    renderRoles: function() {
        var p = this.props.locale.pick;
        var names = _.map(this.props.roles, (role) => {
            return p(role.details.title) || role.name;
        });
        return (
            <span className="roles">
                {names.join(', ') || '\u00a0'}
            </span>
        );
    },

    renderName: function() {
        var p = this.props.locale.pick;
        var name = p(_.get(this.props.user, 'details.name', ''));
        return (
            <h2 className="name">
                {name}
            </h2>
        )
    },

    renderRecentActivities: function() {
        return (
            <div>
                <div>
                    <a href="#">Posted picture</a>
                    <Time time="2017-07-27" locale={this.props.locale}/>
                </div>
                <div>
                    <a href="#">Posted story</a>
                    <Time time="2017-07-01" locale={this.props.locale}/>
                </div>
                <div>
                    <a href="#">Commit changes</a>
                    <Time time="2017-06-01" locale={this.props.locale}/>
                </div>
            </div>
        )
    },

    renderMoreLink: function() {
        return (
            <a href="#">More...</a>
        );
    },
});
