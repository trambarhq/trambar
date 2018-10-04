import _ from 'lodash';
import Moment from 'moment';
import React, { PureComponent } from 'react';
import { memoizeWeak } from 'utils/memoize';
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
        let { highlighting } = this.props;
        let className = 'story-view';
        if (highlighting) {
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
        let { reactions, currentUser } = this.props;
        return _.some(reactions, (r) => {
            if (!r.published) {
                if (r.user_id === currentUser.id) {
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
        let { reactions, respondents, story, currentUser, selectedReactionID } = props;
        if (!reactions || !respondents) {
            return;
        }
        // expand automatically when it's the current user's story
        if (_.includes(story.user_ids, currentUser.id)) {
            return true;
        }
        // expand automatically when the current user has reacted to story
        if (_.some(reactions, { user_id: currentUser.id })) {
            return true;
        }

        // expand if a reaction is selected
        if (selectedReactionID) {
            if (_.some(props.reactions, { id: selectedReactionID })) {
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
        let { story, recommendations, reactions, respondents } = this.props;
        let nextState = _.clone(this.state);
        if (nextProps.story !== story || nextProps.recommendations !== recommendations) {
            this.updateOptions(nextState, nextProps);
        }
        if (nextProps.reactions !== reactions || nextProps.respondents !== respondents) {
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
        let { env } = this.props;
        if (env.isWiderThan('triple-col')) {
            return this.renderTripleColumn();
        } else if (env.isWiderThan('double-col')) {
            return this.renderDoubleColumn();
        } else {
            return this.renderSingleColumn();
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
        let { env } = this.props;
        let { t } = env.locale;
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
        let { route, env, authors } = this.props;
        let leadAuthor = _.get(authors, 0);
        let props = {
            user: leadAuthor,
            size: 'medium',
            env,
        };
        if (leadAuthor) {
            props.href = route.find('person-page', { selectedUserID: leadAuthor.id });
        }
        return <ProfileImage {...props} />;
    }

    /**
     * Render the names of the author and co-authors
     *
     * @return {ReactElement}
     */
    renderAuthorNames() {
        let { env, authors } = this.props;
        let props = { authors, env };
        return <AuthorNames {...props} />;
    }

    /**
     * Render link and comment buttons on title bar
     *
     * @return {ReactElement|null}
     */
    renderReactionToolbar() {
        let { env, story, reactions, respondents, currentUser, access } = this.props;
        if (access !== 'read-comment' && access !== 'read-write') {
            return null;
        }
        let props = {
            access,
            currentUser,
            reactions,
            respondents,
            env,
            disabled: !StoryUtils.isSaved(story),
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
        let { env, reactions } = this.props;
        let { commentsExpanded } = this.state;
        let { t } = env.locale;
        let count = _.size(reactions);
        if (count === 0) {
            return null;
        }
        if (commentsExpanded) {
            return '\u00a0';
        }
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
        let { payloads, env, story, pending } = this.props;
        let uploadStatus;
        if (story.ready === false) {
            uploadStatus = payloads.inquire(story);
        }
        let props = {
            status: uploadStatus,
            story,
            pending,
            env,
        };
        return <StoryProgress {...props} />;
    }

    /**
     * Render emblem
     *
     * @return {ReactElement}
     */
    renderEmblem() {
        let { story } = this.props;
        let props = { story };
        return <StoryEmblem {...props} />
    }

    /**
     * Render the main contents, including media attached to story
     *
     * @return {ReactElement}
     */
    renderContents() {
        let { env, story, authors, reactions, currentUser, repos, access } = this.props;
        let props = {
            access,
            story,
            authors,
            currentUser,
            reactions,
            repo: findRepo(repos, story),
            env,
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
        let {
            database,
            route,
            payloads,
            env,
            story,
            authors,
            reactions,
            respondents,
            currentUser,
            repos,
            access,
            highlightReactionID,
            scrollToReactionID,
        } = this.props;
        let { commentsExpanded, isTall } = this.state;
        let { setters } = this.components;
        if (_.isEmpty(reactions)) {
            return null;
        }
        if (!env.isWiderThan('double-col')) {
            if (!commentsExpanded) {
                return null;
            }
        }
        let listProps = {
            access,
            story,
            reactions,
            respondents,
            repo: findRepo(repos, story),
            currentUser,
            database,
            payloads,
            route,
            env,
            highlightReactionID,
            scrollToReactionID,
        };
        let className = 'scrollable';
        if (isTall && env.isWiderThan('double-col')) {
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
        let { env } = this.props;
        if (env.isWiderThan('double-col')) {
            let { isTall } = this.state;
            let { reactionContainer } = this.components;
            if (reactionContainer) {
                let cell = reactionContainer.parentNode;
                if (!reactionContainerMaxHeight) {
                    // calculate this once
                    let containerStyle = getComputedStyle(reactionContainer);
                    reactionContainerMaxHeight = parseInt(containerStyle.maxHeight);
                }
                let isTallAfter = (cell.offsetHeight > reactionContainerMaxHeight);
                if (isTall !== isTallAfter) {
                    this.setState({ isTall: isTallAfter });
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
        let { setters } = this.components;
        let ref = setters[section + 'PopUp'];
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
        let {
            database,
            route,
            env,
            story,
            reactions,
            repos,
            currentUser,
            access,
        } = this.props;
        let { options } = this.state;
        let props = {
            section,
            access,
            story,
            reactions,
            repos,
            currentUser,
            options,
            database,
            route,
            env,
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
        let { database } = this.props;
        let { options } = this.state;
        let saveOptions = {
            delay: (immediate) ? undefined : AUTOSAVE_DURATION,
            onConflict: (evt) => {
                // perform merge on conflict, if the object still exists
                // otherwise saving will be cancelled
                if (StoryUtils.mergeRemoteChanges(evt.local, evt.remote, original)) {
                    evt.preventDefault();
                }
            },
        };
        let db = database.use({ by: this });
        return db.start().then(() => {
            let newStory = !StoryUtils.isSaved(story);
            let bookmarkRecipients = options.bookmarkRecipients;
            return db.saveOne({ table: 'story' }, story, saveOptions).then((story) => {
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
        let { database } = this.props;
        let db = database.use({ by: this });
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
        let { database } = this.props;
        let db = database.use({ by: this });
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
        let { database } = this.props;
        let db = database.use({ by: this });
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
        let { database } = this.props;
        if (_.isEmpty(bookmarks)) {
            return Promise.resolve([]);
        }
        let db = database.use({ by: this });
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
        let { database } = this.props;
        if (_.isEmpty(bookmarks)) {
            return Promise.resolve([]);
        }
        let db = database.use({ by: this });
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
        let { database, recommendations, currentUser } = this.props;
        let newBookmarks = [];
        // add bookmarks that don't exist yet
        _.each(recipientIds, (recipientId) => {
            if (!_.some(recommendations, { target_user_id: recipientId })) {
                let newBookmark = {
                    story_id: story.published_version_id || story.id,
                    user_ids: [ currentUser.id ],
                    target_user_id: recipientId,
                };
                newBookmarks.push(newBookmark);
            }
        });
        // delete bookmarks that aren't needed anymore
        // the backend will handle the fact a bookmark can belong to multiple users
        let redundantBookmarks = [];
        _.each(recommendations, (bookmark) => {
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
        let { database, currentUser } = this.props;
        let task = {
            action,
            options,
            user_id: currentUser.id,
            token: RandomToken.generate(),
        };
        let db = database.use({ by: this });
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
        let { story, bookmark, onBump } = this.props;
        let { options: before } = this.state;
        this.setState({ options }, () => {
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
                if (onBump) {
                    onBump({
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
                if (bookmark && !options.keepBookmark) {
                    this.removeBookmarks([ bookmark ]);
                }
            }
            if (!_.isEqual(options.issueDetails, before.issueDetails)) {
                let params = _.clone(options.issueDetails) || {};
                params.story_id = story.id;
                this.sendTask('export-issue', params);
            }
            if (!_.isEqual(options.bookmarkRecipients, before.bookmarkRecipients)) {
                if (StoryUtils.isSaved(story)) {
                    this.sendBookmarks(story, options.bookmarkRecipients);
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
        let { story, reactions, currentUser } = this.props;
        let { commentsExpanded } = this.state;
        switch (evt.action) {
            case 'like-add':
                let like = {
                    type: 'like',
                    story_id: story.id,
                    user_id: currentUser.id,
                    details: {},
                    published: true,
                    public: true,
                };
                this.saveReaction(like);
                break;
            case 'like-remove':
                this.removeReaction(evt.like);
                break;
            case 'reaction-add':
                if (!commentsExpanded) {
                    this.setState({ commentsExpanded: true });
                }
                let existing = _.some(reactions, {
                    user_id: currentUser.id,
                    published: false,
                });
                if (!existing) {
                    let comment = {
                        type: 'comment',
                        story_id: story.id,
                        user_id: currentUser.id,
                        details: {},
                        published: false,
                        public: true,
                    };
                    this.saveReaction(comment);
                }
                FocusManager.focus({
                    type: 'ReactionEditor',
                    story_id: story.id,
                    user_id: currentUser.id,
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

const findRepo = memoizeWeak(null, function(repos, story) {
    return _.find(repos, (repo) => {
        let link = ExternalDataUtils.findLinkByRelative(story, repo, 'project');
        return !!link;
    });
});

const countRespondents = memoizeWeak(null, function(reactions) {
    let userIds = _.map(reactions, 'user_id');
    return _.size(_.uniq(userIds));
});

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
        highlightReactionID: PropTypes.number,
        scrollToReactionID: PropTypes.number,

        authors: PropTypes.arrayOf(PropTypes.object),
        reactions: PropTypes.arrayOf(PropTypes.object),
        respondents: PropTypes.arrayOf(PropTypes.object),
        recommendations: PropTypes.arrayOf(PropTypes.object),
        recipients: PropTypes.arrayOf(PropTypes.object),
        repos: PropTypes.arrayOf(PropTypes.object),
        currentUser: PropTypes.object.isRequired,

        database: PropTypes.instanceOf(Database).isRequired,
        payloads: PropTypes.instanceOf(Payloads).isRequired,
        route: PropTypes.instanceOf(Route).isRequired,
        env: PropTypes.instanceOf(Environment).isRequired,

        onBump: PropTypes.func,
    };
}
