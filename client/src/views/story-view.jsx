import _ from 'lodash';
import Moment from 'moment';
import React, { useState, useRef, useEffect } from 'react';
import { useListener, useErrorCatcher } from 'relaks';
import { memoizeWeak } from 'common/utils/memoize.mjs';
import * as FocusManager from 'common/utils/focus-manager.mjs';
import * as ExternalDataUtils from 'common/objects/utils/external-data-utils.mjs';
import * as IssueUtils from 'common/objects/utils/issue-utils.mjs';
import * as ReactionSaver from 'common/objects/savers/reaction-saver.mjs';
import * as StoryUtils from 'common/objects/utils/story-utils.mjs';
import * as RandomToken from 'common/utils/random-token.mjs';

// widgets
import { ProfileImage } from '../widgets/profile-image.jsx';
import { AuthorNames } from '../widgets/author-names.jsx';
import { StoryProgress } from '../widgets/story-progress.jsx';
import { StoryEmblem } from '../widgets/story-emblem.jsx';
import { Scrollable } from '../widgets/scrollable.jsx';
import { ReactionToolbar } from '../widgets/reaction-toolbar.jsx';
import { ReactionList } from '../lists/reaction-list.jsx';
import { HeaderButton } from '../widgets/header-button.jsx';
import { StoryContents } from '../views/story-contents.jsx';
import { StoryViewOptions } from '../views/story-view-options.jsx';
import { CornerPopUp } from '../widgets/corner-pop-up.jsx';

import './story-view.scss';

/**
 * Component for rendering a story. It provides the basic frame, leaving the
 * task of rendering the actual story contents to StoryContents.
 */
function StoryView(props) {
    const { story, authors, reactions, respondents, recommendations, recipients, bookmark, repos, currentUser } = props;
    const { access, highlighting, pending } = props;
    const { highlightReactionID, scrollToReactionID } = props;
    const { database, route, env, payloads } = props;
    const { onBump, onEdit } = props;
    const { t } = env.locale;
    const [ showingComments, showComments ] = useState(false);
    const [ isTall, setIsTall ] = useState(false);
    const [ openMenu, setOpenMenu ] = useState('');
    const [ error, run ] = useErrorCatcher(true);
    const reactionContainerRef = useRef();

    const handleExpansionClick = useListener((evt) => {
        showComments(true);
    });
    const handleOptionsComplete = useListener((evt) => {
        setOpenMenu('');
    });
    const handleMenuOpen = useListener((evt) => {
        setOpenMenu(evt.name);
    });
    const handleMenuClose = useListener((evt) => {
        setOpenMenu('');
    });
    const handleAction = useListener((evt) => {
        run(async () => {
            switch (evt.action) {
                case 'like-add':
                    await ReactionSaver.addLike(database, story, currentUser);
                    break;
               case 'like-remove':
                    await ReactionSaver.removeReaction(database, evt.like);
                    break;
               case 'reaction-add':
                    showComments(true);
                    const existing = _.some(reactions, {
                        user_id: currentUser.id,
                        published: false,
                    });
                    if (!existing) {
                        await ReactionSaver.startComment(database, story, currentUser);
                    }
                    FocusManager.focus({
                        type: 'ReactionEditor',
                        story_id: story.id,
                        user_id: currentUser.id,
                    });
                    break;
               case 'reaction-expand':
                    showComments(true);
                    break;
            }
        });
    });

    useEffect(() => {
        // Check the height of the cell containing the reaction scroll box. If it's
        // taller than the scroll box's max height, use absolute positioning
        // instead so there's no gap at the bottom.
        if (env.isWiderThan('double-col')) {
            const reactionContainer = reactionContainerRef.current;
            if (reactionContainer) {
                const cell = reactionContainer.parentNode;
                if (!reactionContainerMaxHeight) {
                    // calculate this once
                    const style = getComputedStyle(reactionContainer);
                    reactionContainerMaxHeight = parseInt(style.maxHeight);
                }
                const isTallAfter = (cell.offsetHeight > reactionContainerMaxHeight);
                if (isTall !== isTallAfter) {
                    setIsTall(isTallAfter);
                }
            }
        }
    }, []);

    const classNames = [ 'story-view' ];
    if (highlighting) {
        classNames.push('highlighting');
    }
    if (env.isWiderThan('triple-col')) {
        return renderTripleColumn();
    } else if (env.isWiderThan('double-col')) {
        return renderDoubleColumn();
    } else {
        return renderSingleColumn();
    }

    function renderSingleColumn() {
        let reactionToolbar = renderReactionToolbar();
        let reactionLink = renderReactionLink();
        let needPadding = false;
        if (reactionToolbar || reactionLink) {
            needPadding = true;
            if (!reactionToolbar) {
                reactionToolbar = '\u00a0';
            }
        }
        return (
            <div className={classNames.join(' ')}>
                <div className="header">
                    <div className="column-1 padded">
                        {renderProfileImage()}
                        {renderAuthorNames()}
                        {renderPopUpMenu('main')}
                    </div>
                </div>
                <div className="body">
                    <div className="column-1 padded">
                        {renderProgress()}
                        {renderEmblem()}
                        {renderContents()}
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
                        {renderReactions()}
                    </div>
                </div>
            </div>
        );
    }

    function renderDoubleColumn() {
        return (
            <div className={classNames.join(' ')}>
                <div className="header">
                    <div className="column-1 padded">
                        {renderProfileImage()}
                        {renderAuthorNames()}
                        {renderPopUpMenu('main')}
                    </div>
                    <div className="column-2 padded">
                        {renderReactionToolbar()}
                    </div>
                </div>
                <div className="body">
                    <div className="column-1 padded">
                        {renderProgress()}
                        {renderEmblem()}
                        {renderContents()}
                    </div>
                    <div className="column-2">
                        {renderReactions()}
                    </div>
                </div>
            </div>
        );
    }

    function renderTripleColumn() {
        return (
            <div className={classNames.join(' ')}>
                <div className="header">
                    <div className="column-1 padded">
                        {renderProfileImage()}
                        {renderAuthorNames()}
                    </div>
                    <div className="column-2 padded">
                        {renderReactionToolbar()}
                    </div>
                    <div className="column-3 padded">
                        <HeaderButton icon="chevron-circle-right" label={t('story-options')} disabled />
                    </div>
                </div>
                <div className="body">
                    <div className="column-1 padded">
                        {renderProgress()}
                        {renderEmblem()}
                        {renderContents()}
                    </div>
                    <div className="column-2">
                        {renderReactions()}
                    </div>
                    <div className="column-3 padded">
                        {renderOptions()}
                    </div>
                </div>
            </div>
        );
    }

    function renderProfileImage() {
        const leadAuthor = _.get(authors, 0);
        let url;
        if (leadAuthor) {
            url = route.find('person-page', { selectedUserID: leadAuthor.id });
        }
        const props = {
            user: leadAuthor,
            size: 'medium',
            href: url,
            env,
        };
        return <ProfileImage {...props} />;
    }

    function renderAuthorNames() {
        const props = { authors, env };
        return <AuthorNames {...props} />;
    }

    /**
     * Render link and comment buttons on title bar
     *
     * @return {ReactElement|null}
     */
    function renderReactionToolbar() {
        if (access !== 'read-comment' && access !== 'read-write') {
            return null;
        }
        const props = {
            access,
            currentUser,
            reactions,
            respondents,
            env,
            disabled: !StoryUtils.isSaved(story),
            onAction: handleAction,
        };
        return <ReactionToolbar {...props} />;
    }

    function renderReactionLink() {
        const count = _.size(reactions);
        if (count === 0) {
            return null;
        }
        if (showingComments) {
            return '\u00a0';
        }
        return (
            <span className="reaction-link" onClick={this.handleExpansionClick}>
                {t('story-$count-reactions', count)}
            </span>
        );
    }

    function renderProgress() {
        let uploadStatus;
        if (story.ready === false) {
            uploadStatus = payloads.inquire(story);
        }
        const props = {
            status: uploadStatus,
            story,
            pending,
            env,
        };
        return <StoryProgress {...props} />;
    }

    function renderEmblem() {
        const props = { story };
        return <StoryEmblem {...props} />
    }

    function renderContents() {
        const props = {
            access,
            story,
            authors,
            currentUser,
            reactions,
            repo: findRepo(repos, story),
            database,
            env,
        };
        return <StoryContents {...props} />;
    }

    function renderReactions() {
        if (_.isEmpty(reactions)) {
            return null;
        }
        if (!env.isWiderThan('double-col')) {
            if (!showingComments) {
                return null;
            }
        }
        const listProps = {
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
        let classNames = [ 'scrollable' ];
        if (isTall && env.isWiderThan('double-col')) {
            classNames.push('abs');
        }
        return (
            <div ref={reactionContainerRef} className={classNames.join(' ')}>
                <ReactionList {...listProps} />
            </div>
        );
    }

    function renderPopUpMenu(section) {
        const props = {
            name: section,
            open: (openMenu === section),
            onOpen: handleMenuOpen,
            onClose: handleMenuClose,
        };
        return (
            <CornerPopUp {...props}>
                {renderOptions(section)}
            </CornerPopUp>
        );
    }

    function renderOptions(section) {
        const props = {
            section,
            access,
            story,
            reactions,
            repos,
            bookmark,
            recommendations,
            currentUser,
            database,
            route,
            env,
            onComplete: handleOptionsComplete,
        };
        return <StoryViewOptions {...props} />;
    }

    async function addLike() {
        const like = {
            type: 'like',
            story_id: story.id,
            user_id: currentUser.id,
            details: {},
            published: true,
            public: true,
        };
        await saveReaction(like);
    }

    async function addComment() {
        const existing = _.some(reactions, {
            user_id: currentUser.id,
            published: false,
        });
        if (!existing) {
            const comment = {
                type: 'comment',
                story_id: story.id,
                user_id: currentUser.id,
                details: {},
                published: false,
                public: true,
            };
            await saveReaction(comment);
        }
        FocusManager.focus({
            type: 'ReactionEditor',
            story_id: story.id,
            user_id: currentUser.id,
        });
    }
}

let reactionContainerMaxHeight;

const defaultOptions = {
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
        const link = ExternalDataUtils.findLinkByRelative(story, repo, 'project');
        return !!link;
    });
});

const countRespondents = memoizeWeak(null, function(reactions) {
    const userIds = _.map(reactions, 'user_id');
    return _.size(_.uniq(userIds));
});

export {
    StoryView as default,
    StoryView,
};
