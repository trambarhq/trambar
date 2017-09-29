var React = require('react'), PropTypes = React.PropTypes;
var Moment = require('moment');
var Memoize = require('utils/memoize');

var Database = require('data/database');
var Route = require('routing/route');
var Locale = require('locale/locale');
var Theme = require('theme/theme');

var StoryTypes = require('data/story-types');

// mixins
var UpdateCheck = require('mixins/update-check');

// widgets
var StorySection = require('widgets/story-section');
var StoryText = require('widgets/story-text');
var ProfileImage = require('widgets/profile-image');
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
        repo: PropTypes.object,
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
                    {this.renderGraphic()}
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
        var props = {
            user: _.get(this.props.authors, 0),
            theme: this.props.theme,
            size: 'medium',
        };
        return <ProfileImage {...props} />;
    },

    /**
     * Render the names of the author and co-authors
     *
     * @return {ReactElement}
     */
    renderAuthorNames: function() {
        var t = this.props.locale.translate;
        var p = this.props.locale.pick;
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
                contents = p(authors[0].details.name);
                break;
            case 2:
                var name1 = p(authors[0].details.name);
                var name2 = p(authors[1].details.name);
                contents = t('story-author-$name1-and-$name2', name1, name2);
                break;
            default:
                var name = p(authors[0].details.name);
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

    renderGraphic: function() {
        var type = this.props.story.type;
        var Icon = StoryTypes.icons[type];
        if (type === 'issue') {
            var state = this.props.story.details.state;
            Icon = StoryTypes.icons[type + '.' + state];
        }
        if (Icon) {
            return (
                <div className="graphic">
                    <Icon className={type} />
                </div>
            );
        } else {
            return null;
        }
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
                {this.renderMedia()}
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
                return this.renderRepoText();
            case 'member':
                return this.renderMemberText();
            case 'push':
            case 'merge':
                return this.renderPushText();
            case 'issue':
                return this.renderIssueText();
            case 'milestone':
                return this.renderMilestoneText();
            case 'wiki':
                return this.renderWikiText();
            default:
                return this.renderStoryText();
        }
    },

    /**
     * Render text for regular post, task list, and survey
     *
     * @return {ReactElement}
     */
    renderStoryText: function() {
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
    },

    /**
     * Render text for repo story
     *
     * @return {ReactElement}
     */
    renderRepoText: function() {
        var t = this.props.locale.translate;
        var p = this.props.locale.pick;
        var story = this.props.story;
        var action = story.details.action;
        var repoName = p(_.get(this.props.repo, 'details.title')) || _.get(this.props.repo, 'name');
        var url = _.get(this.props.repo, 'details.web_url');
        return (
            <div className="repo">
                <p>
                    <a href={url} target="_blank">
                        {t(`story-repo-${action}-$name`, repoName)}
                    </a>
                </p>
            </div>
        );
    },

    /**
     * Render text for member story
     *
     * @return {ReactElement}
     */
    renderMemberText: function() {
        var t = this.props.locale.translate;
        var p = this.props.locale.pick;
        var story = this.props.story;
        var action = story.details.action;
        var repoName = p(_.get(this.props.repo, 'details.title')) || _.get(this.props.repo, 'name');
        var url = _.get(this.props.repo, 'details.web_url');
        return (
            <div className="member">
                <p>
                    <a href={url} target="_blank">
                        {t(`story-member-${action}-$repo`, repoName)}
                    </a>
                </p>
            </div>
        );
    },

    /**
     * Render text for issue story
     *
     * @return {ReactElement}
     */
    renderIssueText: function() {
        var t = this.props.locale.translate;
        var p = this.props.locale.pick;
        var story = this.props.story;
        var number = story.details.number;
        var title = story.details.title;
        var state = story.details.state;
        var repo = this.props.repo;
        var tags = _.map(story.details.labels, (label, i) => {
            var style;
            if (repo) {
                var index = _.indexOf(repo.details.labels, label);
                var color = _.get(repo.details.label_colors, index);
                if (color) {
                    style = { backgroundColor: color };
                }
            }
            return <span key={i} className="tag" style={style}>{label}</span>;
        });
        for (var i = 1; i < tags.length; i += 2) {
            tags.splice(i, 0, ' ');
        }
        var url;
        var baseUrl = _.get(this.props.repo, 'details.web_url');
        if (baseUrl) {
            var issueId = this.props.story.external_id;
            url = `${baseUrl}/issues/${issueId}`;
        }
        return (
            <div className="issue">
                <p>
                    <a href={url} target="_blank">
                        {t(`story-issue-opened-$number-$title`, number, p(title))}
                    </a>
                </p>
                <p className={`status-${state}`}>
                    <span>{t('story-issue-current-status')}</span>
                    {' '}
                    <span>{t(`story-issue-status-${state}`)}</span>
                </p>
                <p>{tags}</p>
            </div>
        );
    },

    /**
     * Render text for milestone story
     *
     * @return {ReactElement}
     */
    renderMilestoneText: function() {
        var t = this.props.locale.translate;
        var p = this.props.locale.pick;
        var story = this.props.story;
        var state = story.details.state;
        var title = story.details.title;
        var dueDate = formatDate(story.details.due_date);
        var startDate = formatDate(story.details.start_date) || '-';
        var url;
        var baseUrl = _.get(this.props.repo, 'details.web_url');
        if (baseUrl) {
            var milestoneId = this.props.story.external_id;
            url = `${baseUrl}/milestones/${milestoneId}`;
        }
        return (
            <div className="milestone">
                <p>
                    <a href={url} target="_blank">
                        {t(`story-milestone-created-$name`, p(title))}
                    </a>
                </p>
                <p className="start-date">
                    <span>{t('story-milestone-start-date')}</span>
                    {' '}
                    <span>{startDate}</span>
                </p>
                <p className="due-date">
                    <span className="label">{t('story-milestone-due-date')}</span>
                    {' '}
                    <span>{dueDate}</span>
                </p>
            </div>
        );
    },

    /**
     * Render text for wiki story
     *
     * @return {ReactElement}
     */
    renderWikiText: function() {
        var t = this.props.locale.translate;
        var story = this.props.story;
        var url = story.details.url;
        var title = _.capitalize(story.details.title);
        var action = story.details.action + 'd';
        if (action === 'deleted') {
            url = undefined;
        }
        return (
            <div className="wiki">
                <p>
                    <a href={url} target="_blank">
                        {t(`story-wiki-${action}-page-with-$title`, title)}
                    </a>
                </p>
            </div>
        );
    },


    /**
     * Render text for push story
     *
     * @return {ReactElement}
     */
    renderPushText: function() {
        var t = this.props.locale.translate;
        var p = this.props.locale.pick;
        var story = this.props.story;
        var files = _.get(this.props.story, 'details.files');
        var lines = _.get(this.props.story, 'details.lines');
        var commits = _.get(this.props.story, 'details.commit_ids.length');
        var repoName = p(_.get(this.props.repo, 'details.title')) || _.get(this.props.repo, 'name');
        var branch = story.details.branch;
        var fileChangeTypes = [ 'added', 'removed', 'modified', 'renamed' ];
        var fileChanges = _.transform(fileChangeTypes, (elements, type, i) => {
            var count = files[type];
            if (count > 0) {
                elements.push(
                    <li key={i} className={type}>
                        {t(`story-push-${type}-$count-files`, count)}
                    </li>
                );
            }
        }, []);
        var lineChangeTypes = [ 'added', 'removed' ];
        var lineChanges = _.transform(lineChangeTypes, (elements, type, i) => {
            var count = lines[type];
            if (count > 0) {
                elements.push(
                    <li key={i} className={type}>
                        {t(`story-push-${type}-$count-lines`, count)}
                    </li>
                );
            }
        }, []);
        var url;
        var baseUrl = _.get(this.props.repo, 'details.web_url');
        if (baseUrl) {
            var commitIdBefore = story.details.commit_id_before;
            var commitIdAfter = story.details.commit_id_after;
            if (story.details.commit_ids.length === 1) {
                url = `${baseUrl}/commit/${commitIdAfter}`;
            } else {
                url = `${baseUrl}/compare/${commitIdBefore}...${commitIdAfter}`;
            }
        }
        var text;
        if (story.type === 'push') {
            text = t(`story-push-pushed-to-$branch-of-$repo`, branch, repoName);
        } else if (story.type === 'merge') {
            var sourceBranches = story.details.source_branches;
            text = t(`story-push-merged-$branches-into-$branch-of-$repo`, sourceBranches, branch, repoName);
        }
        return (
            <div className="push">
                <p>
                    <a href={url} target="_blank">{text}</a>
                </p>
                <div>
                    <ul className="files">{fileChanges}</ul>
                    <ul className="lines">{lineChanges}</ul>
                </div>
            </div>
        );
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
    renderMedia: function() {
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

function formatDate(date) {
    date = _.trim(date);
    if (date) {
        var m = Moment(date);
        return m.format('ll');
    }
}
