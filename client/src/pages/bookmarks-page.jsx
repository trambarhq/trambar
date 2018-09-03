import _ from 'lodash';
import React, { PureComponent } from 'react';
import { AsyncComponent } from 'relaks';
import UserFinder from 'objects/finders/user-finder';
import BookmarkFinder from 'objects/finders/bookmark-finder';
import ProjectFinder from 'objects/finders/project-finder';
import ProjectSettings from 'objects/settings/project-settings';

// widgets
import PageContainer from 'widgets/page-container';
import BookmarkList from 'lists/bookmark-list';
import LoadingAnimation from 'widgets/loading-animation';
import EmptyMessage from 'widgets/empty-message';

import './bookmarks-page.scss';

class BookmarksPage extends AsyncComponent {
    static displayName = 'BookmarksPage';

    /**
     * Match current URL against the page's
     *
     * @param  {String} path
     * @param  {Object} query
     *
     * @return {Object|null}
     */
    static parseURL(path, query) {
        return Route.match(path, [
            '/:schema/bookmarks/?',
        ], (params) => {
            return {
                schema: params.schema,
            };
        });
    }

    /**
     * Generate a URL of this page based on given parameters
     *
     * @param  {Object} params
     *
     * @return {Object}
     */
    static getURL(params) {
        var path = `/${params.schema}/bookmarks/`, query;
        return { path, query };
    }

    /**
     * Return configuration info for global UI elements
     *
     * @param  {Route} currentRoute
     *
     * @return {Object}
     */
    static configureUI(currentRoute) {
        var params = currentRoute.parameters;
        var route = {
            schema: params.schema
        };
        return {
            navigation: { route, section: 'bookmarks' }
        };
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
            bookmarks: null,
            currentUser: null,
            project: null,

            database: this.props.database,
            payloads: this.props.payloads,
            route: this.props.route,
            locale: this.props.locale,
            theme: this.props.theme,
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
        var { project, currentUser } = this.props;
        return ProjectSettings.getUserAccessLevel(project, currentUser) || 'read-only';
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
        var params = this.props.route.parameters;
        var listProps = {
            access: this.getAccessLevel(),
            bookmarks: this.props.bookmarks,
            currentUser: this.props.currentUser,
            project: this.props.project,

            database: this.props.database,
            payloads: this.props.payloads,
            route: this.props.route,
            locale: this.props.locale,
            theme: this.props.theme,
        };
        return <BookmarkList {...listProps} />
    }

    /**
     * Render a message if there're no bookmarks
     *
     * @return {ReactElement|null}
     */
    renderEmptyMessage() {
        var bookmarks = this.props.bookmarks;
        if (!_.isEmpty(bookmarks)) {
            return null;
        }
        if (!bookmarks) {
            // props.stories is null when they're being loaded
            return <LoadingAnimation />;
        } else {
            var props = {
                locale: this.props.locale,
                online: this.props.database.online,
                phrase: 'bookmarks-no-bookmarks',
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
import Locale from 'locale/locale';
import Theme from 'theme/theme';

if (process.env.NODE_ENV !== 'production') {
    const PropTypes = require('prop-types');

    BookmarksPage.propTypes = {
        database: PropTypes.instanceOf(Database).isRequired,
        payloads: PropTypes.instanceOf(Payloads).isRequired,
        route: PropTypes.instanceOf(Route).isRequired,
        locale: PropTypes.instanceOf(Locale).isRequired,
        theme: PropTypes.instanceOf(Theme).isRequired,
    };
    BookmarksPageSync.propTypes = {
        bookmarks: PropTypes.arrayOf(PropTypes.object),
        currentUser: PropTypes.object,
        project: PropTypes.object,

        database: PropTypes.instanceOf(Database).isRequired,
        route: PropTypes.instanceOf(Route).isRequired,
        locale: PropTypes.instanceOf(Locale).isRequired,
        theme: PropTypes.instanceOf(Theme).isRequired,
    }
}
