var React = require('react'), PropTypes = React.PropTypes;
var Memoize = require('utils/memoize');

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
var PushButton = require('widgets/push-button');

require('./story-contents.scss');

module.exports = React.createClass({
    displayName: 'StoryContents',
    mixins: [ UpdateCheck ],
    propTypes: {
        story: PropTypes.object.isRequired,
        authors: PropTypes.arrayOf(PropTypes.object),
        currentUser: PropTypes.object.isRequired,
        reactions: PropTypes.arrayOf(PropTypes.object),
        pending: PropTypes.bool.isRequired,
        cornerPopUp: PropTypes.element,

        database: PropTypes.instanceOf(Database).isRequired,
        route: PropTypes.instanceOf(Route).isRequired,
        locale: PropTypes.instanceOf(Locale).isRequired,
        theme: PropTypes.instanceOf(Theme).isRequired,

        onChange: PropTypes.func,
        onReaction: PropTypes.func,
    },

    /**
     * Return initial state of component
     *
     * @return {Object}
     */
    getInitialState: function() {
        return {
            userAnswers: {},
            voteSubmitted: false,
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
     * Return true if the current user has already voted
     *
     * @return {Boolean|undefined}
     */
    hasUserVoted: function() {
        if (this.props.reactions === null) {
            return undefined;
        }
        var vote = getUserVote(this.props.reactions, this.props.currentUser);
        return !!vote;
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
                <footer>
                    {this.renderButtons()}
                </footer>
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
                contents = t('story-author-$name1-and-$name2', name1, name2);
                break;
            default:
                var name = authors[0].details.name;
                var coauthors = _.slice(authors, 1);
                var props = {
                    users: coauthors,
                    label: t('story-author-$count-others', coauthors.length),
                    title: t('story-coauthors'),
                    locale: this.props.locale,
                    theme: this.props.theme,
                    key: 1,
                };
                var users = <MultipleUserNames {...props} />
                contents = t('story-author-$name-and-$users', name, users, coauthors.length);
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
        var t = this.props.locale.translate;
        var p = this.props.locale.pick;
        switch (this.props.story.type) {
            case 'repo':
                var action = _.get(this.props.story, 'details.action');
                var name = _.get(this.props.story, 'details.name');
                return t(`story-repo-${action}`, name);
            case 'member':
                var action = _.get(this.props.story, 'details.action');
                return t(`story-member-${action}`);
            case 'push':
                var files = _.get(this.props.story, 'details.files');
                var lines = _.get(this.props.story, 'details.lines');
                var commits = _.get(this.props.story, 'details.commit_ids.length');
                return t(`story-push`, commits, files, lines);
            case 'issue':
                var state = _.get(this.props.story, 'details.state');
                var title = _.get(this.props.story, 'details.title');
                var labels = _.get(this.props.story, 'details.labels');
                var number = _.get(this.props.story, 'details.number');
                return t(`story-issue`, number, p(title), state);
            case 'milestone':
                var state = _.get(this.props.story, 'details.state');
                var title = _.get(this.props.story, 'details.title');
                var dueDate= _.get(this.props.story, 'details.due_date');
                var startDate= _.get(this.props.story, 'details.start_date');
                return t(`story-milestone`, p(title), state);
            default:
                var textProps = {
                    story: this.props.story,
                    locale: this.props.locale,
                    theme: this.props.theme,
                    answers: this.state.userAnswers,
                    readOnly: !this.isCurrentUserAuthor(),
                    onItemChange: this.handleItemChange,
                };
                if (this.props.story.type === 'survey') {
                    if (this.hasUserVoted()) {
                        textProps.voteCounts = countVotes(this.props.reactions);
                    }
                }
                return <StoryText {...textProps} />;
        }
    },

    /**
     * Render button for filling survey
     *
     * @return {ReactElement|null}
     */
    renderButtons: function() {
        if (this.props.story.type !== 'survey') {
            return null;
        }
        if (this.hasUserVoted() !== false) {
            return null;
        }
        var t = this.props.locale.translate;
        var submitProps = {
            label: t('story-vote-submit'),
            emphasized: !_.isEmpty(this.state.userAnswers),
            disabled: this.state.voteSubmitted || _.isEmpty(this.state.userAnswers),
            onClick: this.handleVoteSubmitClick,
        };
        return (
            <div className="buttons">
                <PushButton {...submitProps} />
            </div>
        );
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

    triggerReactionEvent: function(reaction) {
        if (this.props.onReaction) {
            this.props.onReaction({
                type: 'reaction',
                target: this,
                reaction,
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
        } else if (this.props.story.type === 'survey') {
            var list = target.name;
            var value = parseInt(target.value);
            var userAnswers = _.decoupleSet(this.state.userAnswers, [ list ], value);
            this.setState({ userAnswers });
        }
    },

    /**
     * Called when user clicks on the submit button
     *
     * @param  {Event} evt
     */
    handleVoteSubmitClick: function(evt) {
        var story = this.props.story;
        var reaction = {
            type: 'vote',
            story_id: story.id,
            user_id: this.props.currentUser.id,
            target_user_ids: story.user_ids,
            published: true,
            details: {
                answers: this.state.userAnswers
            }
        };
        this.triggerReactionEvent(reaction);
        this.setState({ voteSubmitted: true });
    },
});

var countVotes = Memoize(function(reactions) {
    var tallies = {};
    _.each(reactions, (reaction) => {
        if (reaction.type === 'vote' ) {
            _.forIn(reaction.details.answers, (value, name) => {
                var totalPath = [ name, 'total' ];
                var newTotal = _.get(tallies, totalPath, 0) + 1;
                _.set(tallies, totalPath, newTotal);
                var countPath = [ name, 'answers', value ];
                var newCount = _.get(tallies, countPath, 0) + 1;
                _.set(tallies, countPath, newCount);
            });
        }
    });
    return tallies;
});

var getUserVote = Memoize(function(reactions, user) {
    if (user) {
        return _.find(reactions, { type: 'vote', user_id: user.id })
    } else {
        return null;
    }
});
