var _ = require('lodash');
var React = require('react'), PropTypes = React.PropTypes;
var Moment = require('moment');
var Memoize = require('utils/memoize');
var ListParser = require('utils/list-parser');
var Markdown = require('utils/markdown');
var PlainText = require('utils/plain-text');
var UserUtils = require('objects/utils/user-utils');
var LinkUtils = require('objects/utils/link-utils');

var Database = require('data/database');
var Route = require('routing/route');
var Locale = require('locale/locale');
var Theme = require('theme/theme');

var StoryTypes = require('objects/types/story-types');

// mixins
var UpdateCheck = require('mixins/update-check');

// widgets
var StorySection = require('widgets/story-section');
var ProfileImage = require('widgets/profile-image');
var MediaView = require('views/media-view');
var MediaDialogBox = require('dialogs/media-dialog-box');
var MultipleUserNames = require('widgets/multiple-user-names');
var AppComponent = require('views/app-component');
var AppComponentDialogBox = require('dialogs/app-component-dialog-box');
var Scrollable = require('widgets/scrollable');
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
        status: PropTypes.object,
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
        var nextState = {
            voteSubmitted: false,
            selectedComponent: null,
            showingComponentDialog: false,
            renderingComponentDialog: false,
            selectedResourceUrl: null,
            showingReferencedMediaDialog: false,
            renderingReferencedMediaDialog: false,
        };
        this.updateUserAnswers({}, nextState);
        return nextState;
    },

    /**
     * Update state when props changes
     *
     * @param  {Object} nextProps
     */
    componentWillReceiveProps: function(nextProps) {
        var nextState = _.clone(this.state);
        if (this.props.story !== nextProps.story) {
            this.updateUserAnswers(nextState, nextProps);
        }
        var changes = _.shallowDiff(nextState, this.state);
        if (!_.isEmpty(changes)) {
            this.setState(changes);
        }
    },

    /**
     * Update the default answers of survey question
     *
     * @param  {Object} nextState
     * @param  {Object} nextProps
     */
    updateUserAnswers: function(nextState, nextProps) {
        if (nextProps.story) {
            if (nextProps.story.type === 'survey') {
                var p = nextProps.locale.pick;
                var langText = p(nextProps.story.details.text);
                var tokens = ListParser.extract(langText);
                var answers = nextState.userAnswers;
                _.each(tokens, (list, listIndex) => {
                    _.each(list, (item, itemIndex) => {
                        if (item.checked) {
                            if (!answers || answers[item.list] === undefined) {
                                answers = _.decoupleSet(answers, [ item.list ], item.key);
                            }
                        }
                    });
                });
                nextState.userAnswers = answers;
            } else if (nextProps.story.type === 'task-list') {
                nextState.userAnswers = null;
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
                    {this.renderProgress()}
                    {this.renderEmblem()}
                </subheader>
                <body>
                    {this.renderText()}
                    {this.renderMedia()}
                    {this.renderReferencedMediaDialog()}
                    {this.renderAppComponents()}
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
        var props = {
            user: leadAuthor,
            theme: this.props.theme,
            size: 'medium',
        };
        if (leadAuthor) {
            var url = this.props.route.find(require('pages/person-page'), {
                schema: this.props.route.parameters.schema,
                user: leadAuthor.id,
            });
        }
        return <a href={url}><ProfileImage {...props} /></a>;
    },

    /**
     * Render the names of the author and co-authors
     *
     * @return {ReactElement}
     */
    renderAuthorNames: function() {
        var t = this.props.locale.translate;
        var n = this.props.locale.name;
        var authors = this.props.authors;
        var names = _.map(authors, (author) => {
            return n(author.details.name, author.details.gender);
        });
        var contents;
        switch (_.size(authors)) {
            // the list can be empty during loading
            case 0:
                contents = '\u00a0';
                break;
            case 1:
                contents = `${names[0]}`;
                break;
            case 2:
                contents = t('story-author-$name1-and-$name2', names[0], names[1]);
                break;
            default:
                var coauthors = _.slice(authors, 1);
                var props = {
                    users: coauthors,
                    label: t('story-author-$count-others', coauthors.length),
                    title: t('story-coauthors'),
                    locale: this.props.locale,
                    theme: this.props.theme,
                };
                var users = <MultipleUserNames key={1} {...props} />
                contents = t('story-author-$name-and-$users', names[0], users, coauthors.length);
        }
        return <span className="name">{contents}</span>;
    },

    /**
     * Render upload status or the publication time
     *
     * @return {ReactElement}
     */
    renderProgress: function() {
        var status = this.props.status;
        if (status) {
            var t = this.props.locale.translate;
            return (
                <span className="status">
                    {t(`story-status-${status.action}-$progress`, status.progress)}
                </span>
            );
        } else {
            var props = {
                time: this.props.story.ptime,
                locale: this.props.locale,
            };
            return <Time {...props} />
        }
    },

    /**
     * Render emblem
     *
     * @return {[type]}
     */
    renderEmblem: function() {
        var type = this.props.story.type;
        var className = 'graphic';
        if (_.includes(StoryTypes.git, type)) {
            className += ' git';
        } else {
            return null;
        }
        var Icon = StoryTypes.icons[type];
        if (type === 'issue') {
            var state = this.props.story.details.state;
            Icon = StoryTypes.icons[type + '.' + state];
        }
        if (!Icon) {
            return null;
        }
        return (
            <div className={className}>
                <Icon className={type} />
            </div>
        );
    },

    /**
     * Render text of the story
     *
     * @return {ReactElement}
     */
    renderText: function() {
        this.resourcesReferenced = {};
        switch (this.props.story.type) {
            case 'story':
                return this.renderStoryText();
            case 'task-list':
                return this.renderTaskListText();
            case 'survey':
                return this.renderSurveyText();
            case 'repo':
                return this.renderRepoText();
            case 'member':
                return this.renderMemberText();
            case 'push':
            case 'merge':
            case 'branch':
                return this.renderPushText();
            case 'issue':
                return this.renderIssueText();
            case 'merge-request':
                return this.renderMergeRequestText();
            case 'milestone':
                return this.renderMilestoneText();
            case 'wiki':
                return this.renderWikiText();
        }
    },

    /**
     * Render text for regular post, task list, and survey
     *
     * @return {ReactElement|null}
     */
    renderStoryText: function() {
        var p = this.props.locale.pick;
        var story = this.props.story;
        var text = _.trimEnd(p(story.details.text));
        if (!text) {
            return null;
        }
        if (story.details.markdown) {
            var contents = Markdown.parse(text, this.handleReference);
            return (
                <div className="text story markdown" onClick={this.handleMarkdownClick}>
                    {contents}
                </div>
            );
        } else {
            return <div className="text story plain-text"><p>{text}</p></div>;
        }
    },

    /**
     * Render task list
     *
     * @return {ReactElement}
     */
    renderTaskListText: function() {
        var p = this.props.locale.pick;
        var story = this.props.story;
        var text = _.trimEnd(p(story.details.text));
        if (!text) {
            return null;
        }
        var answers = this.state.userAnswers;
        if (story.details.markdown) {
            var list = Markdown.parseTaskList(text, answers, this.handleTaskListItemChange, this.handleReference);
            return (
                <div className="text task-list markdown" onClick={this.handleMarkdownClick}>
                    {list}
                </div>
            );
        } else {
            var list = PlainText.parseTaskList(text, answers, this.handleTaskListItemChange);
            return <div className="text task-list plain-text"><p>{list}</p></div>;
        }
    },

    /**
     * Render survey choices or results depending whether user has voted
     *
     * @return {ReactElement|null}
     */
    renderSurveyText: function() {
        var p = this.props.locale.pick;
        var story = this.props.story;
        var text = _.trimEnd(p(story.details.text));
        if (!text) {
            return null;
        }
        if (!this.hasUserVoted()) {
            var answers = this.state.userAnswers;
            if (story.details.markdown) {
                var survey = Markdown.parseSurvey(text, answers, this.handleSurveyItemChange, this.handleReference);
                return (
                    <div className="text survey markdown" onClick={this.handleMarkdownClick}>
                        {survey}
                    </div>
                );
            } else {
                var survey = PlainText.parseSurvey(text, answers, this.handleSurveyItemChange);
                return <div className="text survey plain-text"><p>{survey}</p></div>;
            }
        } else {
            var voteCounts = countVotes(this.props.reactions);
            if (story.details.markdown) {
                var results = Markdown.parseSurveyResults(text, voteCounts, this.handleReference);
                return (
                    <div className="text survey markdown" onClick={this.handleMarkdownClick}>
                        {results}
                    </div>
                );
            } else {
                var results = PlainText.parseSurveyResults(text, voteCounts);
                return <div className="text survey plain-text"><p>{results}</p></div>;
            }
        }
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
        var repo = this.props.repo;
        var repoName = p(_.get(repo, 'details.title')) || _.get(repo, 'name');
        var url = _.get(repo, 'details.web_url');
        return (
            <div className="text repo">
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
        var repo = this.props.repo;
        var repoName = p(_.get(repo, 'details.title')) || _.get(repo, 'name');
        var url = _.get(repo, 'details.web_url');
        return (
            <div className="text member">
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
        var n = this.props.locale.name;
        var story = this.props.story;
        var title = story.details.title;
        var repo = this.props.repo;
        var author = _.first(this.props.authors);
        var user = (author) ? n(author.details.name, author.details.gender) : '';
        var url, target;
        var issueLink = LinkUtils.find(this.props.story, { relation: 'issue' });
        if (UserUtils.canAccessRepo(user, repo)) {
            if (issueLink) {
                var issueNumber = issueLink.issue.number;
                url = `${repo.details.web_url}/issues/${issueNumber}`;
                target = issueLink.type;
            }
        }
        var number = (issueLink) ? issueLink.issue.number : '';
        return (
            <div className="text issue">
                <p>
                    <a href={url} target={target}>
                        {t(`story-issue-$user-opened-$number-$title`, user, number, p(title))}
                    </a>
                </p>
                {this.renderStatus()}
                {this.renderTags()}
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
        var user = this.props.currentUser;
        var story = this.props.story;
        var repo = this.props.repo;
        var title = story.details.title;
        var dueDate = formatDate(story.details.due_date);
        var startDate = formatDate(story.details.start_date) || '-';
        var url;
        if (UserUtils.canAccessRepo(user, repo)) {
            var milestoneLink = LinkUtils.find(this.props.story, { relation: 'milestone' });
            if (milestoneLink) {
                url = `${repo.details.web_url}/milestones/${milestoneLink.milestone.id}`;
            }
        }
        return (
            <div className="text milestone">
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
     * Render text for merge request story
     *
     * @return {ReactElement}
     */
    renderMergeRequestText: function() {
        var t = this.props.locale.translate;
        var p = this.props.locale.pick;
        var user = this.props.currentUser;
        var story = this.props.story;
        var repo = this.props.repo;
        var branch1 = _.get(story, 'details.source_branch');
        var branch2 = _.get(story, 'details.branch');
        var url;
        if (UserUtils.canAccessRepo(user, repo)) {
            var mergeRequestLink = LinkUtils.find(this.props.story, { relation: 'merge_request' });
            if (mergeRequestLink) {
                url = `${repo.details.web_url}/merge_requests/${mergeRequestLink.merge_request.id}`;
            }
        }
        return (
            <div className="text merge-request">
                <p>
                    <a href={url} target="_blank">
                        {t(`story-merge-request-$branch1-into-$branch2`, branch1, branch2)}
                    </a>
                </p>
                {this.renderStatus()}
                {this.renderTags()}
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
            <div className="text wiki">
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
        var user = this.props.currentUser;
        var story = this.props.story;
        var files = _.get(this.props.story, 'details.files');
        var lines = _.get(this.props.story, 'details.lines');
        var commits = _.get(this.props.story, 'details.commit_ids.length');
        var repo = this.props.repo;
        var repoName = p(_.get(repo, 'details.title')) || _.get(repo, 'name');
        var branch = story.details.branch;
        var fileChangeTypes = [ 'added', 'deleted', 'modified', 'renamed' ];
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
        var lineChangeTypes = [ 'added', 'deleted' ];
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
        if (UserUtils.canAccessRepo(user, repo)) {
            if (story.type === 'push' || story.type === 'merge') {
                var commitBefore = story.details.commit_before;
                var commitAfter = story.details.commit_after;
                if (commitBefore) {
                    url = `${repo.details.web_url}/compare/${commitBefore}...${commitAfter}`;
                } else {
                    url = `${repo.details.web_url}/commit/${commitAfter}`;
                }
            } else if (story.type === 'branch') {
                url = `${repo.details.web_url}/commits/${branch}`;
            }
        }
        var text;
        if (story.type === 'push') {
            text = t(`story-push-pushed-to-$branch-of-$repo`, branch, repoName);
        } else if (story.type === 'merge') {
            var sourceBranches = story.details.source_branches;
            text = t(`story-push-merged-$branches-into-$branch-of-$repo`, sourceBranches, branch, repoName);
        } else if (story.type === 'branch') {
            text = t(`story-push-created-$branch-in-$repo`, branch, repoName);
        }
        return (
            <div className="text push">
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
     * Render current status of issue or merge request
     *
     * @return {ReactElement}
     */
    renderStatus: function() {
        var t = this.props.locale.translate;
        var state = this.props.story.details.state;
        return (
            <p className={`status-${state}`}>
                <span>{t('story-issue-current-status')}</span>
                {' '}
                <span>{t(`story-issue-status-${state}`)}</span>
            </p>
        );
    },

    /**
     * Render tags for issue and merge requests
     *
     * @return {ReactElement|null}
     */
    renderTags: function() {
        var labels = this.props.story.details.labels;
        if (_.isEmpty(labels)) {
            return null;
        }
        var repo = this.props.repo;
        var tags = _.map(labels, (label, i) => {
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
        // inserting actual spaces between the tags for the sake of copy-and-pasting
        for (var i = 1; i < tags.length; i += 2) {
            tags.splice(i, 0, ' ');
        }
        return <p>{tags}</p>;
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
        if (!_.isEmpty(this.resourcesReferenced)) {
            // exclude the ones that are shown in Markdown
            resources = _.difference(resources, _.values(this.resourcesReferenced));
        }
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

    /**
     * Render dialog box showing referenced image at full size
     *
     * @return {ReactElement|null}
     */
    renderReferencedMediaDialog: function() {
        if (!this.state.renderingReferencedMediaDialog) {
            return null;
        }
        var selectedResource = this.resourcesReferenced[this.state.selectedResourceUrl];
        var zoomableResources = getZoomableResources(this.resourcesReferenced);
        var zoomableIndex = _.indexOf(zoomableResources, selectedResource);
        if (zoomableIndex === -1) {
            return null;
        }
        var dialogProps = {
            show: this.state.showingReferencedMediaDialog,
            resources: zoomableResources,
            selectedIndex: zoomableIndex,

            locale: this.props.locale,
            theme: this.props.theme,

            onClose: this.handleReferencedMediaDialogClose,
        };
        return <MediaDialogBox {...dialogProps} />;
    },

    /**
     * Render affected app components
     *
     * @return {ReactElement}
     */
    renderAppComponents: function() {
        var t = this.props.locale.translate;
        var components = _.get(this.props.story, 'details.components');
        if (_.isEmpty(components)) {
            return null;
        }
        return (
            <div className="impact">
                <p className="message">{t('story-push-components-changed')}</p>
                <Scrollable>
                    {_.map(components, this.renderAppComponent)}
                </Scrollable>
                {this.renderAppComponentDialog()}
            </div>
        );
    },

    /**
     * Render an affected app component
     *
     * @return {ReactElement}
     */
    renderAppComponent: function(component, i) {
        var componentProps = {
            component: component,
            locale: this.props.locale,
            theme: this.props.theme,
            onSelect: this.handleComponentSelect,
        };
        return <AppComponent key={i} {...componentProps} />
    },

    /**
     * Render dialog showing full description of component
     *
     * @return {ReactElement}
     */
    renderAppComponentDialog: function() {
        if (!this.state.renderingComponentDialog) {
            return null;
        }
        var dialogProps = {
            show: this.state.showingComponentDialog,
            component: this.state.selectedComponent,
            locale: this.props.locale,
            theme: this.props.theme,
            onClose: this.handleComponentDialogClose,
        };
        return <AppComponentDialogBox {...dialogProps} />;
    },

    /**
     * Inform parent component that changes were made to story
     *
     * @param  {Story} story
     */
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
     * Inform parent component that there's a new reaction to story
     *
     * @param  {Story} story
     */
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
     * Called when Markdown text references a resource
     *
     * @param  {Object} evt
     */
    handleReference: function(evt) {
        var resources = this.props.story.details.resources;
        var res = Markdown.findReferencedResource(resources, evt.name);
        if (res) {
            var theme = this.props.theme;
            var url;
            if (evt.forImage)  {
                // images are style at height = 1.5em
                url = theme.getImageUrl(res, { height: 24 });
                if (!url) {
                    // use blob if it's attached
                    var file = theme.getImageFile(res);
                    url = Markdown.createBlobUrl(file, res.clip);
                }
            } else {
                url = theme.getUrl(res);
            }
            // remember the resource and the url
            this.resourcesReferenced[url] = res;
            return {
                href: url,
                title: undefined
            };
        }
    },

    /**
     * Called when user clicks on the text contents
     *
     * @param  {Event} evt
     */
     handleMarkdownClick: function(evt) {
        var target = evt.target;
        if (target.tagName === 'IMG') {
            var src = target.getAttribute('src');
            var res = this.resourcesReferenced[src];
            if (res) {
                if (res.type === 'image' || res.type === 'video') {
                    this.setState({
                        selectedResourceUrl: src,
                        renderingReferencedMediaDialog: true,
                        showingReferencedMediaDialog: true,
                    });
                } else if (res.type === 'website') {
                    window.open(res.url);
                } else if (res.type === 'audio') {
                    // TODO
                }
            } else {
                var targetRect = target.getBoundingClientRect();
                var width = target.naturalWidth + 50;
                var height = target.naturalHeight + 50;
                var left = targetRect.left + window.screenLeft;
                var top = targetRect.top + window.screenTop;
                window.open(target.src, '_blank', `width=${width},height=${height},left=${left},top=${top}status=no,menubar=no`);
            }
        }
    },

    /**
     * Called when user clicks on a checkbox in a task list
     *
     * @param  {Event} evt
     */
    handleTaskListItemChange: function(evt) {
        var target = evt.currentTarget;
        var list = target.name;
        var item = target.value;
        var selected = target.checked;

        if (!this.isCurrentUserAuthor()) {
            return false;
        }

        // save the answer in state for immediately UI response
        var userAnswers = _.decoupleSet(this.state.userAnswers, [ list, item ], selected);
        this.setState({ userAnswers });

        // update the text of the story
        var story = this.props.story;
        var newText = _.mapValues(story.details.text, (langText) => {
            return ListParser.update(langText, list, item, selected, false);
        });
        story = _.decoupleSet(story, 'details.text', newText);

        this.triggerChangeEvent(story);
    },

    /**
     * Called when user clicks on a radio button in a survey
     *
     * @param  {Event} evt
     */
    handleSurveyItemChange: function(evt) {
        var target = evt.currentTarget;
        var list = target.name;
        var item = target.value;
        var userAnswers = _.decoupleSet(this.state.userAnswers, [ list ], item);
        this.setState({ userAnswers });
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
            published: true,
            details: {
                answers: this.state.userAnswers
            }
        };
        this.triggerReactionEvent(reaction);
        this.setState({ voteSubmitted: true });
    },

    /**
     * Called when user clicks on an app component description
     *
     * @param  {Object} evt
     */
    handleComponentSelect: function(evt) {
        this.setState({
            renderingComponentDialog: true,
            showingComponentDialog: true,
            selectedComponent: evt.component,
        });
    },

    /**
     * Called when user closes component description dialog
     *
     * @param  {Object} evt
     */
    handleComponentDialogClose: function(evt) {
        this.setState({ showingComponentDialog: false }, () => {
            setTimeout(() => {
                if (!this.state.showingComponentDialog) {
                    this.setState({
                        renderingComponentDialog: false,
                        selectedComponent: null
                    });
                }
            }, 500);
        });
    },

    /**
     * Called when user closes referenced media dialog
     *
     * @param  {Object} evt
     */
    handleReferencedMediaDialogClose: function(evt) {
        this.setState({ showingReferencedMediaDialog: false }, () => {
            setTimeout(() => {
                if (!this.state.showingReferencedMediaDialog) {
                    this.setState({
                        renderingReferencedMediaDialog: false,
                        selectedResourceUrl: null
                    });
                }
            }, 500);
        })
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

var getZoomableResources = Memoize(function(resources) {
    return _.filter(resources, (res) => {
        switch (res.type) {
            case 'image':
            case 'video':
                return true;
        }
    })
});
