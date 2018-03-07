var _ = require('lodash');
var React = require('react'), PropTypes = React.PropTypes;
var Moment = require('moment');
var Memoize = require('utils/memoize');
var ListParser = require('utils/list-parser');
var Markdown = require('utils/markdown');
var PlainText = require('utils/plain-text');
var ComponentRefs = require('utils/component-refs');
var UserUtils = require('objects/utils/user-utils');
var LinkUtils = require('objects/utils/link-utils');
var Payload = require('transport/payload');

var Locale = require('locale/locale');
var Theme = require('theme/theme');

// mixins
var UpdateCheck = require('mixins/update-check');

// widgets
var MediaView = require('views/media-view');
var MediaDialogBox = require('dialogs/media-dialog-box');
var AppComponent = require('views/app-component');
var AppComponentDialogBox = require('dialogs/app-component-dialog-box');
var Scrollable = require('widgets/scrollable');
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
        this.components = ComponentRefs({
            audioPlayer: HTMLAudioElement,
        });
        var nextState = {
            voteSubmitted: false,
            selectedComponent: null,
            showingComponentDialog: false,
            renderingComponentDialog: false,
            selectedResourceName: null,
            showingReferencedMediaDialog: false,
            renderingReferencedMediaDialog: false,
            audioURL: null,
        };
        this.updateUserAnswers({}, nextState);
        return nextState;
    },

    /**
     * Return the name the lead author
     *
     * @return {String}
     */
    getAuthorName: function() {
        var n = this.props.locale.name;
        var author = _.first(this.props.authors);
        var name = (author) ? n(author.details.name, author.details.gender) : '';
        return name;
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
            <div className="story-contents">
                {this.renderText()}
                {this.renderAudioPlayer()}
                {this.renderMedia()}
                {this.renderReferencedMediaDialog()}
                {this.renderAppComponents()}
                {this.renderButtons()}
            </div>
        );
    },

    /**
     * Render text of the story
     *
     * @return {ReactElement}
     */
    renderText: function() {
        this.resourcesReferenced = [];
        switch (this.props.story.type) {
            case 'post':
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
        var tags;
        if (story.details.labels) {
            tags = this.renderTags();
        }
        if (story.details.markdown) {
            var contents = Markdown.parse(text, this.handleReference);
            return (
                <div className="text story markdown" onClick={this.handleMarkdownClick}>
                    {contents}
                    {tags}
                </div>
            );
        } else {
            return (
                <div className="text story plain-text">
                    <p>{text}</p>
                    {tags}
                </div>
            );
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
        var name = this.getAuthorName();
        var action = story.details.action;
        var repo = this.props.repo;
        var repoName = p(_.get(repo, 'details.title')) || _.get(repo, 'name');
        var url = _.get(repo, 'details.web_url');
        return (
            <div className="text repo">
                <p>
                    <a href={url} target="_blank">
                        {t(`story-$name-${action}-$repo`, name, repoName)}
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
        var name = this.getAuthorName();
        var action = story.details.action;
        var repo = this.props.repo;
        var repoName = p(_.get(repo, 'details.title')) || _.get(repo, 'name');
        var url = _.get(repo, 'details.web_url');
        return (
            <div className="text member">
                <p>
                    <a href={url} target="_blank">
                        {t(`story-$name-${action}-$repo`, name, repoName)}
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
        var name = this.getAuthorName();
        var title = story.details.title;
        var repo = this.props.repo;
        var url, target;
        var issueLink = LinkUtils.find(this.props.story, { relation: 'issue' });
        if (UserUtils.canAccessRepo(this.props.currentUser, repo)) {
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
                        {t(`story-$name-opened-issue-$number-$title`, name, number, p(title))}
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
        var story = this.props.story;
        var name = this.getAuthorName();
        var repo = this.props.repo;
        var title = story.details.title;
        var dueDate = formatDate(story.details.due_date);
        var startDate = formatDate(story.details.start_date) || '-';
        var url;
        if (UserUtils.canAccessRepo(this.props.currentUser, repo)) {
            var milestoneLink = LinkUtils.find(this.props.story, { relation: 'milestone' });
            if (milestoneLink) {
                url = `${repo.details.web_url}/milestones/${milestoneLink.milestone.id}`;
            }
        }
        return (
            <div className="text milestone">
                <p>
                    <a href={url} target="_blank">
                        {t(`story-$name-created-$milestone`, name, p(title))}
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
        var story = this.props.story;
        var name = this.getAuthorName();
        var repo = this.props.repo;
        var branch1 = _.get(story, 'details.source_branch');
        var branch2 = _.get(story, 'details.branch');
        var url;
        if (UserUtils.canAccessRepo(this.props.currentUser, repo)) {
            var mergeRequestLink = LinkUtils.find(this.props.story, { relation: 'merge_request' });
            if (mergeRequestLink) {
                url = `${repo.details.web_url}/merge_requests/${mergeRequestLink.merge_request.id}`;
            }
        }
        return (
            <div className="text merge-request">
                <p>
                    <a href={url} target="_blank">
                        {t(`story-$name-requested-merge-$branch1-into-$branch2`, name, branch1, branch2)}
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
        var name = this.getAuthorName();
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
                        {t(`story-$name-${action}-$page`, name, title)}
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
        var name = this.getAuthorName();
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
        if (UserUtils.canAccessRepo(this.props.currentUser, repo)) {
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
            text = t(`story-$name-pushed-to-$branch-of-$repo`, name, branch, repoName);
        } else if (story.type === 'merge') {
            var sourceBranches = story.details.source_branches;
            text = t(`story-$name-merged-$branches-into-$branch-of-$repo`, name, sourceBranches, branch, repoName);
        } else if (story.type === 'branch') {
            text = t(`story-$name-created-$branch-in-$repo`, name, branch, repoName);
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
     * Render audio player for embed audio in markdown text
     *
     * @return {ReactElement|null}
     */
    renderAudioPlayer: function() {
        if (!this.state.audioURL) {
            return null;
        }
        var audioProps = {
            ref: this.components.setters.audioPlayer,
            src: this.state.audioURL,
            autoPlay: true,
            controls: true,
            onEnded: this.handleAudioEnded,
        };
        return <audio {...audioProps} />;
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
            resources = _.difference(resources, this.resourcesReferenced);
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
        var resources = this.props.story.details.resources;
        var res = Markdown.findReferencedResource(resources, this.state.selectedResourceName);
        if (!res) {
            return null;
        }
        var zoomableResources = getZoomableResources(this.resourcesReferenced);
        var zoomableIndex = _.indexOf(zoomableResources, res);
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
                if (res.type === 'audio') {
                    url = require('!file-loader!speaker.svg') + `#${encodeURI(res.url)}`;
                } else {
                    // images are style at height = 1.5em
                    url = theme.getImageURL(res, { height: 24 });
                }
            } else {
                url = theme.getURL(res);
            }
            // remember that resource is referenced in Markdown
            this.resourcesReferenced.push(res);
            return {
                href: url,
                title: evt.name
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
         if (target.viewportElement) {
             target = target.viewportElement;
         }
         var name;
         if (target.tagName === 'svg') {
             var title = target.getElementsByTagName('title')[0];
             if (title) {
                 name = title.textContent;
             }
         } else {
             name = evt.target.title;
         }
         if (name) {
             var resources = this.props.story.details.resources;
             var res = Markdown.findReferencedResource(resources, name);
             if (res) {
                 if (res.type === 'image' || res.type === 'video') {
                     this.setState({
                         selectedResourceName: name,
                         renderingReferencedMediaDialog: true,
                         showingReferencedMediaDialog: true,
                     });
                 } else if (res.type === 'website') {
                     window.open(res.url, '_blank');
                 } else if (res.type === 'audio') {
                     var version = chooseAudioVersion(res);
                     var audioURL = this.props.theme.getAudioURL(res, { version });
                     this.setState({ audioURL });
                 }
             }
         } else {
             if (target.tagName === 'IMG') {
                 var src = target.getAttribute('src');
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
                        selectedResourceURL: null
                    });
                }
            }, 500);
        })
    },

    /**
     * Called when audio playback ends
     *
     * @param  {Event} evt
     */
    handleAudioEnded: function(evt) {
        this.setState({ audioURL: null });
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

/**
 * Choose a version of the audio
 *
 * @param  {Object} res
 *
 * @return {String}
 */
function chooseAudioVersion(res) {
    return _.first(_.keys(res.versions)) || null;
}
