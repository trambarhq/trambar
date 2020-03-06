import _ from 'lodash';
import React from 'react';
import { useProgress } from 'relaks';
import { findUser } from 'common/objects/finders/user-finder.js';
import { findBookmarksForUser } from 'common/objects/finders/bookmark-finder.js';
import { findCurrentProject } from 'common/objects/finders/project-finder.js';
import { getUserAccessLevel } from 'common/objects/utils/project-utils.js';

// widgets
import { PageContainer } from '../widgets/page-container.jsx';
import { BookmarkList } from '../lists/bookmark-list.jsx';
import { LoadingAnimation } from '../widgets/loading-animation.jsx';
import { EmptyMessage } from '../widgets/empty-message.jsx';

import './bookmarks-page.scss';

/**
 * Asynchronous component that retrieves data needed by the Bookmarks page.
 */
export default async function BookmarksPage(props) {
  const { database, route, env, payloads, highlightStoryID, scrollToStoryID } = props;
  const [ show ] = useProgress();

  render();
  const currentUserID = await database.start();
  const currentUser = await findUser(database, currentUserID)
  const project = await findCurrentProject(database)
  const bookmarks = await findBookmarksForUser(database, currentUser)
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
      access: getUserAccessLevel(project, currentUser) || 'read-only',
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
