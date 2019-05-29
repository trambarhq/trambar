import _ from 'lodash';
import React, { useState } from 'react';
import { useListener } from 'relaks';
import * as Markdown from 'common/utils/markdown.mjs';
import * as PlainText from 'common/utils/plain-text.mjs';
import { memoizeWeak } from 'common/utils/memoize.mjs';
import ComponentRefs from 'common/utils/component-refs.mjs';
import * as ExternalDataUtils from 'common/objects/utils/external-data-utils.mjs';
import * as UserUtils from 'common/objects/utils/user-utils.mjs';
import * as RepoUtils from 'common/objects/utils/repo-utils.mjs';
import * as ResourceUtils from 'common/objects/utils/resource-utils.mjs';

// widgets
import { ProfileImage } from '../widgets/profile-image.jsx';
import { MediaView } from '../views/media-view.jsx';
import { MediaDialogBox } from '../dialogs/media-dialog-box';
import { ReactionProgress } from '../widgets/reaction-progress.jsx';
import { Time } from '../widgets/time.jsx';
import { ReactionViewOptions } from '../views/reaction-view-options.jsx';

import './reaction-view.scss';

/**
 * Component for displaying a reaction to a story.
 */
function ReactionView(props) {
    const { reaction, respondent, story, currentUser } = props;
    const { env, route, repo, highlighting, access } = props;
    const { t, p, g } = env.locale;
    const resources = _.get(reaction, 'details.resources');
    const unreferencedResources = _.slice(resources);
    const resourcesReferenced = [];
    const [ referencedMedia, setReferencedMedia ] = useState('');
    const [ options, setOptions ] = useState({});
    const [ audioURL, setAudioURL ] = useState('');

    const handleReference = useListener((evt) => {
        const res = Markdown.findReferencedResource(resources, evt.name);
        if (res) {
            resourcesReferenced.push(res);
            _.pull(unreferencedResources, res);
            const url = ResourceUtils.getMarkdownIconURL(res, evt.forImage, env);
            return { href: url, title: evt.name };
        }
    });
    const handleMarkdownClick = useListener((evt) => {
        evt.preventDefault();

        let target = evt.target;
        if (target.viewportElement) {
            target = target.viewportElement;
        }
        let name;
        if (target.tagName === 'svg') {
            let title = target.getElementsByTagName('title')[0];
            if (title) {
                name = title.textContent;
            }
        } else {
            name = evt.target.title;
        }
        if (name) {
            let res = Markdown.findReferencedResource(resources, name);
            if (res) {
                if (res.type === 'image' || res.type === 'video') {
                    setReferencedMedia(name);
                } else if (res.type === 'website') {
                    window.open(res.url, '_blank');
                } else if (res.type === 'audio') {
                    const version = chooseAudioVersion(res);
                    const selected = ResourceUtils.getAudioURL(res, { version }, env);
                    setAudioURL((selected === audioURL) ? null : selected);
                }
            }
        } else {
            openPopUpWindow(target);
        }
    });
    const handleReferencedMediaDialogClose = useListener((evt) => {
        setReferencedMedia('');
    });
    const handleOptionsChange = useListener((evt) => {
        const newOptions = evt.options;
        setOptions(newOptions)
        if (newOptions.editReaction && !options.editReaction) {
            publishReaction();
        }
        if (newOptions.removeReaction && !options.removeReaction) {
            removeReaction();
        }
        if (newOptions.hideReaction !== options.hideReaction) {
            hideReaction(newOptions.hideReaction);
        }
    });
    const handleAudioEnded = useListener((evt) => {
        setAudioURL('');
    });

    const classNames = [ 'reaction-view' ];
    if (highlighting) {
        classNames.push('highlighting');
    }
    return (
        <div className={classNames.join(' ')}>
            <div className="profile-image-column">
                {renderProfileImage()}
            </div>
            <div className="contents-column">
                <div className="text">
                    {renderOptionButton()}
                    {renderProgress()}
                    {renderText()}
                    {renderReferencedMediaDialog()}
                </div>
                {renderAudioPlayer()}
                {renderMedia()}
            </div>
        </div>
    );

    function renderProfileImage() {
        let url;
        if (respondent) {
            url = route.find('person-page', { selectedUserID: respondent.id });
        }
        const props = {
            user: respondent,
            size: 'small',
            href: url,
            env,
        };
        return <ProfileImage {...props} />;
    }

    function renderText() {
        const { text, markdown } = reaction.details;
        const name = UserUtils.getDisplayName(respondent, env);
        const gender = UserUtils.getGender(respondent);
        g(name, gender);
        if (reaction.published && reaction.ready !== false) {
            let url, target;
            switch (reaction.type) {
                case 'like':
                    return (
                        <span className="like">
                            {t('reaction-$name-likes-this', name)}
                        </span>
                    );
                case 'comment':
                    let langText = p(text);
                    if (markdown) {
                        // parse the Markdown text
                        let paragraphs = Markdown.render(langText, handleReference);
                        // if there first paragraph is a P tag, turn it into a SPAN
                        if (paragraphs[0] && paragraphs[0].type === 'p') {
                            paragraphs[0] = <span key={0}>{paragraphs[0].props.children}</span>;
                        }
                        return (
                            <span className="comment markdown" onClick={handleMarkdownClick}>
                                {name}: {paragraphs}
                            </span>
                        );
                    } else {
                        return (
                            <span className="comment">
                                {name}: {PlainText.renderEmoji(langText)}
                            </span>
                        );
                    }
                case 'vote':
                    return (
                        <span className="vote">
                            {t('reaction-$name-cast-a-vote', name)}
                        </span>
                    );
                case 'task-completion':
                    return (
                        <span className="task-completion">
                            {t('reaction-$name-completed-a-task', name)}
                        </span>
                    );
                case 'note':
                    if (UserUtils.canAccessRepo(currentUser, repo)) {
                        switch (story.type) {
                            case 'push':
                            case 'merge':
                                url = RepoUtils.getCommitNoteURL(repo, reaction);
                                break;
                            case 'issue':
                                url = RepoUtils.getIssueNoteURL(repo, reaction);
                                break;
                            case 'merge-request':
                                url = RepoUtils.getMergeRequestNoteURL(repo, reaction);
                                break;
                        }
                        target = repo.type;
                    }
                    return (
                        <a className="note" href={url} target={target}>
                            {t(`reaction-$name-commented-on-${story.type}`, name)}
                        </a>
                    );
                case 'assignment':
                    if (story.type === 'issue' || story.type === 'post') {
                        if (UserUtils.canAccessRepo(currentUser, repo)) {
                            url = RepoUtils.getIssueNoteURL(repo, reaction);
                            target = repo.type;
                        }
                        return (
                            <a className="issue-assignment" href={url} target={target}>
                                {t('reaction-$name-is-assigned-to-issue', name)}
                            </a>
                        );
                    } else if (story.type === 'merge-request') {
                        if (UserUtils.canAccessRepo(currentUser, repo)) {
                            url = RepoUtils.getMergeRequestNoteURL(repo, reaction);
                            target = repo.type;
                        }
                        return (
                            <a className="issue-assignment" href={url} target={target}>
                                {t('reaction-$name-is-assigned-to-merge-request', name)}
                            </a>
                        );
                    }
                case 'tracking':
                    if (UserUtils.canAccessRepo(currentUser, repo)) {
                        url = RepoUtils.getIssueNoteURL(repo, reaction);
                        target = repo.type;
                    }
                    return (
                        <a className="issue-tracking" href={url} target={target}>
                            {t('reaction-$name-added-story-to-issue-tracker', name)}
                        </a>
                    );
            }
        } else {
            let phrase;
            if (!reaction.published) {
                if (reaction.ptime) {
                    // if it has a ptime, then it was published before
                    phrase = 'reaction-$name-is-editing';
                } else {
                    phrase = 'reaction-$name-is-writing';
                }
            } else {
                phrase = 'reaction-$name-is-sending';
            }
            return <span className="in-progress">{t(phrase, name)}</span>;
        }
    }

    function renderOptionButton() {
        if (!reaction.published) {
            return null;
        }
        const props = {
            access,
            currentUser,
            reaction,
            story,
            env,
            options,
            onChange: handleOptionsChange,
        };
        return <ReactionViewOptions {...props} />;
    }

    function renderProgress() {
        if (!reaction.published) {
            return null;
        }
        const props = { reaction, env };
        return <ReactionProgress {...props} />;
    }

    function renderAudioPlayer() {
        if (!audioURL) {
            return null;
        }
        const audioProps = {
            src: audioURL,
            autoPlay: true,
            controls: true,
            onEnded: handleAudioEnded,
        };
        return <audio ref={audioPlayerRef} {...audioProps} />;
    }

    function renderMedia() {
        if (_.isEmpty(unreferencedResources)) {
            return null;
        }
        const props = {
            resources: unreferencedResources,
            width: env.isWiderThan('double-col') ? 300 : 220,
            env,
        };
        return <div className="media"><MediaView {...props} /></div>;
    }

    function renderReferencedMediaDialog() {
        const res = Markdown.findReferencedResource(resources, referencedMedia);
        if (!res) {
            return null;
        }
        const zoomableResources = getZoomableResources(resourcesReferenced);
        const zoomableIndex = _.indexOf(zoomableResources, res);
        if (zoomableIndex === -1) {
            return null;
        }
        const dialogProps = {
            show: !!referencedMedia,
            resources: zoomableResources,
            selectedIndex: zoomableIndex,
            env,
            onClose: handleReferencedMediaDialogClose,
        };
        return <MediaDialogBox {...dialogProps} />;
    }

    async function publishReaction() {
        const changes = {
            id: reaction.id,
            publish: true
        };
        const db = database.use();
        await db.saveOne({ table: 'reaction' }, changes);
    }

    async function removeReaction() {
        const db = database.use();
        return db.removeOne({ table: 'reaction' }, reaction);
    }

    async function hideReaction(hidden) {
        const changes = {
            id: reaction.id,
            public: !hidden,
        };
        const db = database.use();
        await db.saveOne({ table: 'reaction' }, changes);
    }
}

const defaultOptions = {
    hideReaction: false,
    editReaction: false,
    removeReaction: false,
};

const getZoomableResources = memoizeWeak(null, function(resources) {
    return _.filter(resources, (res) => {
        switch (res.type) {
            case 'image':
            case 'video':
                return true;
        }
    })
});

function chooseAudioVersion(res) {
    return _.first(_.keys(res.versions)) || null;
}

function openPopUpWindow(target) {
    let url, options;
    if (target.tagName === 'A') {
        url = target.href;
    } else if (target.tagName === 'IMG') {
        let src = target.getAttribute('src');
        let targetRect = target.getBoundingClientRect();
        let width = target.naturalWidth + 50;
        let height = target.naturalHeight + 50;
        let left = targetRect.left + window.screenLeft;
        let top = targetRect.top + window.screenTop;
        options = `width=${width},height=${height},left=${left},top=${top}status=no,menubar=no`;
        url = target.src;
    }
    window.open(url, '_blank', options);
}

export {
    ReactionView as default,
    ReactionView,
};
