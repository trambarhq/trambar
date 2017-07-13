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

require('./user-story.scss');

module.exports = React.createClass({
    displayName: 'UserStory',
    mixins: [ UpdateCheck ],
    propTypes: {
        user: PropTypes.object,
        roles: PropTypes.arrayOf(PropTypes.object),
        story: PropTypes.object,

        database: PropTypes.instanceOf(Database).isRequired,
        route: PropTypes.instanceOf(Route).isRequired,
        locale: PropTypes.instanceOf(Locale).isRequired,
        theme: PropTypes.instanceOf(Theme).isRequired,
    },

    render: function() {
        return (
            <UserSection className="story">
                <header>
                    {this.renderProfileImage()}
                    {this.renderRoles()}
                </header>
                <subheader>
                    {this.renderName()}
                    {this.renderTime()}
                </subheader>
                <body>
                    {this.renderStoryContents()}
                </body>
                <footer>
                    {this.renderLink()}
                </footer>
            </UserSection>
        );
    },

    renderProfileImage: function() {
        var resources = _.get(this.props.user, 'details.resources');
        var profileImage = _.find(resources, { type: 'image' });
        var url = this.props.theme.getImageUrl(profileImage, 96, 96);
        return (
            <div className="profile-image">
                <img src={url} />
            </div>
        );
    },

    renderRoles: function() {
        var names = _.map(this.props.roles, 'details.name');
        return (
            <span className="roles">
                {names.join(', ') || '\u00a0'}
            </span>
        );
    },

    renderName: function() {
        var name = _.get(this.props.user, 'details.name', '');
        return (
            <h2 className="name">
                {name}
            </h2>
        )
    },

    renderTime: function() {
        var time = '2017-06-14';
        return <Time time={time} locale={this.props.locale} />;
    },

    renderStoryContents: function() {
        return (
            <div>
                Story here
            </div>
        )
    },

    renderLink: function() {

    },
});
