import _ from 'lodash';
import Promise from 'bluebird';
import React, { PureComponent } from 'react';
import { AsyncComponent } from 'relaks';
import Memoize from 'utils/memoize';
import Empty from 'data/empty';
import Merger from 'data/merger';
import UserFinder from 'objects/finders/user-finder';
import StoryFinder from 'objects/finders/story-finder';
import RepoFinder from 'objects/finders/repo-finder';
import BookmarkFinder from 'objects/finders/bookmark-finder';
import ReactionFinder from 'objects/finders/reaction-finder';

// widgets
import SmartList from 'widgets/smart-list';
import BookmarkView from 'views/bookmark-view';
import StoryView from 'views/story-view';
import StoryEditor from 'editors/story-editor';
import NewItemsAlert from 'widgets/new-items-alert';

import './bookmark-list.scss';

class BookmarkList extends AsyncComponent {
    static displayName = 'BookmarkList';

    /**
     * Extract id from URL hash
     *
     * @param  {String} hash
     *
     * @return {Object}
     */
    static parseHash(hash) {
        var story, highlighting;
        if (story = Route.parseId(hash, /S(\d+)/)) {
            highlighting = true;
        } else if (story = Route.parseId(hash, /s(\d+)/)) {
            highlighting = false;
        }
        return { story, highlighting };
    }

    /**
     * Get URL hash based on given parameters
     *
     * @param  {Object} params
     *
     * @return {String}
     */
    static getHash(params) {
        if (params.story) {
            if (params.highlighting) {
                return `S${params.story}`;
            } else {
                return `s${params.story}`;
            }
        }
        return '';
    }

    /**
     * Render the component asynchronously
     *
     * @param  {Meanwhile} meanwhile
     *
     * @return {Promise<ReactElement>}
     */
    renderAsync(meanwhile) {
        var params = this.props.route.parameters;
        var db = this.props.database.use({ schema: params.schema, by: this });
        var props = {
            stories: null,
            draftStories: null,
            authors: null,
            senders: null,
            reactions: null,
            respondents: null,
            recommendations: null,
            recipients: null,
            repos: null,

            access: this.props.access,
            bookmarks: this.props.bookmarks,
            currentUser: this.props.currentUser,
            project: this.props.project,
            database: this.props.database,
            payloads: this.props.payloads,
            route: this.props.route,
            locale: this.props.locale,
            theme: this.props.theme,
        };
        meanwhile.show(<BookmarkListSync {...props} />);
        return db.start().then((userId) => {
            return RepoFinder.findProjectRepos(db, props.project).then((repos) => {
                props.repos = repos;
            });
        }).then(() => {
            return StoryFinder.findStoriesOfBookmarks(db, props.bookmarks, props.currentUser).then((stories) => {
                props.stories = stories
            });
        }).then(() => {
            meanwhile.show(<BookmarkListSync {...props} />);
            return StoryFinder.findDraftStories(db, props.currentUser).then((stories) => {
                props.draftStories = stories;
            });
        }).then(() => {
            meanwhile.show(<BookmarkListSync {...props} />);
            var stories = _.filter(_.concat(props.draftStories, props.stories));
            return UserFinder.findStoryAuthors(db, stories).then((users) => {
                props.authors = users;
            });
        }).then(() => {
            meanwhile.show(<BookmarkListSync {...props} />);
            return UserFinder.findBookmarkSenders(db, props.bookmarks).then((users) => {
                props.senders = users;
            });
        }).then(() => {
            meanwhile.show(<BookmarkListSync {...props} />);
            return ReactionFinder.findReactionsToStories(db, props.stories, props.currentUser).then((reactions) => {
                props.reactions = reactions;
            });
        }).then(() => {
            meanwhile.show(<BookmarkListSync {...props} />);
            return UserFinder.findReactionAuthors(db, props.reactions).then((users) => {
                props.respondents = users;
            });
        }).then(() => {
            meanwhile.show(<BookmarkListSync {...props} />);
            return BookmarkFinder.findBookmarksByUser(db, props.currentUser).then((bookmarks) => {
                props.recommendations = bookmarks;
            });
        }).then(() => {
            meanwhile.show(<BookmarkListSync {...props} />);
            return UserFinder.findBookmarkRecipients(db, props.recommendations).then((users) => {
                props.recipients = users;
            });
        }).then(() => {
            return <BookmarkListSync {...props} />;
        });
    }
}

class BookmarkListSync extends PureComponent {
    static displayName = 'BookmarkList.Sync';

    constructor(props) {
        super(props);
        this.state = {
            hiddenStoryIds: [],
        };
    }

    /**
     * Render component
     *
     * @return {ReactElement}
     */
    render() {
        var bookmarks = sortBookmark(this.props.bookmarks);
        var anchor;
        var hashParams = BookmarkList.parseHash(this.props.route.hash);
        if (hashParams.story) {
            anchor = `story-${hashParams.story}`;
        }
        var smartListProps = {
            items: bookmarks,
            behind: 4,
            ahead: 8,
            anchor: anchor,
            offset: 20,

            onIdentity: this.handleBookmarkIdentity,
            onRender: this.handleBookmarkRender,
            onAnchorChange: this.handleBookmarkAnchorChange,
            onBeforeAnchor: this.handleBookmarkBeforeAnchor,
        };
        return (
            <div className="bookmark-list">
                <SmartList {...smartListProps} />
                {this.renderNewStoryAlert()}
            </div>
        );
    }

    /**
     * Render alert indicating there're new stories hidden up top
     *
     * @return {ReactElement}
     */
    renderNewStoryAlert() {
        var t = this.props.locale.translate;
        var count = _.size(this.state.hiddenStoryIds);
        var params = {
            story: _.first(this.state.hiddenStoryIds)
        };
        var props = {
            hash: BookmarkList.getHash(params),
            route: this.props.route,
            onClick: this.handleNewBookmarkAlertClick,
        };
        return (
            <NewItemsAlert {...props}>
                {t('alert-$count-new-bookmarks', count)}
            </NewItemsAlert>
        );
    }

    /**
     * Return id of bookmark view in response to event triggered by SmartList
     *
     * @param  {Object} evt
     *
     * @return {String}
     */
    handleBookmarkIdentity = (evt) => {
        return `story-${evt.item.story_id}`;
    }

    /**
     * Render a bookmark
     *
     * @param  {Object} evt
     *
     * @return {ReactElement|null}
     */
    handleBookmarkRender = (evt) => {
        var bookmark = evt.item;
        var story = findStory(this.props.stories, bookmark);
        if (!story) {
            return null;
        }

        // see if it's being editted
        var editing = false;
        var highlighting = false;
        if (story) {
            if (this.props.access === 'read-write') {
                if (!story.published) {
                    editing = true;
                } else {
                    var tempCopy = _.find(this.props.draftStories, { published_version_id: story.id });
                    if (tempCopy) {
                        // edit the temporary copy
                        story = tempCopy;
                        editing = true;
                    }
                }
            }

            var hash = this.props.route.hash;
            var hashParams = BookmarkList.parseHash(hash);
            if (story.id === hashParams.story) {
                if (hashParams.highlighting) {
                    highlighting = true;
                    // suppress highlighting after a second
                    setTimeout(() => {
                        this.props.route.reanchor(_.toLower(hash));
                    }, 1000);
                }
            }
        }
        if (editing || evt.needed) {
            var senders = findSenders(this.props.senders, bookmark);
            var bookmarkProps = {
                highlighting,
                bookmark,
                senders,
                currentUser: this.props.currentUser,

                database: this.props.database,
                route: this.props.route,
                locale: this.props.locale,
                theme: this.props.theme,
            };
        }
        if (editing) {
            var authors = findAuthors(this.props.authors, story);
            var recommendations = findRecommendations(this.props.recommendations, story);
            var recipients = findRecipients(this.props.recipients, recommendations);
            if (!story) {
                authors = array(this.props.currentUser);
            }
            var editorProps = {
                story,
                authors,
                recommendations,
                recipients,
                currentUser: this.props.currentUser,
                database: this.props.database,
                payloads: this.props.payloads,
                route: this.props.route,
                locale: this.props.locale,
                theme: this.props.theme,
            };
            return (
                <BookmarkView {...bookmarkProps}>
                    <StoryEditor {...editorProps}/>
                </BookmarkView>
            );
        } else {
            if (evt.needed) {
                var reactions = findReactions(this.props.reactions, story);
                var authors = findAuthors(this.props.authors, story);
                var respondents = findRespondents(this.props.respondents, reactions);
                var recommendations = findRecommendations(this.props.recommendations, story);
                var recipients = findRecipients(this.props.recipients, recommendations);
                var storyProps = {
                    access: this.props.access,
                    story,
                    bookmark,
                    reactions,
                    authors,
                    respondents,
                    recommendations,
                    recipients,
                    repos: this.props.repos,
                    currentUser: this.props.currentUser,
                    database: this.props.database,
                    payloads: this.props.payloads,
                    route: this.props.route,
                    locale: this.props.locale,
                    theme: this.props.theme,
                };
                return (
                    <BookmarkView {...bookmarkProps}>
                        <StoryView {...storyProps} />
                    </BookmarkView>
                );
            } else {
                var height = evt.previousHeight || evt.estimatedHeight || 100;
                return <div className="bookmark-view" style={{ height }} />
            }
        }

    }

    /**
     * Called when a different story is positioned at the top of the viewport
     *
     * @param  {Object} evt
     */
    handleBookmarkAnchorChange = (evt) => {
        var params = {
            story: _.get(evt.item, 'story_id')
        };
        var hash = BookmarkList.getHash(params);
        this.props.route.reanchor(hash);
    }

    /**
     * Called when SmartList notice new items were rendered off screen
     *
     * @param  {Object} evt
     */
    handleBookmarkBeforeAnchor = (evt) => {
        var hiddenStoryIds = _.map(evt.items, 'story_id');
        this.setState({ hiddenStoryIds });
    }

    /**
     * Called when user clicks on new story alert
     *
     * @param  {Event} evt
     */
    handleNewBookmarkAlertClick = (evt) => {
        this.setState({ hiddenStoryIds: [] });
    }
}

var array = Memoize(function(object) {
    return [ object ];
});

var sortBookmark = Memoize(function(bookmarks) {
    return _.orderBy(bookmarks, [ 'id' ], [ 'desc' ]);
});

var findStory = Memoize(function(stories, bookmark) {
    if (bookmark) {
        return _.find(stories, { id: bookmark.story_id });
    } else {
        return null;
    }
});

var findReactions = Memoize(function(reactions, story) {
    if (story) {
        var list = _.filter(reactions, { story_id: story.id });
        if (!_.isEmpty(list)) {
            return list;
        }
    }
    return Empty.array;
});

var findAuthors = Memoize(function(users, story) {
    if (story) {
        var list = _.filter(_.map(story.user_ids, (userId) => {
           return _.find(users, { id: userId });
        }));
        if (!_.isEmpty(list)) {
            return list;
        }
    }
    return Empty.array;
});
var findSenders = findAuthors;

var findRespondents = Memoize(function(users, reactions) {
    var respondentIds = _.uniq(_.map(reactions, 'user_id'));
    var list = _.filter(_.map(respondentIds, (userId) => {
        return _.find(users, { id: userId });
    }));
    if (!_.isEmpty(list)) {
        return list;
    }
    return Empty.array;
})

var findRecommendations = Memoize(function(recommendations, story) {
    if (story) {
        var storyId = story.published_version_id || story.id;
        var list = _.filter(recommendations, { story_id: storyId });
        if (!_.isEmpty(list)) {
            return list;
        }
    }
    return Empty.array;
});

var findRecipients = Memoize(function(recipients, recommendations) {
    var list = _.filter(recipients, (recipient) => {
        return _.some(recommendations, { target_user_id: recipient.id });
    });
    if (!_.isEmpty(list)) {
        return list;
    }
    return Empty.array;
});

function getAuthorIds(stories, currentUser) {
    var userIds = _.flatten(_.map(stories, 'user_ids'));
    if (currentUser) {
        userIds.push(currentUser.id);
    }
    return _.uniq(userIds);
}

export {
    BookmarkList as default,
    BookmarkList,
    BookmarkListSync,
};

import Database from 'data/database';
import Payloads from 'transport/payloads';
import Route from 'routing/route';
import Locale from 'locale/locale';
import Theme from 'theme/theme';

if (process.env.NODE_ENV !== 'production') {
    const PropTypes = require('prop-types');

    BookmarkList.propTypes = {
        access: PropTypes.oneOf([ 'read-only', 'read-comment', 'read-write' ]).isRequired,
        bookmarks: PropTypes.arrayOf(PropTypes.object),
        currentUser: PropTypes.object,
        project: PropTypes.object,
        selectedStoryId: PropTypes.number,

        database: PropTypes.instanceOf(Database).isRequired,
        payloads: PropTypes.instanceOf(Payloads).isRequired,
        route: PropTypes.instanceOf(Route).isRequired,
        locale: PropTypes.instanceOf(Locale).isRequired,
        theme: PropTypes.instanceOf(Theme).isRequired,
    };
    BookmarkList.propTypes = {
        access: PropTypes.oneOf([ 'read-only', 'read-comment', 'read-write' ]).isRequired,
        bookmarks: PropTypes.arrayOf(PropTypes.object),
        senders: PropTypes.arrayOf(PropTypes.object),
        stories: PropTypes.arrayOf(PropTypes.object),
        authors: PropTypes.arrayOf(PropTypes.object),
        draftStories: PropTypes.arrayOf(PropTypes.object),
        draftAuthors: PropTypes.arrayOf(PropTypes.object),
        reactions: PropTypes.arrayOf(PropTypes.object),
        respondents: PropTypes.arrayOf(PropTypes.object),
        recommendations: PropTypes.arrayOf(PropTypes.object),
        recipients: PropTypes.arrayOf(PropTypes.object),
        currentUser: PropTypes.object,
        project: PropTypes.object,
        repos: PropTypes.arrayOf(PropTypes.object),

        database: PropTypes.instanceOf(Database).isRequired,
        payloads: PropTypes.instanceOf(Payloads).isRequired,
        route: PropTypes.instanceOf(Route).isRequired,
        locale: PropTypes.instanceOf(Locale).isRequired,
        theme: PropTypes.instanceOf(Theme).isRequired,
    };
}
