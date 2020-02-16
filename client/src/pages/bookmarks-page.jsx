import _ from 'lodash';
import React from 'react';
import Relaks, { useProgress } from 'relaks';
import * as UserFinder from 'common/objects/finders/user-finder.mjs';
import * as BookmarkFinder from 'common/objects/finders/bookmark-finder.mjs';
import * as ProjectFinder from 'common/objects/finders/project-finder.mjs';
import * as ProjectUtils from 'common/objects/utils/project-utils.mjs';

// widgets
import { PageContainer } from '../widgets/page-container.jsx';
import { BookmarkList } from '../lists/bookmark-list.jsx';
import { LoadingAnimation } from '../widgets/loading-animation.jsx';
import { EmptyMessage } from '../widgets/empty-message.jsx';

import './bookmarks-page.scss';

/**
 * Asynchronous component that retrieves data needed by the Bookmarks page.
 */
async function BookmarksPage(props) {
  const { database, route, env, payloads, highlightStoryID, scrollToStoryID } = props;
  const [ show ] = useProgress();

  render();
  const currentUserID = await database.start();
  const currentUser = await UserFinder.findUser(database, currentUserID)
  const project = await ProjectFinder.findCurrentProject(database)
  const bookmarks = await BookmarkFinder.findBookmarksForUser(database, currentUser)
  render();

  function render() {
    show(
      <PageContainer className="bookmarks-page">
        {renderList()}
        {renderEmptyMessage()}
      </PageContainer>
    );
  }

  function renderList() {
    const listProps = {
      access: ProjectUtils.getUserAccessLevel(project, currentUser) || 'read-only',
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

  function renderEmptyMessage() {
    if (!_.isEmpty(bookmarks)) {
      return null;
    }
    if (!bookmarks) {
      // props.stories is null when they're being loaded
      return <LoadingAnimation />;
    } else {
      const props = {
        phrase: 'bookmarks-no-bookmarks',
        env,
      };
      return <EmptyMessage {...props} />;
    }
  }
}

const component = Relaks.memo(BookmarksPage);

export {
  component as default,
  component as BookmarksPage,
};
