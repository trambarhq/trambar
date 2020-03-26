const table = 'bookmark';

async function saveBookmarks(db, bookmarks) {
  const bookmarksAfter = await db.save({ table }, bookmarks);
  return bookmarksAfter;
}

async function saveBookmark(db, bookmark) {
  const bookmarkAfter = saveBookmarks(db, [ bookmark ]);
  return bookmarkAfter;
}

async function createBookmark(db, story, user) {
  const bookmark = {
    story_id: story.published_version_id || story.id,
    user_ids: [ user.id ],
    target_user_id: user.id,
  };
  return saveBookmark(db, bookmark);
}

async function removeBookmarks(db, bookmarks) {
  const bookmarksAfter = await db.remove({ table }, bookmarks);
  return bookmarksAfter;
}

async function removeBookmark(db, bookmark) {
  const [ bookmarkAfter ] = await removeBookmarks(db, [ bookmark ]);
  return bookmarkAfter;
}

async function hideBookmark(db, bookmark) {
  const changes = { id: bookmark.id, hidden: true };
  const [ bookmarkAfter ] = await saveBookmarks(db, [ changes ]);
}

async function syncBookmarks(db, bookmarks, story, sender, recipients) {
  // add bookmarks that don't exist yet
  const addition = [];
  for (let recipient of recipients) {
    if (!bookmarks.some(bm => bm.target_user_id === recipient.id)) {
      addition.push({
        story_id: story.published_version_id || story.id,
        user_ids: [ sender.id ],
        target_user_id: recipient.id,
      });
    }
  }
  await saveBookmarks(db, addition);

  // delete bookmarks that aren't needed anymore
  // the backend will handle the fact a bookmark can belong to multiple users
  const removal = [];
  for (let bookmark of bookmarks) {
    if (!recipients.some(usr => usr.id === bookmark.target_user_id)) {
      removal.push(bookmark);
    }
  }
  await removeBookmarks(db, removal);
}

export {
  saveBookmark,
  saveBookmarks,
  createBookmark,
  removeBookmark,
  removeBookmarks,
  hideBookmark,
  syncBookmarks,
};
