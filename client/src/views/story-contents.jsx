var React = require('react'), PropTypes = React.PropTypes;

var Database = require('data/database');
var Route = require('routing/route');
var Locale = require('locale/locale');
var Theme = require('theme/theme');

// mixins
var UpdateCheck = require('mixins/update-check');

// widgets
var StorySection = require('widgets/story-section');
var StoryText = require('widgets/story-text');
var MediaView = require('views/media-view');
var MultipleUserNames = require('widgets/multiple-user-names');
var Time = require('widgets/time');

require('./story-contents.scss');

module.exports = React.createClass({
    displayName: 'StoryContents',
    mixins: [ UpdateCheck ],
    propTypes: {
        story: PropTypes.object.isRequired,
        authors: PropTypes.arrayOf(PropTypes.object),
        currentUser: PropTypes.object.isRequired,
        pending: PropTypes.bool.isRequired,
        cornerPopUp: PropTypes.element,

        database: PropTypes.instanceOf(Database).isRequired,
        route: PropTypes.instanceOf(Route).isRequired,
        locale: PropTypes.instanceOf(Locale).isRequired,
        theme: PropTypes.instanceOf(Theme).isRequired,

        onChange: PropTypes.func,
    },

    /**
     * Return initial state of component
     *
     * @return {Object}
     */
    getInitialState: function() {
        return {
            userAnswers: {},
        };
    },

    componentWillReceiveProps: function(nextProps) {
        if (this.props.story !== nextProps.story) {
            if (this.props.story.type === 'task-list') {
                this.setState({ userAnswer: {} });
            }
        }
    },

    /**
     * Return true if the current user is one of the story's author
     *
     * @return {Boolean}
     */
    isCurrentUserAuthor: function() {
        var userIds = this.props.story.user_ids;
        var currentUserId = this.props.currentUser.id;
        return _.includes(userIds, currentUserId);
    },

    /**
     * Render component
     *
     * @return {ReactElement}
     */
    render: function() {
        return (
            <StorySection className="contents">
                <header>
                    {this.renderProfileImage()}
                    {this.renderAuthorNames()}
                    {this.props.cornerPopUp}
                </header>
                <subheader>
                    {this.renderTime()}
                </subheader>
                <body>
                    {this.renderContents()}
                </body>
            </StorySection>
        );
    },

    /**
     * Render the author's profile image
     *
     * @return {ReactElement}
     */
    renderProfileImage: function() {
        var leadAuthor = _.get(this.props.authors, 0);
        var resources = _.get(leadAuthor, 'details.resources');
        var profileImage = _.find(resources, { type: 'image' });
        var url = this.props.theme.getImageUrl(profileImage, 48, 48);
        return (
            <div className="profile-image">
                <img src={url} />
            </div>
        );
    },

    /**
     * Render the names of the author and co-authors
     *
     * @return {ReactElement}
     */
    renderAuthorNames: function() {
        var t = this.props.locale.translate;
        var authors = this.props.authors;
        if (!_.every(authors, _.isObject)) {
            authors = [];
        }
        var contents;
        switch (_.size(authors)) {
            // the list can be empty during loading
            case 0:
                contents = '\u00a0';
                break;
            case 1:
                contents = authors[0].details.name;
                break;
            case 2:
                var name1 = authors[0].details.name;
                var name2 = authors[1].details.name;
                contents = t('story-author-two-names', name1, name2);
                break;
            default:
                var name1 = authors[0].details.name;
                var coauthors = _.slice(authors, 1);
                var props = {
                    users: coauthors,
                    label: t('story-author-$count-others', coauthors.length),
                    title: t('story-coauthors'),
                    locale: this.props.locale,
                    theme: this.props.theme,
                    key: 2,
                };
                var others = <MultipleUserNames {...props} />
                contents = t('story-author-two-names', name1, others);
        }
        return <span className="name">{contents}</span>;
    },

    /**
     * Render the publication time
     *
     * @return {ReactElement}
     */
    renderTime: function() {
        if (this.props.pending) {
            var t = this.props.locale.translate;
            return <span className="time">{t('story-pending')}</span>;
        }
        var props = {
            time: this.props.story.ptime,
            locale: this.props.locale,
        };
        return <Time {...props} />
    },

    /**
     * Render the story's contents
     *
     * @return {ReactElement}
     */
    renderContents: function() {
        return (
            <div>
                {this.renderText()}
                {this.renderResources()}
            </div>
        )
    },

    /**
     * Render text of the story
     *
     * @return {ReactElement}
     */
    renderText: function() {
        var props = {
            story: this.props.story,
            locale: this.props.locale,
            theme: this.props.theme,
            answers: this.state.userAnswers,
            readOnly: !this.isCurrentUserAuthor(),
            onItemChange: this.handleItemChange,
        };
        return <StoryText {...props} />;
    },

    /**
     * Render attached media
     *
     * @return {ReactElement}
     */
    renderResources: function() {
        var resources = _.get(this.props.story, 'details.resources');
        if (_.isEmpty(resources)) {
            return null;
        }
        var props = {
            locale: this.props.locale,
            theme: this.props.theme,
            resources,
        };
        return <MediaView {...props} />
    },

    triggerChangeEvent: function(story) {
        if (this.props.onChange) {
            this.props.onChange({
                type: 'change',
                target: this,
                story,
            });
        }
    },

    /**
     * Called when user clicks on a checkbox or radio button
     *
     * @param  {Object} evt
     */
    handleItemChange: function(evt) {
        var target = evt.currentTarget;
        if (this.props.story.type === 'task-list') {
            if (!this.isCurrentUserAuthor()) {
                return false;
            }

            // save the answer in state for immediately UI response
            var list = target.name;
            var item = target.value;
            var selected = target.checked;
            var userAnswers = _.decoupleSet(this.state.userAnswers, [ list, item ], selected);
            this.setState({ userAnswers });

            // update the text of the story
            var story = _.clone(this.props.story);
            StoryText.updateList(story, target);
            this.triggerChangeEvent(story);
        } else if (this.props.story.type === 'vote') {

        }
    }
});
