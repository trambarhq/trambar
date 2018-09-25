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
import * as RepoUtils from 'objects/utils/repo-utils';
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
        this.updateUserAnswers(this.state, props);
    }

    /**
     * Update state when props changes
     *
     * @param  {Object} nextProps
     */
    componentWillReceiveProps(nextProps) {
        let { story } = this.props;
        let nextState = _.clone(this.state);
        if (nextProps.story !== story) {
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
        let { env, story } = nextProps;
        let { p } = env.locale;
        if (story) {
            if (story.type === 'survey') {
                let langText = p(story.details.text);
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
            } else if (story.type === 'task-list') {
                nextState.userAnswers = null;
            }
        }
    }

    /**
     * Return true if the current user has already voted
     *
     * @return {Boolean|undefined}
     */
    hasUserVoted() {
        let { reactions, currentUser } = this.props;
        if (reactions === null) {
            return undefined;
        }
        let vote = getUserVote(reactions, currentUser);
        return !!vote;
    }

    /**
     * Return true of the current user can vote
     *
     * @return {Boolean}
     */
    canUserVote() {
        let { access } = this.props;
        return (access === 'read-write');
    }

    /**
     * Clear state.voteSubmitted once vote has been recorded
     *
     * @param  {Object} prevProps
     */
    componentDidUpdate(prevProps) {
        let { reactions, currentUser } = this.props;
        let { voteSubmitted } = this.state;
        if (prevProps.reactions !== reactions) {
            if (voteSubmitted) {
                let vote = getUserVote(reactions, currentUser);
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
        let { story } = this.props;
        let { exported } = story.details;
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
                if (exported) {
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
        let { env, story } = this.props;
        let { p } = env.locale;
        let { text, markdown, labels } = story.details;
        let langText = _.trimEnd(p(text));
        let tags;
        if (labels) {
            tags = this.renderLabels();
        }
        if (!langText && !tags) {
            return null;
        }
        if (markdown) {
            return (
                <div className="text story markdown" onClick={this.handleMarkdownClick}>
                    {Markdown.render(langText, this.handleReference)}
                    {tags}
                </div>
            );
        } else {
            let className = 'text story plain-text';
            let emoji = PlainText.findEmoji(langText);
            if (emoji) {
                if (_.join(emoji, '') === langText) {
                    className += ` emoji-${emoji.length}`;
                }
            }
            return (
                <div className={className}>
                    <p>{PlainText.renderEmoji(langText)}</p>
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
        let { env, story, currentUser } = this.props;
        let { userAnswers } = this.state;
        let { p } = env.locale;
        let { text, markdown } = story.details;
        let langText = _.trimEnd(p(text));
        if (!langText) {
            return null;
        }
        let onChange = _.includes(story.user_ids, currentUser.id) ? this.handleTaskListItemChange : null;
        let onReference = this.handleReference;
        if (markdown) {
            let list = Markdown.renderTaskList(langText, userAnswers, onChange, onReference);
            return (
                <div className="text task-list markdown" onClick={this.handleMarkdownClick}>
                    {list}
                </div>
            );
        } else {
            let list = PlainText.renderTaskList(langText, userAnswers, onChange);
            return <div className="text task-list plain-text"><p>{list}</p></div>;
        }
    }

    /**
     * Render survey choices or results depending whether user has voted
     *
     * @return {ReactElement|null}
     */
    renderSurveyText() {
        let { env, story, reactions } = this.props;
        let { userAnswers } = this.state;
        let { p } = env.locale;
        let { text, markdown } = story.details;
        let langText = _.trimEnd(p(text));
        if (!langText) {
            return null;
        }
        let onChange = this.handleSurveyItemChange;
        let onReference = this.handleReference;
        if (this.canUserVote() && !this.hasUserVoted()) {
            if (markdown) {
                let survey = Markdown.renderSurvey(langText, userAnswers, onChange, onReference);
                return (
                    <div className="text survey markdown" onClick={this.handleMarkdownClick}>
                        {survey}
                    </div>
                );
            } else {
                let survey = PlainText.renderSurvey(langText, userAnswers, onChange);
                return <div className="text survey plain-text"><p>{survey}</p></div>;
            }
        } else {
            let voteCounts = countVotes(reactions) || {};
            if (markdown) {
                let results = Markdown.renderSurveyResults(langText, voteCounts, onReference);
                return (
                    <div className="text survey markdown" onClick={this.handleMarkdownClick}>
                        {results}
                    </div>
                );
            } else {
                let results = PlainText.renderSurveyResults(langText, voteCounts);
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
        let { env, story, authors, repo } = this.props;
        let { t, p, g } = env.locale;
        let { action } = story.details;
        let name = UserUtils.getDisplayName(authors[0], env);
        let gender = UserUtils.getGender(authors[0]);
        g(name, gender);
        let repoName = RepoUtils.getDisplayName(repo, env);
        let url = RepoUtils.getURL(repo);
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
        let { env, story, authors, repo } = this.props;
        let { t, p, g } = env.locale;
        let { action } = story.details;
        let name = UserUtils.getDisplayName(authors[0], env);
        let gender = UserUtils.getGender(authors[0]);
        g(name, gender);
        let repoName = RepoUtils.getDisplayName(repo, env);
        let url = RepoUtils.getURL(repo);
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
        let { env, story, authors, currentUser, repo } = this.props;
        let { t, p, g } = env.locale;
        let { title } = story.details;
        let name = UserUtils.getDisplayName(authors[0], env);
        let gender = UserUtils.getGender(authors[0]);
        g(name, gender);
        let number = RepoUtils.getIssueNumber(repo, story);
        let url, target;
        if (UserUtils.canAccessRepo(currentUser, repo)) {
            url = RepoUtils.getIssueURL(repo, story);
            target = repo.type;
        }
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
        let { env, story, authors, repo, currentUser } = this.props;
        let { t, p, g } = env.locale;
        let { title } = story.details;
        let name = UserUtils.getDisplayName(authors[0], env);
        let gender = UserUtils.getGender(authors[0]);
        g(name, gender);
        let url;
        if (UserUtils.canAccessRepo(currentUser, repo)) {
            url = RepoUtils.getMilestoneURL(repo, story);
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
        let { env, story, authors, repo, currentUser } = this.props;
        let { t, p, g } = env.locale;
        let { source_branch: branch1, branch: branch2 } = story.details;
        let name = UserUtils.getDisplayName(authors[0], env);
        let gender = UserUtils.getGender(authors[0]);
        g(name, gender);
        let url;
        if (UserUtils.canAccessRepo(currentUser, repo)) {
            url = RepoUtils.getMergeRequestURL(repo, story);
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
        let { env, story, authors } = this.props;
        let { t, p, g } = env.locale;
        let { action, title, url } = story.details;
        let name = UserUtils.getDisplayName(authors[0], env);
        let gender = UserUtils.getGender(authors[0]);
        g(name, gender);
        title = _.capitalize(title);
        if (action === 'delete') {
            url = undefined;
        }
        return (
            <div className="text wiki">
                <p>
                    <a href={url} target="_blank">
                        {t(`story-$name-${action}d-$page`, name, title)}
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
        let { env, story, authors, repo, currentUser } = this.props;
        let { t, g } = env.locale;
        let {
            comment_ids: commitIDs,
            branch,
            source_branches: sourceBranches
        } = story.details;
        let name = UserUtils.getDisplayName(authors[0], env);
        let gender = UserUtils.getGender(authors[0]);
        g(name, gender);
        let commits = _.size(commitIDs);
        let repoName = RepoUtils.getDisplayName(repo, env);
        let url;
        if (UserUtils.canAccessRepo(currentUser, repo)) {
            url = RepoUtils.getPushURL(repo, story);
        }
        let text;
        if (story.type === 'push') {
            text = t(`story-$name-pushed-to-$branch-of-$repo`, name, branch, repoName);
        } else if (story.type === 'merge') {
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
        let { env, story, authors, repo, currentUser } = this.props;
        let { t, g } = env.locale;
        let { branch } = story.details;
        let name = UserUtils.getDisplayName(authors[0], env);
        let gender = UserUtils.getGender(authors[0]);
        g(name, gender);
        let repoName = RepoUtils.getDisplayName(repo, env);
        let url;
        if (UserUtils.canAccessRepo(currentUser, repo)) {
            url = RepoUtils.getBranchURL(repo, story);
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
        let { env, story } = this.props;
        let { t } = env.locale;
        let files = _.get(story, 'details.files');
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
        let lines = _.get(story, 'details.lines');
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
        let { env, story } = this.props;
        let { t } = env.locale;
        let { state } = story.details;
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
        let { story, repo } = this.props;
        let { labels } = story.details;
        if (_.isEmpty(labels)) {
            return null;
        }
        let tags = _.map(labels, (label, i) => {
            let style = RepoUtils.getLabelStyle(repo, label);
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
        let { env, story } = this.props;
        let { voteSubmitted, userAnswers } = this.state;
        let { t } = env.locale;
        if (story.type !== 'survey') {
            return null;
        }
        if (!this.canUserVote()) {
            return null;
        }
        if (this.hasUserVoted() !== false) {
            return null;
        }
        let submitProps = {
            label: t('story-vote-submit'),
            emphasized: !_.isEmpty(userAnswers),
            disabled: voteSubmitted || _.isEmpty(userAnswers),
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
        let { audioURL } = this.state;
        let { setters } = this.components;
        if (!audioURL) {
            return null;
        }
        let audioProps = {
            ref: setters.audioPlayer,
            src: audioURL,
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
        let { env, story } = this.props;
        let resources = _.get(story, 'details.resources');
        if (!_.isEmpty(this.resourcesReferenced)) {
            // exclude the ones that are shown in Markdown
            resources = _.difference(resources, this.resourcesReferenced);
        }
        if (_.isEmpty(resources)) {
            return null;
        }
        let props = {
            resources,
            width: Math.min(512, env.viewportWidth),
            env,
        };
        return <MediaView {...props} />
    }

    /**
     * Render dialog box showing referenced image at full size
     *
     * @return {ReactElement|null}
     */
    renderReferencedMediaDialog() {
        let { env, story } = this.props;
        let {
            renderingReferencedMediaDialog,
            showingReferencedMediaDialog,
            selectedResourceName
        } = this.state;
        if (!renderingReferencedMediaDialog) {
            return null;
        }
        let resources = _.get(story, 'details.resources');
        let res = Markdown.findReferencedResource(resources, selectedResourceName);
        if (!res) {
            return null;
        }
        let zoomableResources = getZoomableResources(this.resourcesReferenced);
        let zoomableIndex = _.indexOf(zoomableResources, res);
        if (zoomableIndex === -1) {
            return null;
        }
        let dialogProps = {
            show: showingReferencedMediaDialog,
            resources: zoomableResources,
            selectedIndex: zoomableIndex,
            env,
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
        let { env, story } = this.props;
        let { t } = env.locale;
        let components = _.get(story, 'details.components');
        if (_.isEmpty(components)) {
            return null;
        }
        components = sortComponents(components, env);
        return (
            <div className="impact">
                <p className="message">{t('story-push-components-changed')}</p>
                <Scrollable>
                {
                    _.map(components, (component, i) => {
                        return this.renderAppComponent(component, i);
                    })
                }
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
        let { env } = this.props;
        let componentProps = {
            component,
            env,
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
        let { env } = this.props;
        let {
            showingComponentDialog,
            renderingComponentDialog,
            selectedComponent,
        } = this.state;
        if (!renderingComponentDialog) {
            return null;
        }
        let dialogProps = {
            show: showingComponentDialog,
            component: selectedComponent,
            env,
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
        let { onChange } = this.props;
        if (onChange) {
            onChange({
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
        let { onReaction } = this.props;
        if (onReaction) {
            onReaction({
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
        let { env, story } = this.props;
        let resources = _.get(story, 'details.resources');
        let res = Markdown.findReferencedResource(resources, evt.name);
        if (res) {
            let url;
            if (evt.forImage)  {
                if (res.type === 'audio') {
                    url = require('!file-loader!speaker.svg') + `#${encodeURI(res.url)}`;
                } else {
                    // images are style at height = 1.5em
                    url = env.getImageURL(res, { height: 24 });
                }
            } else {
                url = env.getURL(res);
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
         let { env, story } = this.props;
         let resources = _.get(story, 'details.resources');
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
                     let audioURL = env.getAudioURL(res, { version });
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
        let { story, reactions, currentUser } = this.props;
        let { userAnswers } = this.state;
        let target = evt.currentTarget;
        let list = parseInt(target.name);
        let item = parseInt(target.value);
        let selected = target.checked;

        // save the answer in state for immediately UI response
        userAnswers = _.decoupleSet(userAnswers, [ list, item ], selected);
        this.setState({ userAnswers });

        // update the text of the story
        story = _.cloneDeep(story);
        let taskCounts = [];
        story.details.text = _.mapValues(story.details.text, (langText) => {
            let tokens = ListParser.extract(langText);
            ListParser.set(tokens, list, item, selected);
            let unfinished = ListParser.count(tokens, false);
            taskCounts.push(unfinished);
            return ListParser.join(tokens);
        });
        story.unfinished_tasks = _.max(taskCounts);
        this.triggerChangeEvent(story);

        // add or remove reaction
        let task = { list, item };
        if (selected) {
            let reaction = {
                type: 'task-completion',
                story_id: story.id,
                user_id: currentUser.id,
                published: true,
                public: true,
                details: { task },
            };
            this.triggerReactionEvent(reaction);
        } else {
            // delete the task completion reaction when the task is unselected
            let reaction = _.find(reactions, (r) => {
                if (r.type === 'task-completion') {
                    if (r.user_id === currentUser.id) {
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
        let { userAnswers } = this.state;
        let target = evt.currentTarget;
        let list = target.name;
        let item = target.value;
        userAnswers = _.decoupleSet(userAnswers, [ list ], item);
        this.setState({ userAnswers });
    }

    /**
     * Called when user clicks on the submit button
     *
     * @param  {Event} evt
     */
    handleVoteSubmitClick = (evt) => {
        let { story, currentUser } = this.props;
        let { userAnswers } = this.state;
        let reaction = {
            type: 'vote',
            story_id: story.id,
            user_id: currentUser.id,
            published: true,
            public: true,
            details: {
                answers: userAnswers
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
        let { showingComponentDialog } = this.state;
        this.setState({ showingComponentDialog: false }, () => {
            setTimeout(() => {
                let { showingComponentDialog } = this.state;
                if (!showingComponentDialog) {
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
                let { showingReferencedMediaDialog } = this.state;
                if (!showingReferencedMediaDialog) {
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

let sortComponents = Memoize(function(components, env) {
    let { p } = env.locale;
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
