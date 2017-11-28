var React = require('react'), PropTypes = React.PropTypes;

var Database = require('data/database');
var Route = require('routing/route');
var Locale = require('locale/locale');
var Theme = require('theme/theme');

// mixins
var UpdateCheck = require('mixins/update-check');

// widgets
var UserSection = require('widgets/user-section');
var ProfileImage = require('widgets/profile-image');
var Time = require('widgets/time');
var Link = require('widgets/link');

require('./user-summary.scss');

module.exports = React.createClass({
    displayName: 'UserSummary',
    mixins: [ UpdateCheck ],
    propTypes: {
        user: PropTypes.object,
        roles: PropTypes.arrayOf(PropTypes.object),
        stories: PropTypes.arrayOf(PropTypes.object),
        cornerPopUp: PropTypes.element,

        database: PropTypes.instanceOf(Database).isRequired,
        route: PropTypes.instanceOf(Route).isRequired,
        locale: PropTypes.instanceOf(Locale).isRequired,
        theme: PropTypes.instanceOf(Theme).isRequired,
    },

    getUrl: function(story) {
        var params = this.props.route.parameters;
        var url = this.props.route.find(require('pages/person-page'), {
            schema: params.schema,
            user: this.props.user.id,
            story: (story) ? story.id : 0,
        });
        return url;
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
                    {this.renderTag()}
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

    /**
     * Render the user's profile image
     *
     * @return {ReactElement}
     */
    renderProfileImage: function() {
        var props = {
            user: this.props.user,
            theme: this.props.theme,
            size: 'large',
        };
        return <ProfileImage {...props} />;
    },

    /**
     * Render the user's roles
     *
     * @return {ReactElement}
     */
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

    /**
     * Render name of user
     *
     * @return {ReactElement}
     */
    renderName: function() {
        var user = this.props.user;
        var p = this.props.locale.pick;
        var name = (user) ? p(user.details.name) : '\u00a0';
        return <h2 className="name">{name}</h2>;
    },

    /**
     * Render username
     *
     * @return {ReactElement}
     */
    renderTag: function() {
        var t = this.props.locale.translate;
        var user = this.props.user;
        var tag = (user) ? `@${user.username}` : '\u00a0';
        return (
            <h3 className="tag" ref="tag" onClick={this.handleTagClick}>
                {tag}
            </h3>
        );
    },

    /**
     * Render the user's recent activities
     *
     * @return {ReactElement}
     */
    renderRecentActivities: function() {
        var stories = _.slice(this.props.stories).reverse();
        // TODO: remove this once listing can be limited in length
        stories = _.slice(stories, 0, 5);
        return (
            <div>
                {_.map(stories, this.renderActivity)}
            </div>
        );
    },

    /**
     * Render a brief description about a story
     *
     * @param  {Story} story
     *
     * @return {ReactElement}
     */
    renderActivity: function(story) {
        var t = this.props.locale.translate;
        var n = this.props.locale.name;
        var user = this.props.user;
        var name = n(_.get(user, 'details.name'), _.get(user, 'details.gender'));
        var text;
        switch (story.type) {
            case 'push':
                text = t(`user-summary-$name-pushed-code`, name);
                break;
            case 'merge':
                text = t(`user-summary-$name-merged-code`, name);
                break;
            case 'issue':
                text = t(`user-summary-$name-opened-an-issue`, name);
                break;
            case 'milestone':
                text = t(`user-summary-$name-created-a-milestone`, name);
                break;
            case 'wiki':
                text = t(`user-summary-$name-edited-wiki-page`, name);
                break;
            case 'member':
            case 'repo':
                var action = story.details.action;
                text = t(`user-summary-$name-${action}-repo`, name);
                break;
            case 'story':
                var resources = story.details.resources;
                if (_.some(resources, { type: 'image' })) {
                    text = t(`user-summary-$name-posted-a-picture`, name);
                } else if (_.some(resources, { type: 'video' })) {
                    text = t(`user-summary-$name-posted-a-video-clip`, name);
                } else if (_.some(resources, { type: 'audio' })) {
                    text = t(`user-summary-$name-posted-an-audio-clip`, name);
                } else if (_.some(resources, { type: 'website' })) {
                    text = t(`user-summary-$name-posted-a-link`, name);
                } else {
                    text = t(`user-summary-$name-wrote-a-post`, name);
                }
                break;
            case 'survey':
                text = t(`user-summary-$name-started-survey`, name);
                break;
            case 'task-list':
                text = t(`user-summary-$name-started-task-list`, name);
                break;
        }
        var url = this.getUrl(story);
        return (
            <div className="activity" key={story.id}>
                <Link url={url}>{text}</Link>
                <Time time={story.ptime} locale={this.props.locale}/>
            </div>
        );
    },

    /**
     * Render a "more..." link if there are stories
     *
     * @return {ReactElement|null}
     */
    renderMoreLink: function() {
        if (_.isEmpty(this.props.stories)) {
            return null;
        }
        var t = this.props.locale.translate;
        var url = this.getUrl();
        return (
            <Link url={url}>{t('user-summary-more')}</Link>
        );
    },

    /**
     * Call when user clicks on the user tag
     *
     * @param  {Event} evt
     */
    handleTagClick: function(evt) {
        // just select the text
        var range = document.createRange();
        range.selectNode(this.refs.tag);
        window.getSelection().removeAllRanges();
        window.getSelection().addRange(range);
    },
});
