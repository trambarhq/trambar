import _ from 'lodash';
import Moment from 'moment';
import React, { PureComponent } from 'react';
import Memoize from 'utils/memoize';
import ComponentRefs from 'utils/component-refs';
import * as FocusManager from 'utils/focus-manager';
import * as ExternalDataUtils from 'objects/utils/external-data-utils';
import * as IssueUtils from 'objects/utils/issue-utils';
import * as StoryUtils from 'objects/utils/story-utils';
import * as RandomToken from 'utils/random-token';

// widgets
import ProfileImage from 'widgets/profile-image';
import AuthorNames from 'widgets/author-names';
import StoryProgress from 'widgets/story-progress';
import StoryEmblem from 'widgets/story-emblem';
import Scrollable from 'widgets/scrollable';
import ReactionToolbar from 'widgets/reaction-toolbar';
import ReactionList from 'lists/reaction-list';
import HeaderButton from 'widgets/header-button';
import StoryContents from 'views/story-contents';
import StoryViewOptions from 'views/story-view-options';
import CornerPopUp from 'widgets/corner-pop-up';

import './story-view.scss';

const AUTOSAVE_DURATION = 2000;

class StoryView extends PureComponent {
    static displayName = 'StoryView';

    constructor(props) {
        super(props);
        this.components = ComponentRefs({
            reactionContainer: HTMLDivElement,
            reactionList: ReactionList,
            mainPopUp: CornerPopUp,
        });
        this.state = {
            options: defaultOptions,
            commentsExpanded: this.shouldExpandComments(props),
            isTall: false,
        };
        this.updateOptions(this.state, props);
    }

    /**
     * Return class name, possibly with modifiers
     *
     * @return {String}
     */
    getClassName() {
        let className = 'story-view';
        if (this.props.highlighting) {
            className += ' highlighting';
        }
        return className;
    }

    /**
     * Return true if there's a non-published comment by the current user
     *
     * @return {Boolean}
     */
    hasUserDraft() {
        return _.some(this.props.reactions, (r) => {
            if (!r.published) {
                if (r.user_id === this.props.currentUser.id) {
                    return true;
                }
            }
        });
    }

    /**
     * Return true if comment should be expanded automatically
     *
     * @param  {Object} props
     *
     * @return {Boolean|undefined}
     */
    shouldExpandComments(props) {
        if (!props.reactions || !props.respondents) {
            return;
        }
        // expand automatically when it's the current user's story
        let currentUserId = _.get(this.props.currentUser, 'id');
        if (_.includes(props.story.user_ids, currentUserId)) {
            return true;
        }
        // expand automatically when the current user has reacted to story
        if (_.some(props.reactions, { user_id: currentUserId })) {
            return true;
        }

        // expand if a reaction is selected
        if (props.selectedReactionId) {
            if (_.some(props.reactions, { id: props.selectedReactionId })) {
                return true;
            }
        }
        return false;
    }

    /**
     * Update options when new data arrives from server
     *
     * @param  {Object} nextProps
     */
    componentWillReceiveProps(nextProps) {
        let nextState = _.clone(this.state);
        if (this.props.story !== nextProps.story || this.props.recommendations !== nextProps.recommendations) {
            this.updateOptions(nextState, nextProps);
        }
        if (this.props.reactions !== nextProps.reactions || this.props.respondents !== nextProps.respondents) {
            if (nextState.commentsExpanded !== true) {
                if (this.shouldExpandComments(nextProps)) {
                    nextState.commentsExpanded = true;
                }
            }
        }
        let changes = _.shallowDiff(nextState, this.state);
        if (!_.isEmpty(changes)) {
            this.setState(changes);
        }
    }

    /**
     * Update state.options based on props
     *
     * @param  {Object} nextState
     * @param  {Object} nextProps
     */
    updateOptions(nextState, nextProps) {
        let options = nextState.options = _.clone(nextState.options);
        options.hideStory = !nextProps.story.public;
        options.bookmarkRecipients = _.map(nextProps.recommendations, 'target_user_id');
        options.issueDetails = IssueUtils.extractIssueDetails(nextProps.story, nextProps.repos);
        options.keepBookmark = (nextProps.bookmark) ? true : undefined;
    }

    /**
     * Render component
     *
     * @return {ReactElement}
     */
    render() {
        switch (this.props.theme.mode) {
            case 'single-col':
                return this.renderSingleColumn();
            case 'double-col':
                return this.renderDoubleColumn();
            case 'triple-col':
                return this.renderTripleColumn();
        }
    }

    /**
     * Render single-column view
     *
     * @return {ReactElement}
     */
    renderSingleColumn() {
        let reactionToolbar = this.renderReactionToolbar();
        let reactionLink = this.renderReactionLink();
        let needPadding = false;
        if (reactionToolbar || reactionLink) {
            needPadding = true;
            if (!reactionToolbar) {
                reactionToolbar = '\u00a0';
            }
        }
        return (
            <div className={this.getClassName()}>
                <div className="header">
                    <div className="column-1 padded">
                        {this.renderProfileImage()}
                        {this.renderAuthorNames()}
                        {this.renderPopUpMenu('main')}
                    </div>
                </div>
                <div className="body">
                    <div className="column-1 padded">
                        {this.renderProgress()}
                        {this.renderEmblem()}
                        {this.renderContents()}
                    </div>
                </div>
                <div className="header">
                    <div className={'column-2' + (needPadding ? ' padded' : '')}>
                        {reactionToolbar}
                        {reactionLink}
                    </div>
                </div>
                <div className="body">
                    <div className="column-2">
                        {this.renderReactions()}
                    </div>
                </div>
            </div>
        );
    }

    /**
     * Render double-column view
     *
     * @return {ReactElement}
     */
    renderDoubleColumn() {
        return (
            <div className={this.getClassName()}>
                <div className="header">
                    <div className="column-1 padded">
                        {this.renderProfileImage()}
                        {this.renderAuthorNames()}
                        {this.renderPopUpMenu('main')}
                    </div>
                    <div className="column-2 padded">
                        {this.renderReactionToolbar()}
                    </div>
                </div>
                <div className="body">
                    <div className="column-1 padded">
                        {this.renderProgress()}
                        {this.renderEmblem()}
                        {this.renderContents()}
                    </div>
                    <div className="column-2">
                        {this.renderReactions()}
                    </div>
                </div>
            </div>
        );
    }

    /**
     * Render triple-column view
     *
     * @return {ReactElement}
     */
    renderTripleColumn() {
        let t = this.props.locale.translate;
        return (
            <div className={this.getClassName()}>
                <div className="header">
                    <div className="column-1 padded">
                        {this.renderProfileImage()}
                        {this.renderAuthorNames()}
                    </div>
                    <div className="column-2 padded">
                        {this.renderReactionToolbar()}
                    </div>
                    <div className="column-3 padded">
                        <HeaderButton icon="chevron-circle-right" label={t('story-options')} disabled />
                    </div>
                </div>
                <div className="body">
                    <div className="column-1 padded">
                        {this.renderProgress()}
                        {this.renderEmblem()}
                        {this.renderContents()}
                    </div>
                    <div className="column-2">
                        {this.renderReactions()}
                    </div>
                    <div className="column-3 padded">
                        {this.renderOptions()}
                    </div>
                </div>
            </div>
        );
    }

    /**
     * Render the author's profile image
     *
     * @return {ReactElement}
     */
    renderProfileImage() {
        let leadAuthor = _.get(this.props.authors, 0);
        let props = {
            user: leadAuthor,
            theme: this.props.theme,
            size: 'medium',
        };
        if (leadAuthor) {
            props.href = this.props.route.find(require('pages/people-page'), {
                schema: this.props.route.parameters.schema,
                user: leadAuthor.id,
            });
        }
        return <ProfileImage {...props} />;
    }

    /**
     * Render the names of the author and co-authors
     *
     * @return {ReactElement}
     */
    renderAuthorNames() {
        let props = {
            authors: this.props.authors,
            locale: this.props.locale,
            theme: this.props.theme,
        };
        return <AuthorNames {...props} />;
    }

    /**
     * Render link and comment buttons on title bar
     *
     * @return {ReactElement|null}
     */
    renderReactionToolbar() {
        let access = this.props.access;
        if (access !== 'read-comment' && access !== 'read-write') {
            return null;
        }
        let props = {
            access: access,
            currentUser: this.props.currentUser,
            reactions: this.props.reactions,
            respondents: this.props.respondents,
            locale: this.props.locale,
            theme: this.props.theme,
            disabled: !StoryUtils.isSaved(this.props.story),
            onAction: this.handleAction,
        };
        return <ReactionToolbar {...props} />;
    }

    /**
     * Render link for expanding reaction section
     *
     * @return {ReactElement|null}
     */
    renderReactionLink() {
        let count = _.size(this.props.reactions);
        if (count === 0) {
            return null;
        }
        if (this.state.commentsExpanded) {
            return '\u00a0';
        }
        let t = this.props.locale.translate;
        return (
            <span className="reaction-link" onClick={this.handleExpansionClick}>
                {t('story-$count-reactions', count)}
            </span>
        );
    }

    /**
     * Render upload status or the publication time
     *
     * @return {ReactElement}
     */
    renderProgress() {
        let uploadStatus;
        if (this.props.story.ready === false) {
            uploadStatus = this.props.payloads.inquire(this.props.story);
        }
        let props = {
            status: uploadStatus,
            story: this.props.story,
            pending: this.props.pending,
            locale: this.props.locale,
        };
        return <StoryProgress {...props} />;
    }

    /**
     * Render emblem
     *
     * @return {ReactElement}
     */
    renderEmblem() {
        let props = {
            story: this.props.story,
        };
        return <StoryEmblem {...props} />
    }

    /**
     * Render the main contents, including media attached to story
     *
     * @return {ReactElement}
     */
    renderContents() {
        let props = {
            access: this.props.access,
            story: this.props.story,
            authors: this.props.authors,
            currentUser: this.props.currentUser,
            reactions: this.props.reactions,
            repo: findRepo(this.props.repos, this.props.story),
            locale: this.props.locale,
            theme: this.props.theme,

            onChange: this.handleStoryChange,
            onReaction: this.handleStoryReaction,
        };
        return <StoryContents {...props} />;
    }

    /**
     * Render reactions to story
     *
     * @return {ReactElement|null}
     */
    renderReactions() {
        if (_.isEmpty(this.props.reactions)) {
            return null;
        }
        if (this.props.theme.mode === 'single-col') {
            if (!this.state.commentsExpanded) {
                return null;
            }
        }
        let setters = this.components.setters;
        let listProps = {
            access: this.props.access,
            story: this.props.story,
            reactions: this.props.reactions,
            respondents: this.props.respondents,
            repo: findRepo(this.props.repos, this.props.story),
            currentUser: this.props.currentUser,
            database: this.props.database,
            payloads: this.props.payloads,
            route: this.props.route,
            locale: this.props.locale,
            theme: this.props.theme,
            selectedReactionId: this.props.selectedReactionId,
        };
        let className = 'scrollable';
        if (this.state.isTall && this.props.theme.mode !== 'single-col') {
            className += ' abs';
        }
        return (
            <div ref={setters.reactionContainer} className={className}>
                <ReactionList ref={setters.reactionList} {...listProps} />
            </div>
        );
    }

    /**
     * Check the height of the cell containing the reaction scroll box. If it's
     * taller than the scroll box's max height, then we use absolute positioning
     * instead so there's no gap at the bottom.
     */
    adjustReactionContainer() {
        if (this.props.theme.mode !== 'single-col') {
            let container = this.components.reactionContainer;
            if (container) {
                let cell = container.parentNode;
                if (!reactionContainerMaxHeight) {
                    // calculate this once
                    let containerStyle = getComputedStyle(container);
                    reactionContainerMaxHeight = parseInt(containerStyle.maxHeight);
                }
                let isTall = (cell.offsetHeight > reactionContainerMaxHeight);
                if (this.state.isTall !== isTall) {
                    this.setState({ isTall });
                }
            }
        }
    }

    /**
     * Render popup menu containing options for given section
     *
     * @param  {String} section
     *
     * @return {ReactElement}
     */
    renderPopUpMenu(section) {
        let ref = this.components.setters[section + 'PopUp'];
        return (
            <CornerPopUp ref={ref}>
                {this.renderOptions(section)}
            </CornerPopUp>
        );
    }

    /**
     * Render options pane or simply the list of options when it's in a menu
     *
     * @param  {String} section
     *
     * @return {ReactElement}
     */
    renderOptions(section) {
        let props = {
            section,
            access: this.props.access,
            story: this.props.story,
            reactions: this.props.reactions,
            repos: this.props.repos,
            currentUser: this.props.currentUser,
            options: this.state.options,

            database: this.props.database,
            route: this.props.route,
            locale: this.props.locale,
            theme: this.props.theme,

            onChange: this.handleOptionsChange,
            onComplete: this.handleOptionsComplete,
        };
        return <StoryViewOptions {...props} />;
    }

    /**
     * Adjust height of reaction container on mount
     */
    componentDidMount() {
        this.adjustReactionContainer();
    }

    /**
     * Adjust height of reaction container on update
     *
     * @param  {Object} prevProps
     * @param  {Object} prevState
     */
    componentDidUpdate(prevProps, prevState) {
        this.adjustReactionContainer();
    }

    /**
     * Save story to remote database
     *
     * @param  {Story} story
     * @param  {Boolean|undefined} immediate
     *
     * @return {Promise<Story>}
     */
    saveStory(story, immediate) {
        let params = this.props.route.parameters;
        let options = {
            delay: (immediate) ? undefined : AUTOSAVE_DURATION,
            onConflict: (evt) => {
                // perform merge on conflict, if the object still exists
                // otherwise saving will be cancelled
                if (StoryUtils.mergeRemoteChanges(evt.local, evt.remote, original)) {
                    evt.preventDefault();
                }
            },
        };
        let db = this.props.database.use({ schema: params.schema, by: this });
        return db.start().then(() => {
            let newStory = !StoryUtils.isSaved(story);
            let bookmarkRecipients = this.state.options.bookmarkRecipients;
            return db.saveOne({ table: 'story' }, story, options).then((story) => {
                if (newStory && !_.isEmpty(bookmarkRecipients)) {
                    // bookmarks were added after the story was published but
                    // not yet saved
                    return this.sendBookmarks(story, bookmarkRecipients).then((bookmarks) => {
                        return story;
                    });
                }
                return story
            });
        });
    }

    /**
     * Remove story from remote database
     *
     * @param  {Story} story
     *
     * @return {Promise<Story>}
     */
    removeStory(story) {
        let params = this.props.route.parameters;
        let db = this.props.database.use({ schema: params.schema, by: this });
        return db.removeOne({ table: 'story' }, story);
    }

    /**
     * Save reaction to remote database
     *
     * @param  {Reaction} reaction
     *
     * @return {Promise<Reaction>}
     */
    saveReaction(reaction) {
        let params = this.props.route.parameters;
        let db = this.props.database.use({ schema: params.schema, by: this });
        return db.start().then(() => {
            return db.saveOne({ table: 'reaction' }, reaction);
        });
    }

    /**
     * Remove a reaction from remote database
     *
     * @param  {Reaction} reaction
     *
     * @return {Promise<Reaction>}
     */
    removeReaction(reaction) {
        let params = this.props.route.parameters;
        let db = this.props.database.use({ schema: params.schema, by: this });
        return db.start().then(() => {
            return db.removeOne({ table: 'reaction' }, reaction);
        });
    }

    /**
     * Save bookmarks to remote database
     *
     * @param  {Array<Bookmark>} bookmarks
     *
     * @return {Promise<Array<Bookmark>>}
     */
    saveBookmarks(bookmarks) {
        if (_.isEmpty(bookmarks)) {
            return Promise.resolve([]);
        }
        let params = this.props.route.parameters;
        let db = this.props.database.use({ schema: params.schema, by: this });
        return db.start().then(() => {
            return db.save({ table: 'bookmark' }, bookmarks);
        });
    }

    /**
     * Remove bookmarks from remote database
     *
     * @param  {Array<Bookmark>} bookmarks
     *
     * @return {Promise<Array<Bookmark>>}
     */
    removeBookmarks(bookmarks) {
        if (_.isEmpty(bookmarks)) {
            return Promise.resolve([]);
        }
        let params = this.props.route.parameters;
        let db = this.props.database.use({ schema: params.schema, by: this });
        return db.start().then(() => {
            return db.remove({ table: 'bookmark' }, bookmarks);
        });
    }

    /**
     * Send bookmarks to list of users
     *
     * @param  {Story} story
     * @param  {Array<Number>} recipientIds
     *
     * @return {Promise<Array<Bookmark>>}
     */
    sendBookmarks(story, recipientIds) {
        let bookmarks = this.props.recommendations;
        let newBookmarks = [];
        // add bookmarks that don't exist yet
        _.each(recipientIds, (recipientId) => {
            if (!_.some(bookmarks, { target_user_id: recipientId })) {
                let newBookmark = {
                    story_id: story.published_version_id || story.id,
                    user_ids: [ this.props.currentUser.id ],
                    target_user_id: recipientId,
                };
                newBookmarks.push(newBookmark);
            }
        });
        // delete bookmarks that aren't needed anymore
        // the backend will handle the fact a bookmark can belong to multiple users
        let redundantBookmarks = [];
        _.each(bookmarks, (bookmark) => {
            if (!_.includes(recipientIds, bookmark.target_user_id)) {
                redundantBookmarks.push(bookmark);
            }
        });
        return this.saveBookmarks(newBookmarks).then((newBookmarks) => {
            return this.removeBookmarks(redundantBookmarks).then((redundantBookmarks) => {
                return _.concat(newBookmarks, redundantBookmarks);
            });
        });
    }

    /**
     * Create a task in the backend
     *
     * @param  {String} action
     * @param  {Object} options
     *
     * @return {Promise<Task>}
     */
    sendTask(action, options) {
        let task = {
            action,
            options,
            user_id: this.props.currentUser.id,
            token: RandomToken.generate(),
        };
        let params = this.props.route.parameters;
        let db = this.props.database.use({ schema: params.schema, by: this });
        return db.start().then(() => {
            return db.saveOne({ table: 'task' }, task);
        });
    }

    /**
     * Change options concerning a story
     *
     * @param  {Object} options
     */
    setOptions(options) {
        let before = this.state.options;
        this.setState({ options }, () => {
            let story = this.props.story;
            if (options.editStory && !before.editStory) {
                if (story.id > 1) {
                    // create a temporary object linked to this one
                    let tempCopy = _.omit(story, 'id', 'published', 'ptime');
                    tempCopy.published_version_id = story.id;
                    this.saveStory(tempCopy);
                } else {
                    // story hasn't been saved yet--edit it directly
                    let storyAfter = _.clone(story);
                    storyAfter.published = false;
                    this.saveStory(storyAfter);
                }
            }
            if (options.removeStory && !before.removeStory) {
                this.removeStory(story);
            }
            if (options.bumpStory && !before.bumpStory) {
                let storyAfter = _.clone(story);
                storyAfter.bump = true;
                storyAfter.btime = Moment().toISOString();
                this.saveStory(storyAfter);
                if (this.props.onBump) {
                    this.props.onBump({
                        type: 'bump',
                        target: this,
                    });
                }
            }
            if (options.hideStory !== before.hideStory) {
                let storyAfter = _.clone(story);
                storyAfter.public = !options.hideStory;
                this.saveStory(storyAfter);
            }
            if (options.keepBookmark !== before.keepBookmark) {
                if (this.props.bookmark && !options.keepBookmark) {
                    this.removeBookmarks([ this.props.bookmark ]);
                }
            }
            if (!_.isEqual(options.issueDetails, before.issueDetails)) {
                let params = _.clone(options.issueDetails) || {};
                params.story_id = story.id;
                this.sendTask('export-issue', params);
            }
            if (!_.isEqual(options.bookmarkRecipients, before.bookmarkRecipients)) {
                if (StoryUtils.isSaved(story)) {
                    this.sendBookmarks(this.props.story, options.bookmarkRecipients);
                } else {
                    // to create the bookmarks we need the story id
                    this.saveStory(story);
                }
            }
        });
    }

    /**
     * Called when user changes story (only task lists can change here)
     *
     * @param  {Object} evt
     */
    handleStoryChange = (evt) => {
        this.saveStory(evt.story);
    }

    /**
     * Called when user submits votes
     *
     * @param  {Object} evt
     */
    handleStoryReaction = (evt) => {
        if (evt.reaction.deleted) {
            this.removeReaction(evt.reaction);
        } else {
            this.saveReaction(evt.reaction);
        }
    }

    /**
     * Called when user clicks on reaction link
     *
     * @param  {Event} evt
     */
    handleExpansionClick = (evt) => {
        this.setState({ commentsExpanded: true });
    }

    /**
     * Called when options are changed
     *
     * @param  {Object} evt
     */
    handleOptionsChange = (evt) => {
        this.setOptions(evt.options);
        let section = evt.target.props.section;
        let popUp = this.components[section + 'PopUp'];
        if (popUp) {
            popUp.close();
        }
    }

    /**
     * Called when a change to the story options is complete
     *
     * @param  {Object} evt
     */
    handleOptionsComplete = (evt) => {
        let section = evt.target.props.section;
        let popUp = this.components[section + 'PopUp'];
        if (popUp) {
            popUp.close();
        }
    }

    /**
     * Called when user initiates an action
     *
     * @param  {Object} evt
     */
    handleAction = (evt) => {
        switch (evt.action) {
            case 'like-add':
                let like = {
                    type: 'like',
                    story_id: this.props.story.id,
                    user_id: this.props.currentUser.id,
                    published: true,
                    public: true,
                };
                this.saveReaction(like);
                break;
            case 'like-remove':
                this.removeReaction(evt.like);
                break;
            case 'reaction-add':
                if (!this.state.commentsExpanded) {
                    this.setState({
                        commentsExpanded: true
                    });
                }
                let existing = _.some(this.props.reactions, {
                    user_id: this.props.currentUser.id,
                    published: false,
                });
                if (!existing) {
                    let comment = {
                        type: 'comment',
                        story_id: this.props.story.id,
                        user_id: this.props.currentUser.id,
                        details: {},
                        published: false,
                        public: true,
                    };
                    this.saveReaction(comment);
                }
                FocusManager.focus({
                    type: 'ReactionEditor',
                    story_id: this.props.story.id,
                    user_id: this.props.currentUser.id,
                });
                break;
            case 'reaction-expand':
                this.setState({
                    commentsExpanded: true
                });
                break;
        }
    }
}

let reactionContainerMaxHeight;

let defaultOptions = {
    issueDetails: null,
    hideStory: false,
    editStory: false,
    removeStory: false,
    bumpStory: false,
    bookmarkRecipients: [],
    keepBookmark: undefined,
};

let findRepo = Memoize(function(repos, story) {
    return _.find(repos, (repo) => {
        let link = ExternalDataUtils.findLinkByRelative(story, repo, 'project');
        return !!link;
    });
});

let countRespondents = Memoize(function(reactions) {
    let userIds = _.map(reactions, 'user_id');
    return _.size(_.uniq(userIds));
}, 0);

export {
    StoryView as default,
    StoryView,
};

import Database from 'data/database';
import Payloads from 'transport/payloads';
import Route from 'routing/route';
import Environment from 'env/environment';

if (process.env.NODE_ENV !== 'production') {
    const PropTypes = require('prop-types');

    StoryView.propTypes = {
        access: PropTypes.oneOf([ 'read-only', 'read-comment', 'read-write' ]).isRequired,
        highlighting: PropTypes.bool,
        pending: PropTypes.bool,
        story: PropTypes.object.isRequired,
        bookmark: PropTypes.object,
        authors: PropTypes.arrayOf(PropTypes.object),
        reactions: PropTypes.arrayOf(PropTypes.object),
        respondents: PropTypes.arrayOf(PropTypes.object),
        recommendations: PropTypes.arrayOf(PropTypes.object),
        recipients: PropTypes.arrayOf(PropTypes.object),
        repos: PropTypes.arrayOf(PropTypes.object),
        currentUser: PropTypes.object.isRequired,
        selectedReactionId: PropTypes.number,

        database: PropTypes.instanceOf(Database).isRequired,
        payloads: PropTypes.instanceOf(Payloads).isRequired,
        route: PropTypes.instanceOf(Route).isRequired,
        env: PropTypes.instanceOf(Environment).isRequired,

        onBump: PropTypes.func,
    };
}
