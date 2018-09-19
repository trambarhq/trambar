import _ from 'lodash';
import React, { PureComponent } from 'react';
import * as Markdown from 'utils/markdown';
import * as PlainText from 'utils/plain-text';
import Memoize from 'utils/memoize';
import ComponentRefs from 'utils/component-refs';
import * as ExternalDataUtils from 'objects/utils/external-data-utils';
import * as UserUtils from 'objects/utils/user-utils';
import * as RepoUtils from 'objects/utils/repo-utils';

// widgets
import ProfileImage from 'widgets/profile-image';
import MediaView from 'views/media-view';
import MediaDialogBox from 'dialogs/media-dialog-box';
import ReactionProgress from 'widgets/reaction-progress';
import Time from 'widgets/time';
import ReactionViewOptions from 'views/reaction-view-options';

import './reaction-view.scss';

class ReactionView extends PureComponent {
    static displayName = 'ReactionView';

    constructor(props) {
        super(props);
        this.components = ComponentRefs({
            audioPlayer: HTMLAudioElement,
        });
        this.state = {
            options: defaultOptions,
            selectedResourceURL: null,
            showingReferencedMediaDialog: false,
            renderingReferencedMediaDialog: false,
        };
        this.updateOptions(this.state, this.props);
    }

    /**
     * Return class name, possibly with modifiers
     *
     * @return {String}
     */
    getClassName() {
        let { highlighting } = this.props;
        let className = 'reaction-view';
        if (highlighting) {
            className += ' highlighting';
        }
        return className;
    }

    /**
     * Update options when new data arrives from server
     *
     * @param  {Object} nextProps
     */
    componentWillReceiveProps(nextProps) {
        let { reaction } = this.props;
        let nextState = _.clone(this.state);
        if (nextProps.reaction !== reaction) {
            this.updateOptions(nextState, nextProps);
        }
        let changes = _.shallowDiff(nextState, this.state);
        if (!_.isEmpty(changes)) {
            this.setState(changes);
        }
    }

    /**
     * Update state.options based on props
     *
     * @param  {Object} nextState
     * @param  {Object} nextProps
     */
    updateOptions(nextState, nextProps) {
        let options = nextState.options = _.clone(nextState.options);
        options.hideReaction = !nextProps.reaction.public;
    }

    /**
     * Render component
     *
     * @return {ReactElement}
     */
    render() {
        return (
            <div className={this.getClassName()}>
                <div className="profile-image-column">
                    {this.renderProfileImage()}
                </div>
                <div className="contents-column">
                    <div className="text">
                        {this.renderOptionButton()}
                        {this.renderProgress()}
                        {this.renderText()}
                        {this.renderReferencedMediaDialog()}
                    </div>
                    {this.renderAudioPlayer()}
                    {this.renderMedia()}
                </div>
            </div>
        );
    }

    /**
     * Render profile image
     *
     * @return {ReactElement}
     */
    renderProfileImage() {
        let { env, route, respondent } = this.props;
        let props = {
            user: respondent,
            size: 'small',
            env,
        };
        if (respondent) {
            props.url = route.find('person-page', {
                userID: respondent.id,
            });
        }
        return <ProfileImage {...props} />;
    }

    /**
     * Render user name and text
     *
     * @return {ReactElement}
     */
    renderText() {
        let { env, reaction, respondent, story, currentUser, repo } = this.props;
        let { t, p, g } = env.locale;
        let { text, markdown } = reaction.details;
        let name = UserUtils.getDisplayName(respondent, env);
        let gender = UserUtils.getGender(respondent);
        g(name, gender);
        this.resourcesReferenced = {};
        if (reaction.published && reaction.ready !== false) {
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
                        let paragraphs = Markdown.render(langText, this.handleReference);
                        // if there first paragraph is a P tag, turn it into a SPAN
                        if (paragraphs[0] && paragraphs[0].type === 'p') {
                            paragraphs[0] = <span key={0}>{paragraphs[0].props.children}</span>;
                        }
                        return (
                            <span className="comment markdown" onClick={this.handleMarkdownClick}>
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
                    let url, target;
                    if (UserUtils.canAccessRepo(currentUser, repo)) {
                        let hash = getNoteHash(link);
                        switch (story.type) {
                            case 'push':
                            case 'merge':
                                url = RepoUtils.getCommitNoteURL(repo, reaction);
                                break;
                            case 'issue':
                                url = RepoUtils.getIssueNoteURL(repo, reaction);
                                break;
                            case 'merge-request':
                                url = RepUtils.getMergeRequestNoteURL(repo, reaction);
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
                        let url, target;
                        if (UserUtils.canAccessRepo(user, repo)) {
                            url = RepoUtils.getIssueNoteURL(repo, reaction);
                            target = repo.type;
                        }
                        return (
                            <a className="issue-assignment" href={url} target={target}>
                                {t('reaction-$name-is-assigned-to-issue', name)}
                            </a>
                        );
                    } else if (story.type === 'merge-request') {
                        let url, target;
                        if (UserUtils.canAccessRepo(user, repo)) {
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
                    let url, target;
                    if (UserUtils.canAccessRepo(user, repo)) {
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
            return (
                <span className="in-progress">
                    {t(phrase, name)}
                </span>
            );
        }
    }

    /**
     * Render option button
     *
     * @return {ReactElement|null}
     */
    renderOptionButton() {
        let { env, reaction, story, currentUser, access } = this.props;
        let { options } = this.state;
        if (!reaction.published) {
            return null;
        }
        let props = {
            access,
            currentUser,
            reaction,
            story,
            env,
            options,
            onChange: this.handleOptionsChange,
        };
        return <ReactionViewOptions {...props} />;
    }

    /**
     * Render the publication time
     *
     * @return {ReactElement|null}
     */
    renderProgress() {
        let { env, reaction } = this.props;
        if (!reaction.published) {
            return null;
        }
        let props = { reaction, env };
        return <ReactionProgress {...props} />;
    }

    /**
     * Render audio player for embed audio in markdown text
     *
     * @return {ReactElement|null}
     */
    renderAudioPlayer() {
        let { audioURL } = this.state;
        let { setters } = this.components;
        if (!audioURL) {
            return null;
        }
        let audioProps = {
            ref: setters.audioPlayer,
            src: audioURL,
            autoPlay: true,
            controls: true,
            onEnded: this.handleAudioEnded,
        };
        return <audio {...audioProps} />;
    }

    /**
     * Render attached media
     *
     * @return {ReactElement|null}
     */
    renderMedia() {
        let { env, reaction } = this.props;
        let resources = _.get(reaction, 'details.resources');
        if (!_.isEmpty(this.resourcesReferenced)) {
            resources = _.difference(resources, _.values(this.resourcesReferenced));
        }
        if (_.isEmpty(resources)) {
            return null;
        }
        let props = {
            resources,
            width: env.isWiderThan('double-col') ? 220 : 300
            emv.
        };
        return <div className="media"><MediaView {...props} /></div>;
    }

    /**
     * Render dialog box showing referenced image at full size
     *
     * @return {ReactElement|null}
     */
    renderReferencedMediaDialog() {
        let { env } = this.props;
        let {
            showingReferencedMediaDialog,
            renderingReferencedMediaDialog,
            selectedResourceURL,
        } = this.state;
        if (!renderingReferencedMediaDialog) {
            return null;
        }
        let selectedResource = this.resourcesReferenced[selectedResourceURL];
        let zoomableResources = getZoomableResources(this.resourcesReferenced);
        let zoomableIndex = _.indexOf(zoomableResources, selectedResource);
        if (zoomableIndex === -1) {
            return null;
        }
        let dialogProps = {
            show: showingReferencedMediaDialog,
            resources: zoomableResources,
            selectedIndex: zoomableIndex,
            env,
            onClose: this.handleReferencedMediaDialogClose,
        };
        return <MediaDialogBox {...dialogProps} />;
    }

    /**
     * Save reaction to remote database
     *
     * @param  {Reaction} reaction
     *
     * @return {Promise<Reaction>}
     */
    saveReaction(reaction) {
        let { database } = this.props;
        let db = database.use({ by: this });
        return db.start().then(() => {
            return db.saveOne({ table: 'reaction' }, reaction);
        });
    }

    /**
     * Remove reaction from remote database
     *
     * @param  {Reaction} reaction
     *
     * @return {Promise<Reaction>}
     */
    removeReaction(reaction) {
        let { database } = this.props;
        let db = database.use({ by: this });
        return db.removeOne({ table: 'reaction' }, reaction);
    }

    /**
     * Change options concerning a story
     *
     * @param  {Object} options
     */
    setOptions(options) {
        let { reaction } = this.props;
        let { options: before } = this.state;
        this.setState({ options }, () => {
            if (options.editReaction && !before.editReaction) {
                reaction = _.clone(reaction);
                reaction.published = false;
                this.saveReaction(reaction);
            }
            if (options.removeReaction && !before.removeReaction) {
                this.removeReaction(reaction);
            }
            if (options.hideReaction !== before.hideReaction) {
                reaction = _.clone(reaction);
                reaction.public = !options.hideReaction;
                this.saveReaction(reaction);
            }
        });
    }

    /**
     * Called when a resource is referenced by Markdown
     */
    handleReference = (evt) => {
        let { env, reaction } = this.props;
        let resources = _.get(reaction, 'details.resources');
        let res = Markdown.findReferencedResource(resources, evt.name);
        if (res) {
            let url;
            if (evt.forImage)  {
                if (res.type === 'audio') {
                    url = require('!file-loader!speaker.svg') + `#${encodeURI(res.url)}`;
                } else {
                    // images are style at height = 1.5em
                    url = env.getImageURL(res, { height: 24 });
                }
            } else {
                url = env.getURL(res);
            }
            // remember the resource and the url
            this.resourcesReferenced[url] = res;
            return {
                href: url,
                title: undefined
            };
        }
    }

    /**
     * Called when user clicks on the text contents
     *
     * @param  {Event} evt
     */
    handleMarkdownClick = (evt) => {
        let { env } = this.props;
        let target = evt.target;
        if (target.tagName === 'IMG') {
            let src = target.getAttribute('src');
            let res = this.resourcesReferenced[src];
            if (res) {
                if (res.type === 'image' || res.type === 'video') {
                    this.setState({
                        selectedResourceURL: src,
                        renderingReferencedMediaDialog: true,
                        showingReferencedMediaDialog: true,
                    });
                } else if (res.type === 'website') {
                    window.open(res.url);
                } else if (res.type === 'audio') {
                    let version = chooseAudioVersion(res);
                    let audioURL = env.getAudioURL(res, { version });
                    this.setState({ audioURL });
                }
            } else {
                let targetRect = target.getBoundingClientRect();
                let width = target.naturalWidth + 50;
                let height = target.naturalHeight + 50;
                let left = targetRect.left + window.screenLeft;
                let top = targetRect.top + window.screenTop;
                window.open(target.src, '_blank', `width=${width},height=${height},left=${left},top=${top}status=no,menubar=no`);
            }
        }
    }

    /**
     * Called when user closes referenced media dialog
     *
     * @param  {Object} evt
     */
    handleReferencedMediaDialogClose = (evt) => {
        this.setState({ showingReferencedMediaDialog: false }, () => {
            setTimeout(() => {
                let { showingReferencedMediaDialog } = this.state;
                if (!showingReferencedMediaDialog) {
                    this.setState({
                        renderingReferencedMediaDialog: false,
                        selectedResourceURL: null
                    });
                }
            }, 500);
        })
    }

    /**
     * Called when options are changed
     *
     * @param  {Object} evt
     */
    handleOptionsChange = (evt) => {
        this.setOptions(evt.options);
    }

    /**
     * Called when audio playback ends
     *
     * @param  {Event} evt
     */
    handleAudioEnded = (evt) => {
        this.setState({ audioURL: null });
    }
}

let defaultOptions = {
    hideReaction: false,
    editReaction: false,
    removeReaction: false,
};

let getZoomableResources = Memoize(function(resources) {
    return _.filter(resources, (res) => {
        switch (res.type) {
            case 'image':
            case 'video':
                return true;
        }
    })
});

/**
 * Choose a version of the audio
 *
 * @param  {Object} res
 *
 * @return {String}
 */
function chooseAudioVersion(res) {
    return _.first(_.keys(res.versions)) || null;
}

export {
    ReactionView as default,
    ReactionView,
};

import Database from 'data/database';
import Route from 'routing/route';
import Environment from 'env/environment';

if (process.env.NODE_ENV !== 'production') {
    const PropTypes = require('prop-types');

    ReactionView.propTypes = {
        access: PropTypes.oneOf([ 'read-only', 'read-comment', 'read-write' ]).isRequired,
        highlighting: PropTypes.bool,
        reaction: PropTypes.object.isRequired,
        respondent: PropTypes.object,
        story: PropTypes.object.isRequired,
        currentUser: PropTypes.object.isRequired,
        repo: PropTypes.object,

        database: PropTypes.instanceOf(Database).isRequired,
        route: PropTypes.instanceOf(Route).isRequired,
        env: PropTypes.instanceOf(Environment).isRequired,
    };
}
