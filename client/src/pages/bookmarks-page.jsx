import _ from 'lodash';
import React, { PureComponent } from 'react';
import { AsyncComponent } from 'relaks';
import * as UserFinder from 'objects/finders/user-finder';
import * as BookmarkFinder from 'objects/finders/bookmark-finder';
import * as ProjectFinder from 'objects/finders/project-finder';
import * as ProjectUtils from 'objects/utils/project-utils';

// widgets
import PageContainer from 'widgets/page-container';
import BookmarkList from 'lists/bookmark-list';
import LoadingAnimation from 'widgets/loading-animation';
import EmptyMessage from 'widgets/empty-message';

import './bookmarks-page.scss';

class BookmarksPage extends AsyncComponent {
    static displayName = 'BookmarksPage';

    /**
     * Render the component asynchronously
     *
     * @param  {Meanwhile} meanwhile
     *
     * @return {Promise<ReactElement>}
     */
    renderAsync(meanwhile) {
        let { database, route, env, payloads } = this.props;
        let db = database.use({ by: this });
        let props = {
            bookmarks: null,
            currentUser: null,
            project: null,

            database,
            route,
            payloads,
            env,
        };
        meanwhile.show(<BookmarksPageSync {...props} />);
        return db.start().then((currentUserId) => {
            return UserFinder.findUser(db, currentUserId).then((user) => {
                props.currentUser = user;
            });
        }).then(() => {
            return ProjectFinder.findCurrentProject(db).then((project) => {
                props.project = project;
            });
        }).then((project) => {
            return BookmarkFinder.findBookmarksForUser(db, props.currentUser).then((bookmarks) => {
                props.bookmarks = bookmarks;
            });
        }).then(() => {
            return <BookmarksPageSync {...props} />;
        });
    }
}

class BookmarksPageSync extends PureComponent {
    static displayName = 'BookmarksPage.Sync';

    /**
     * Return the access level
     *
     * @return {String}
     */
    getAccessLevel() {
        let { project, currentUser } = this.props;
        return ProjectUtils.getUserAccessLevel(project, currentUser) || 'read-only';
    }

    /**
     * Render component
     *
     * @return {ReactElement}
     */
    render() {
        return (
            <PageContainer className="bookmarks-page">
                {this.renderList()}
                {this.renderEmptyMessage()}
            </PageContainer>
        );
    }

    /**
     * Render list of bookmarks
     *
     * @return {ReactElement}
     */
    renderList() {
        let { database, route, env, payloads, bookmarks, currentUser, project } = this.props;
        let listProps = {
            access: this.getAccessLevel(),
            bookmarks,
            currentUser,
            project,

            database,
            payloads,
            route,
            env,
        };
        return <BookmarkList {...listProps} />
    }

    /**
     * Render a message if there're no bookmarks
     *
     * @return {ReactElement|null}
     */
    renderEmptyMessage() {
        let { env, bookmarks } = this.props;
        if (!_.isEmpty(bookmarks)) {
            return null;
        }
        if (!bookmarks) {
            // props.stories is null when they're being loaded
            return <LoadingAnimation />;
        } else {
            let props = {
                phrase: 'bookmarks-no-bookmarks',
                env,
            };
            return <EmptyMessage {...props} />;
        }
    }
}

export {
    BookmarksPage as default,
    BookmarksPage,
    BookmarksPageSync,
};

import Database from 'data/database';
import Payloads from 'transport/payloads';
import Route from 'routing/route';
import Environment from 'env/environment';

if (process.env.NODE_ENV !== 'production') {
    const PropTypes = require('prop-types');

    BookmarksPage.propTypes = {
        scrollToStoryID: PropTypes.number,
        highlightStoryID: PropTypes.number,
        scrollToReactionID: PropTypes.number,
        highlightReactionID: PropTypes.number,

        database: PropTypes.instanceOf(Database).isRequired,
        payloads: PropTypes.instanceOf(Payloads).isRequired,
        route: PropTypes.instanceOf(Route).isRequired,
        env: PropTypes.instanceOf(Environment).isRequired,
    };
    BookmarksPageSync.propTypes = {
        scrollToStoryID: PropTypes.number,
        highlightStoryID: PropTypes.number,
        scrollToReactionID: PropTypes.number,
        highlightReactionID: PropTypes.number,
        bookmarks: PropTypes.arrayOf(PropTypes.object),
        currentUser: PropTypes.object,
        project: PropTypes.object,

        database: PropTypes.instanceOf(Database).isRequired,
        route: PropTypes.instanceOf(Route).isRequired,
        env: PropTypes.instanceOf(Environment).isRequired,
    }
}
