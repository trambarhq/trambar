import _ from 'lodash';
import React, { PureComponent } from 'react';
import { AsyncComponent } from 'relaks';
import * as UserFinder from 'common/objects/finders/user-finder.mjs';
import * as BookmarkFinder from 'common/objects/finders/bookmark-finder.mjs';
import * as ProjectFinder from 'common/objects/finders/project-finder.mjs';
import * as ProjectUtils from 'common/objects/utils/project-utils.mjs';

// widgets
import PageContainer from '../widgets/page-container.jsx';
import BookmarkList from '../lists/bookmark-list.jsx';
import LoadingAnimation from '../widgets/loading-animation.jsx';
import EmptyMessage from '../widgets/empty-message.jsx';

import './bookmarks-page.scss';

/**
 * Asynchronous component that retrieves data needed by the Bookmarks page.
 *
 * @extends AsyncComponent
 */
class BookmarksPage extends AsyncComponent {
    static displayName = 'BookmarksPage';

    /**
     * Render the component asynchronously
     *
     * @param  {Meanwhile} meanwhile
     *
     * @return {Promise<ReactElement>}
     */
    async renderAsync(meanwhile) {
        let {
            database,
            route,
            env,
            payloads,
            highlightStoryID,
            scrollToStoryID,
        } = this.props;
        let db = database.use({ by: this });
        let props = {
            highlightStoryID,
            scrollToStoryID,
            database,
            route,
            payloads,
            env,
        };
        meanwhile.show(<BookmarksPageSync {...props} />);
        let currentUserID = await db.start();
        props.currentUser = await UserFinder.findUser(db, currentUserID)
        props.project = await ProjectFinder.findCurrentProject(db)
        props.bookmarks = await BookmarkFinder.findBookmarksForUser(db, props.currentUser)
        return <BookmarksPageSync {...props} />;
    }
}

/**
 * Synchronous component that actually renders the Bookmarks page.
 *
 * @extends PureComponent
 */
class BookmarksPageSync extends PureComponent {
    static displayName = 'BookmarksPageSync';

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
        let {
            database,
            route,
            env,
            payloads,
            bookmarks,
            currentUser,
            project,
            highlightStoryID,
            scrollToStoryID,
        } = this.props;
        let listProps = {
            access: this.getAccessLevel(),
            bookmarks,
            currentUser,
            project,
            highlightStoryID,
            scrollToStoryID,
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

import Database from 'common/data/database.mjs';
import Payloads from 'common/transport/payloads.mjs';
import Route from 'common/routing/route.mjs';
import Environment from 'common/env/environment.mjs';

if (process.env.NODE_ENV !== 'production') {
    const PropTypes = require('prop-types');

    BookmarksPage.propTypes = {
        scrollToStoryID: PropTypes.number,
        highlightStoryID: PropTypes.number,

        database: PropTypes.instanceOf(Database).isRequired,
        payloads: PropTypes.instanceOf(Payloads).isRequired,
        route: PropTypes.instanceOf(Route).isRequired,
        env: PropTypes.instanceOf(Environment).isRequired,
    };
    BookmarksPageSync.propTypes = {
        scrollToStoryID: PropTypes.number,
        highlightStoryID: PropTypes.number,
        bookmarks: PropTypes.arrayOf(PropTypes.object),
        currentUser: PropTypes.object,
        project: PropTypes.object,

        database: PropTypes.instanceOf(Database).isRequired,
        route: PropTypes.instanceOf(Route).isRequired,
        env: PropTypes.instanceOf(Environment).isRequired,
    }
}
