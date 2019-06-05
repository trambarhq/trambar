import _ from 'lodash';

const table = 'bookmark';

async function saveBookmarks(db, bookmarks) {
    const bookmarksAfter = await db.save({ table }, bookmarks);
    return bookmarksAfter;
}

async function removeBookmarks(db, bookmarks) {
    const bookmarksAfter = await db.remove({ table }, bookmarks);
    return bookmarksAfter;
}

async function hideBookmark(db, bookmark) {
    const changes = { id: bookmark.id, hidden: true };
    const [ bookmarkAfter ] = await saveBookmarks(db, [ changes ]);
}

async function syncRecipientList(db, story, bookmarks, senderID, recipientIDs) {
    // add bookmarks that don't exist yet
    const addition = [];
    for (let recipientID of recipientIDs) {
        if (!_.some(bookmarks, { target_user_id: recipientID })) {
            addition.push({
                story_id: story.published_version_id || story.id,
                user_ids: [ senderID ],
                target_user_id: recipientID,
            });
        }
    }
    await saveBookmarks(db, addition);

    // delete bookmarks that aren't needed anymore
    // the backend will handle the fact a bookmark can belong to multiple users
    const removal = [];
    for (let bookmark of bookmarks) {
        if (!_.includes(recipientIDs, bookmark.target_user_id)) {
            removal.push(bookmark);
        }
    }
    await removeBookmarks(db, removal);
}

export {
    saveBookmarks,
    removeBookmarks,
    hideBookmark,
    syncRecipientList,
};
