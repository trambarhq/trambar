import _ from 'lodash';
import Moment from 'moment';
import React, { PureComponent } from 'react';
import Memoize from 'utils/memoize';
import * as ListParser from 'utils/list-parser';
import * as Markdown from 'utils/markdown';
import * as PlainText from 'utils/plain-text';
import ComponentRefs from 'utils/component-refs';
import * as ExternalDataUtils from 'objects/utils/external-data-utils';
import * as UserUtils from 'objects/utils/user-utils';
import Payload from 'transport/payload';

// widgets
import MediaView from 'views/media-view';
import MediaDialogBox from 'dialogs/media-dialog-box';
import AppComponent from 'views/app-component';
import AppComponentDialogBox from 'dialogs/app-component-dialog-box';
import Scrollable from 'widgets/scrollable';
import PushButton from 'widgets/push-button';

import './story-contents.scss';

class StoryContents extends PureComponent {
    static displayName = 'StoryContents';

    constructor(props) {
        super(props);
        this.components = ComponentRefs({
            audioPlayer: HTMLAudioElement,
        });
        this.state = {
            voteSubmitted: false,
            selectedComponent: null,
            showingComponentDialog: false,
            renderingComponentDialog: false,
            selectedResourceName: null,
            showingReferencedMediaDialog: false,
            renderingReferencedMediaDialog: false,
            audioURL: null,
        };
        this.updateUserAnswers({}, this.state);
    }

    /**
     * Return the name the lead author
     *
     * @return {String}
     */
    getAuthorName() {
        let n = this.props.locale.name;
        let author = _.first(this.props.authors);
        let name = (author) ? n(author.details.name, author.details.gender) : '';
        return name;
    }

    /**
     * Update state when props changes
     *
     * @param  {Object} nextProps
     */
    componentWillReceiveProps(nextProps) {
        let nextState = _.clone(this.state);
        if (this.props.story !== nextProps.story) {
            this.updateUserAnswers(nextState, nextProps);
        }
        let changes = _.shallowDiff(nextState, this.state);
        if (!_.isEmpty(changes)) {
            this.setState(changes);
        }
    }

    /**
     * Update the default answers of survey question
     *
     * @param  {Object} nextState
     * @param  {Object} nextProps
     */
    updateUserAnswers(nextState, nextProps) {
        if (nextProps.story) {
            if (nextProps.story.type === 'survey') {
                let p = nextProps.locale.pick;
                let langText = p(nextProps.story.details.text);
                let tokens = ListParser.extract(langText);
                let answers = nextState.userAnswers;
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
    }

    /**
     * Return true if the current user is one of the story's author
     *
     * @return {Boolean}
     */
    isCurrentUserAuthor() {
        let userIds = this.props.story.user_ids;
        let currentUserId = this.props.currentUser.id;
        return _.includes(userIds, currentUserId);
    }

    /**
     * Return true if the current user has already voted
     *
     * @return {Boolean|undefined}
     */
    hasUserVoted() {
        if (this.props.reactions === null) {
            return undefined;
        }
        let vote = getUserVote(this.props.reactions, this.props.currentUser);
        return !!vote;
    }

    /**
     * Return true of the current user can vote
     *
     * @return {Boolean}
     */
    canUserVote() {
        return (this.props.access === 'read-write');
    }

    /**
     * Clear state.voteSubmitted once vote has been recorded
     *
     * @param  {Object} nextProps
     */
    componentDidUpdate(nextProps) {
        if (this.props.reactions !== nextProps.reactions) {
            if (this.state.voteSubmitted) {
                let vote = getUserVote(nextProps.reactions, nextProps.currentUser);
                if (vote) {
                    this.setState({ voteSubmitted: false });
                }
            }
        }
    }

    /**
     * Render component
     *
     * @return {ReactElement}
     */
    render() {
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
    }

    /**
     * Render text of the story
     *
     * @return {ReactElement}
     */
    renderText() {
        let story = this.props.story;
        this.resourcesReferenced = [];
        switch (story.type) {
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
                return this.renderPushText();
            case 'branch':
            case 'tag':
                return this.renderBranchText();
            case 'issue':
                if (story.details.exported) {
                    return this.renderStoryText();
                } else {
                    return this.renderIssueText();
                }
            case 'merge-request':
                return this.renderMergeRequestText();
            case 'milestone':
                return this.renderMilestoneText();
            case 'wiki':
                return this.renderWikiText();
        }
    }

    /**
     * Render text for regular post, task list, and survey
     *
     * @return {ReactElement|null}
     */
    renderStoryText() {
        let p = this.props.locale.pick;
        let story = this.props.story;
        let text = _.trimEnd(p(story.details.text));
        let tags;
        if (story.details.labels) {
            tags = this.renderLabels();
        }
        if (!text && !tags) {
            return null;
        }
        if (story.details.markdown) {
            return (
                <div className="text story markdown" onClick={this.handleMarkdownClick}>
                    {Markdown.render(text, this.handleReference)}
                    {tags}
                </div>
            );
        } else {
            let className = 'text story plain-text';
            let emoji = PlainText.findEmoji(text);
            if (emoji) {
                if (_.join(emoji, '') === text) {
                    className += ` emoji-${emoji.length}`;
                }
            }
            return (
                <div className={className}>
                    <p>{PlainText.renderEmoji(text)}</p>
                    {tags}
                </div>
            );
        }
    }

    /**
     * Render task list
     *
     * @return {ReactElement}
     */
    renderTaskListText() {
        let p = this.props.locale.pick;
        let story = this.props.story;
        let text = _.trimEnd(p(story.details.text));
        if (!text) {
            return null;
        }
        let answers = this.state.userAnswers;
        let onChange = this.isCurrentUserAuthor() ? this.handleTaskListItemChange : null;
        let onReference = this.handleReference;
        if (story.details.markdown) {
            let list = Markdown.renderTaskList(text, answers, onChange, onReference);
            return (
                <div className="text task-list markdown" onClick={this.handleMarkdownClick}>
                    {list}
                </div>
            );
        } else {
            let list = PlainText.renderTaskList(text, answers, onChange);
            return <div className="text task-list plain-text"><p>{list}</p></div>;
        }
    }

    /**
     * Render survey choices or results depending whether user has voted
     *
     * @return {ReactElement|null}
     */
    renderSurveyText() {
        let p = this.props.locale.pick;
        let story = this.props.story;
        let text = _.trimEnd(p(story.details.text));
        if (!text) {
            return null;
        }
        let onChange = this.handleSurveyItemChange;
        let onReference = this.handleReference;
        if (this.canUserVote() && !this.hasUserVoted()) {
            let answers = this.state.userAnswers;
            if (story.details.markdown) {
                let survey = Markdown.renderSurvey(text, answers, onChange, onReference);
                return (
                    <div className="text survey markdown" onClick={this.handleMarkdownClick}>
                        {survey}
                    </div>
                );
            } else {
                let survey = PlainText.renderSurvey(text, answers, onChange);
                return <div className="text survey plain-text"><p>{survey}</p></div>;
            }
        } else {
            let voteCounts = countVotes(this.props.reactions) || {};
            if (story.details.markdown) {
                let results = Markdown.renderSurveyResults(text, voteCounts, onReference);
                return (
                    <div className="text survey markdown" onClick={this.handleMarkdownClick}>
                        {results}
                    </div>
                );
            } else {
                let results = PlainText.renderSurveyResults(text, voteCounts);
                return <div className="text survey plain-text"><p>{results}</p></div>;
            }
        }
    }

    /**
     * Render text for repo story
     *
     * @return {ReactElement}
     */
    renderRepoText() {
        let t = this.props.locale.translate;
        let p = this.props.locale.pick;
        let story = this.props.story;
        let name = this.getAuthorName();
        let action = story.details.action;
        let repo = this.props.repo;
        let repoName = p(_.get(repo, 'details.title')) || _.get(repo, 'name');
        let url = _.get(repo, 'details.web_url');
        return (
            <div className="text repo">
                <p>
                    <a href={url} target="_blank">
                        {t(`story-$name-${action}-$repo`, name, repoName)}
                    </a>
                </p>
            </div>
        );
    }

    /**
     * Render text for member story
     *
     * @return {ReactElement}
     */
    renderMemberText() {
        let t = this.props.locale.translate;
        let p = this.props.locale.pick;
        let story = this.props.story;
        let name = this.getAuthorName();
        let action = story.details.action;
        let repo = this.props.repo;
        let repoName = p(_.get(repo, 'details.title')) || _.get(repo, 'name');
        let url = _.get(repo, 'details.web_url');
        return (
            <div className="text member">
                <p>
                    <a href={url} target="_blank">
                        {t(`story-$name-${action}-$repo`, name, repoName)}
                    </a>
                </p>
            </div>
        );
    }

    /**
     * Render text for issue story
     *
     * @return {ReactElement}
     */
    renderIssueText() {
        let t = this.props.locale.translate;
        let p = this.props.locale.pick;
        let story = this.props.story;
        let name = this.getAuthorName();
        let title = story.details.title;
        let repo = this.props.repo;
        let url, target;
        let issueLink = ExternalDataUtils.findLinkByRelations(this.props.story, 'issue');
        if (UserUtils.canAccessRepo(this.props.currentUser, repo)) {
            if (issueLink) {
                let issueNumber = issueLink.issue.number;
                url = `${repo.details.web_url}/issues/${issueNumber}`;
                target = issueLink.type;
            }
        }
        let number = (issueLink) ? issueLink.issue.number : '';
        return (
            <div className="text issue">
                <p>
                    <a href={url} target={target}>
                        {t(`story-$name-opened-issue-$number-$title`, name, number, p(title))}
                    </a>
                </p>
                {this.renderStatus()}
                {this.renderLabels()}
            </div>
        );
    }

    /**
     * Render text for milestone story
     *
     * @return {ReactElement}
     */
    renderMilestoneText() {
        let t = this.props.locale.translate;
        let p = this.props.locale.pick;
        let story = this.props.story;
        let name = this.getAuthorName();
        let repo = this.props.repo;
        let title = story.details.title;
        let url;
        if (UserUtils.canAccessRepo(this.props.currentUser, repo)) {
            let milestoneLink = ExternalDataUtils.findLinkByRelations(this.props.story, 'milestone');
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
            </div>
        );
    }

    /**
     * Render text for merge request story
     *
     * @return {ReactElement}
     */
    renderMergeRequestText() {
        let t = this.props.locale.translate;
        let p = this.props.locale.pick;
        let story = this.props.story;
        let name = this.getAuthorName();
        let repo = this.props.repo;
        let branch1 = _.get(story, 'details.source_branch');
        let branch2 = _.get(story, 'details.branch');
        let url;
        if (UserUtils.canAccessRepo(this.props.currentUser, repo)) {
            let mergeRequestLink = ExternalDataUtils.findLinkByRelations(this.props.story, 'merge_request');
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
                {this.renderLabels()}
            </div>
        );
    }

    /**
     * Render text for wiki story
     *
     * @return {ReactElement}
     */
    renderWikiText() {
        let t = this.props.locale.translate;
        let story = this.props.story;
        let name = this.getAuthorName();
        let url = story.details.url;
        let title = _.capitalize(story.details.title);
        let action = story.details.action + 'd';
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
    }

    /**
     * Render text for push story
     *
     * @return {ReactElement}
     */
    renderPushText() {
        let t = this.props.locale.translate;
        let p = this.props.locale.pick;
        let story = this.props.story;
        let name = this.getAuthorName();
        let commits = _.get(this.props.story, 'details.commit_ids.length');
        let repo = this.props.repo;
        let repoName = p(_.get(repo, 'details.title')) || _.get(repo, 'name');
        let branch = story.details.branch;
        let url;
        if (UserUtils.canAccessRepo(this.props.currentUser, repo)) {
            let commitBefore = story.details.commit_before;
            let commitAfter = story.details.commit_after;
            if (commitBefore) {
                url = `${repo.details.web_url}/compare/${commitBefore}...${commitAfter}`;
            } else {
                url = `${repo.details.web_url}/commit/${commitAfter}`;
            }
        }
        let text;
        if (story.type === 'push') {
            text = t(`story-$name-pushed-to-$branch-of-$repo`, name, branch, repoName);
        } else if (story.type === 'merge') {
            let sourceBranches = story.details.source_branches;
            text = t(`story-$name-merged-$branches-into-$branch-of-$repo`, name, sourceBranches, branch, repoName);
        }
        return (
            <div className="text push">
                <p>
                    <a href={url} target="_blank">{text}</a>
                </p>
                {this.renderChanges()}
            </div>
        );
    }

    /**
     * Render text for branch story
     *
     * @return {ReactElement}
     */
    renderBranchText() {
        let t = this.props.locale.translate;
        let p = this.props.locale.pick;
        let story = this.props.story;
        let name = this.getAuthorName();
        let repo = this.props.repo;
        let repoName = p(_.get(repo, 'details.title')) || _.get(repo, 'name');
        let branch = story.details.branch;
        let url;
        if (UserUtils.canAccessRepo(this.props.currentUser, repo)) {
            if (story.type === 'branch') {
                url = `${repo.details.web_url}/commits/${branch}`;
            } else if (story.type === 'tag') {
                url = `${repo.details.web_url}/tags/${branch}`;
            }
        }
        let text;
        if (story.type === 'branch') {
            text = t(`story-$name-created-$branch-in-$repo`, name, branch, repoName);
        } else if (story.type === 'tag') {
            text = t(`story-$name-created-$tag-in-$repo`, name, branch, repoName);
        }
        return (
            <div className="text push">
                <p>
                    <a href={url} target="_blank">{text}</a>
                </p>
                {this.renderChanges()}
            </div>
        );
    }

    /**
     * Render the number of file/lines changed
     *
     * @return {ReactElement|null}
     */
    renderChanges() {
        let t = this.props.locale.translate;
        let files = _.get(this.props.story, 'details.files');
        if (_.isEmpty(files)) {
            return null;
        }
        let fileChangeTypes = [ 'added', 'deleted', 'modified', 'renamed' ];
        let fileChanges = _.transform(fileChangeTypes, (elements, type, i) => {
            let count = files[type];
            if (count > 0) {
                elements.push(
                    <li key={i} className={type}>
                        {t(`story-push-${type}-$count-files`, count)}
                    </li>
                );
            }
        }, []);
        let lines = _.get(this.props.story, 'details.lines');
        let lineChangeTypes = [ 'added', 'deleted', 'modified' ];
        let lineChanges = _.transform(lineChangeTypes, (elements, type, i) => {
            let count = lines[type];
            if (count > 0) {
                elements.push(
                    <li key={i} className={type}>
                        {t(`story-push-${type}-$count-lines`, count)}
                    </li>
                );
            }
        }, []);
        return (
            <div>
                <ul className="files">{fileChanges}</ul>
                <ul className="lines">{lineChanges}</ul>
            </div>
        );
    }

    /**
     * Render current status of issue or merge request
     *
     * @return {ReactElement}
     */
    renderStatus() {
        let t = this.props.locale.translate;
        let state = this.props.story.details.state;
        if (!state) {
            return null;
        }
        return (
            <p className={`status-${state}`}>
                <span>{t('story-issue-current-status')}</span>
                {' '}
                <span>{t(`story-issue-status-${state}`)}</span>
            </p>
        );
    }

    /**
     * Render labels for issue and merge requests
     *
     * @return {ReactElement|null}
     */
    renderLabels() {
        let labels = _.sortBy(this.props.story.details.labels);
        if (_.isEmpty(labels)) {
            return null;
        }
        let repo = this.props.repo;
        let tags = _.map(labels, (label, i) => {
            let style;
            if (repo) {
                let index = _.indexOf(repo.details.labels, label);
                let color = _.get(repo.details.label_colors, index);
                if (color) {
                    style = { backgroundColor: color };
                }
            }
            return <span key={i} className="tag" style={style}>{label}</span>;
        });
        // inserting actual spaces between the tags for the sake of copy-and-pasting
        for (let i = 1; i < tags.length; i += 2) {
            tags.splice(i, 0, ' ');
        }
        return <p className="tags">{tags}</p>;
    }

    /**
     * Render button for filling survey
     *
     * @return {ReactElement|null}
     */
    renderButtons() {
        if (this.props.story.type !== 'survey') {
            return null;
        }
        if (!this.canUserVote()) {
            return null;
        }
        if (this.hasUserVoted() !== false) {
            return null;
        }
        let t = this.props.locale.translate;
        let submitProps = {
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
    }

    /**
     * Render audio player for embed audio in markdown text
     *
     * @return {ReactElement|null}
     */
    renderAudioPlayer() {
        if (!this.state.audioURL) {
            return null;
        }
        let audioProps = {
            ref: this.components.setters.audioPlayer,
            src: this.state.audioURL,
            autoPlay: true,
            controls: true,
            onEnded: this.handleAudioEnded,
        };
        return <audio {...audioProps} />;
    }

    /**
     * Render attached media
     *
     * @return {ReactElement}
     */
    renderMedia() {
        let resources = _.get(this.props.story, 'details.resources');
        if (!_.isEmpty(this.resourcesReferenced)) {
            // exclude the ones that are shown in Markdown
            resources = _.difference(resources, this.resourcesReferenced);
        }
        if (_.isEmpty(resources)) {
            return null;
        }
        let props = {
            locale: this.props.locale,
            theme: this.props.theme,
            resources,
            width: Math.min(512, screen.width),
        };
        return <MediaView {...props} />
    }

    /**
     * Render dialog box showing referenced image at full size
     *
     * @return {ReactElement|null}
     */
    renderReferencedMediaDialog() {
        if (!this.state.renderingReferencedMediaDialog) {
            return null;
        }
        let resources = this.props.story.details.resources;
        let res = Markdown.findReferencedResource(resources, this.state.selectedResourceName);
        if (!res) {
            return null;
        }
        let zoomableResources = getZoomableResources(this.resourcesReferenced);
        let zoomableIndex = _.indexOf(zoomableResources, res);
        if (zoomableIndex === -1) {
            return null;
        }
        let dialogProps = {
            show: this.state.showingReferencedMediaDialog,
            resources: zoomableResources,
            selectedIndex: zoomableIndex,

            locale: this.props.locale,
            theme: this.props.theme,

            onClose: this.handleReferencedMediaDialogClose,
        };
        return <MediaDialogBox {...dialogProps} />;
    }

    /**
     * Render affected app components
     *
     * @return {ReactElement}
     */
    renderAppComponents() {
        let t = this.props.locale.translate;
        let type = _.get(this.props.story, 'type');
        let components = _.get(this.props.story, 'details.components');
        if (_.isEmpty(components)) {
            return null;
        }
        components = sortComponents(components, this.props.locale);
        return (
            <div className="impact">
                <p className="message">{t('story-push-components-changed')}</p>
                <Scrollable>
                    {_.map(components, this.renderAppComponent)}
                </Scrollable>
                {this.renderAppComponentDialog()}
            </div>
        );
    }

    /**
     * Render an affected app component
     *
     * @return {ReactElement}
     */
    renderAppComponent(component, i) {
        let componentProps = {
            component: component,
            locale: this.props.locale,
            theme: this.props.theme,
            onSelect: this.handleComponentSelect,
        };
        return <AppComponent key={i} {...componentProps} />
    }

    /**
     * Render dialog showing full description of component
     *
     * @return {ReactElement}
     */
    renderAppComponentDialog() {
        if (!this.state.renderingComponentDialog) {
            return null;
        }
        let dialogProps = {
            show: this.state.showingComponentDialog,
            component: this.state.selectedComponent,
            locale: this.props.locale,
            theme: this.props.theme,
            onClose: this.handleComponentDialogClose,
        };
        return <AppComponentDialogBox {...dialogProps} />;
    }

    /**
     * Inform parent component that changes were made to story
     *
     * @param  {Story} story
     */
    triggerChangeEvent(story) {
        if (this.props.onChange) {
            this.props.onChange({
                type: 'change',
                target: this,
                story,
            });
        }
    }

    /**
     * Inform parent component that there's a new reaction to story
     *
     * @param  {Story} story
     */
    triggerReactionEvent(reaction) {
        if (this.props.onReaction) {
            this.props.onReaction({
                type: 'reaction',
                target: this,
                reaction,
            });
        }
    }

    /**
     * Called when Markdown text references a resource
     *
     * @param  {Object} evt
     */
    handleReference = (evt) => {
        let resources = this.props.story.details.resources;
        let res = Markdown.findReferencedResource(resources, evt.name);
        if (res) {
            let theme = this.props.theme;
            let url;
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
    }

    /**
     * Called when user clicks on the text contents
     *
     * @param  {Event} evt
     */
     handleMarkdownClick = (evt) => {
         let target = evt.target;
         if (target.viewportElement) {
             target = target.viewportElement;
         }
         let name;
         if (target.tagName === 'svg') {
             let title = target.getElementsByTagName('title')[0];
             if (title) {
                 name = title.textContent;
             }
         } else {
             name = evt.target.title;
         }
         if (name) {
             let resources = this.props.story.details.resources;
             let res = Markdown.findReferencedResource(resources, name);
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
                     let version = chooseAudioVersion(res);
                     let audioURL = this.props.theme.getAudioURL(res, { version });
                     this.setState({ audioURL });
                 }
             }
         } else {
             if (target.tagName === 'IMG') {
                 let src = target.getAttribute('src');
                 let targetRect = target.getBoundingClientRect();
                 let width = target.naturalWidth + 50;
                 let height = target.naturalHeight + 50;
                 let left = targetRect.left + window.screenLeft;
                 let top = targetRect.top + window.screenTop;
                 window.open(target.src, '_blank', `width=${width},height=${height},left=${left},top=${top}status=no,menubar=no`);
             }
         }
    }

    /**
     * Called when user clicks on a checkbox in a task list
     *
     * @param  {Event} evt
     */
    handleTaskListItemChange = (evt) => {
        let target = evt.currentTarget;
        let list = parseInt(target.name);
        let item = parseInt(target.value);
        let selected = target.checked;

        // save the answer in state for immediately UI response
        let userAnswers = _.decoupleSet(this.state.userAnswers, [ list, item ], selected);
        this.setState({ userAnswers });

        // update the text of the story
        let story = _.cloneDeep(this.props.story);
        let counts = [];
        story.details.text = _.mapValues(story.details.text, (langText) => {
            let tokens = ListParser.extract(langText);
            ListParser.set(tokens, list, item, selected);
            let unfinished = ListParser.count(tokens, false);
            counts.push(unfinished);
            return ListParser.join(tokens);
        });
        story.unfinished_tasks = _.max(counts);
        this.triggerChangeEvent(story);

        // add or remove reaction
        let task = { list, item };
        if (selected) {
            let reaction = {
                type: 'task-completion',
                story_id: story.id,
                user_id: this.props.currentUser.id,
                published: true,
                public: true,
                details: { task },
            };
            this.triggerReactionEvent(reaction);
        } else {
            let reaction = _.find(this.props.reactions, (r) => {
                if (r.type === 'task-completion') {
                    if (r.user_id === this.props.currentUser.id) {
                        return _.isEqual(r.details.task, task);
                    }
                }
            });
            if (reaction) {
                reaction = _.clone(reaction);
                reaction.deleted = true;
                this.triggerReactionEvent(reaction);
            }
        }
    }

    /**
     * Called when user clicks on a radio button in a survey
     *
     * @param  {Event} evt
     */
    handleSurveyItemChange = (evt) => {
        let target = evt.currentTarget;
        let list = target.name;
        let item = target.value;
        let userAnswers = _.decoupleSet(this.state.userAnswers, [ list ], item);
        this.setState({ userAnswers });
    }

    /**
     * Called when user clicks on the submit button
     *
     * @param  {Event} evt
     */
    handleVoteSubmitClick = (evt) => {
        let story = this.props.story;
        let reaction = {
            type: 'vote',
            story_id: story.id,
            user_id: this.props.currentUser.id,
            published: true,
            public: true,
            details: {
                answers: this.state.userAnswers
            }
        };
        this.triggerReactionEvent(reaction);
        this.setState({ voteSubmitted: true });
    }

    /**
     * Called when user clicks on an app component description
     *
     * @param  {Object} evt
     */
    handleComponentSelect = (evt) => {
        this.setState({
            renderingComponentDialog: true,
            showingComponentDialog: true,
            selectedComponent: evt.component,
        });
    }

    /**
     * Called when user closes component description dialog
     *
     * @param  {Object} evt
     */
    handleComponentDialogClose = (evt) => {
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
    }

    /**
     * Called when user closes referenced media dialog
     *
     * @param  {Object} evt
     */
    handleReferencedMediaDialogClose = (evt) => {
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
    }

    /**
     * Called when audio playback ends
     *
     * @param  {Event} evt
     */
    handleAudioEnded = (evt) => {
        this.setState({ audioURL: null });
    }
}

let countVotes = Memoize(function(reactions) {
    let tallies = {};
    _.each(reactions, (reaction) => {
        if (reaction.type === 'vote' ) {
            _.forIn(reaction.details.answers, (value, name) => {
                let totalPath = [ name, 'total' ];
                let newTotal = _.get(tallies, totalPath, 0) + 1;
                _.set(tallies, totalPath, newTotal);
                let countPath = [ name, 'answers', value ];
                let newCount = _.get(tallies, countPath, 0) + 1;
                _.set(tallies, countPath, newCount);
            });
        }
    });
    return tallies;
});

let getUserVote = Memoize(function(reactions, user) {
    if (user) {
        return _.find(reactions, { type: 'vote', user_id: user.id })
    } else {
        return null;
    }
});

let getZoomableResources = Memoize(function(resources) {
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

let sortComponents = Memoize(function(components, locale) {
    let p = locale.pick;
    return _.sortBy(components, (component) => {
        return _.toLower(p(component.text));
    });
});

export {
    StoryContents as default,
    StoryContents,
};

import Environment from 'env/environment';

if (process.env.NODE_ENV !== 'production') {
    const PropTypes = require('prop-types');

    StoryContents.propTypes = {
        access: PropTypes.oneOf([ 'read-only', 'read-comment', 'read-write' ]).isRequired,
        story: PropTypes.object.isRequired,
        authors: PropTypes.arrayOf(PropTypes.object),
        currentUser: PropTypes.object.isRequired,
        reactions: PropTypes.arrayOf(PropTypes.object),
        repo: PropTypes.object,
        env: PropTypes.instanceOf(Environment).isRequired,

        onChange: PropTypes.func,
        onReaction: PropTypes.func,
    };
}
