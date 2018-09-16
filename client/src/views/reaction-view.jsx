import _ from 'lodash';
import React, { PureComponent } from 'react';
import * as Markdown from 'utils/markdown';
import * as PlainText from 'utils/plain-text';
import Memoize from 'utils/memoize';
import ComponentRefs from 'utils/component-refs';
import * as ExternalDataUtils from 'objects/utils/external-data-utils';
import * as UserUtils from 'objects/utils/user-utils';

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
        let className = 'reaction-view';
        if (this.props.highlighting) {
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
        let nextState = _.clone(this.state);
        if (this.props.reaction !== nextProps.reaction) {
            this.updateOptions(nextState, nextProps);
        }
        let changes = _.pickBy(nextState, (value, name) => {
            return this.state[name] !== value;
        });
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
        let props = {
            user: this.props.respondent,
            theme: this.props.theme,
            size: 'small'
        };
        if (this.props.respondent) {
            props.url = this.props.route.find(require('pages/people-page'), {
                schema: this.props.route.parameters.schema,
                user: this.props.respondent.id,
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
        let t = this.props.locale.translate;
        let p = this.props.locale.pick;
        let reaction = this.props.reaction;
        let user = this.props.currentUser;
        let story = this.props.story;
        let repo = this.props.repo;
        let name = UserUtils.getDisplayName(this.props.respondent, this.props.locale);
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
                    let text = _.get(reaction, 'details.text');
                    let markdown = _.get(reaction, 'details.markdown', false);
                    if (markdown) {
                        // parse the Markdown text
                        let paragraphs = Markdown.render(p(text), this.handleReference);
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
                                {name}: {PlainText.renderEmoji(p(text))}
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
                    let user = this.props.currentUser;
                    let repo = this.props.repo;
                    if (UserUtils.canAccessRepo(user, repo)) {
                        switch (story.type) {
                            case 'push':
                            case 'merge':
                                let link = ExternalDataUtils.findLinkByRelations(reaction, 'note', 'commit');
                                if (link) {
                                    let commitId = link.commit.id;
                                    let hash = getNoteHash(link);
                                    url = `${repo.details.web_url}/commit/${commitId}${hash}`;
                                    target = link.type;
                                }
                                break;
                            case 'issue':
                                let link = ExternalDataUtils.findLinkByRelations(reaction, 'note', 'issue');
                                if (link) {
                                    let issueNumber = link.issue.number;
                                    let hash = getNoteHash(link);
                                    url = `${repo.details.web_url}/issues/${issueNumber}${hash}`;
                                    target = link.type;
                                }
                                break;
                            case 'merge-request':
                                let link = ExternalDataUtils.findLinkByRelations(reaction, 'note', 'merge_request');
                                if (link) {
                                    let mergeRequestNumber = link.merge_request.number;
                                    let hash = getNoteHash(link);
                                    url = `${repo.details.web_url}/merge_requests/${mergeRequestNumber}${hash}`;
                                    target = link.type;
                                }
                                break;
                        }

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
                            let link = ExternalDataUtils.findLinkByRelations(reaction, 'issue');
                            if (link) {
                                let issueNumber = _.get(link, 'issue.number');
                                let hash = getNoteHash(link);
                                url = `${repo.details.web_url}/issues/${issueNumber}${hash}`;
                                target = link.type;
                            }
                        }
                        return (
                            <a className="issue-assignment" href={url} target={target}>
                                {t('reaction-$name-is-assigned-to-issue', name)}
                            </a>
                        );
                    } else if (story.type === 'merge-request') {
                        let url, target;
                        if (UserUtils.canAccessRepo(user, repo)) {
                            let link = ExternalDataUtils.findLinkByRelations(reaction, 'merge_request');
                            if (link) {
                                let mergeRequestNumber = link.merge_request.number;
                                let hash = getNoteHash(link);
                                url = `${repo.details.web_url}/merge_requests/${mergeRequestNumber}${hash}`;
                                target = link.type;
                            }
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
                        let link = ExternalDataUtils.findLinkByRelations(reaction, 'issue');
                        if (link) {
                            let issueNumber = link.issue.number;
                            url = `${repo.details.web_url}/issues/${issueNumber}`;
                            target = link.type;
                        }
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
        if (!this.props.reaction.published) {
            return null;
        }
        let props = {
            access: this.props.access,
            currentUser: this.props.currentUser,
            reaction: this.props.reaction,
            story: this.props.story,
            locale: this.props.locale,
            theme: this.props.theme,
            options: this.state.options,
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
        if (!this.props.reaction.published) {
            return null;
        }
        let props = {
            reaction: this.props.reaction,
            locale: this.props.locale,
        };
        return <ReactionProgress {...props} />;
    }

    /**
     * Render audio player for embed audio in markdown text
     *
     * @return {ReactElement|null}
     */
    renderAudioPlayer() {
        if (!this.state.audioURL) {
            return null;
        }
        let audioProps = {
            ref: this.components.setters.audioPlayer,
            src: this.state.audioURL,
            autoPlay: true,
            controls: true,
            onEnded: this.handleAudioEnded,
        };
        return <audio {...audioProps} />;
    }

    /**
     * Render attached media
     *
     * @return {ReactElement}
     */
    renderMedia() {
        let resources = _.get(this.props.reaction, 'details.resources');
        if (!_.isEmpty(this.resourcesReferenced)) {
            resources = _.difference(resources, _.values(this.resourcesReferenced));
        }
        if (_.isEmpty(resources)) {
            return null;
        }
        let props = {
            locale: this.props.locale,
            theme: this.props.theme,
            resources,
            width: (this.props.theme.mode === 'signle-col') ? 220 : 300
        };
        return <div className="media"><MediaView {...props} /></div>;
    }

    /**
     * Render dialog box showing referenced image at full size
     *
     * @return {ReactElement|null}
     */
    renderReferencedMediaDialog() {
        if (!this.state.renderingReferencedMediaDialog) {
            return null;
        }
        let selectedResource = this.resourcesReferenced[this.state.selectedResourceURL];
        let zoomableResources = getZoomableResources(this.resourcesReferenced);
        let zoomableIndex = _.indexOf(zoomableResources, selectedResource);
        if (zoomableIndex === -1) {
            return null;
        }
        let dialogProps = {
            show: this.state.showingReferencedMediaDialog,
            resources: zoomableResources,
            selectedIndex: zoomableIndex,

            locale: this.props.locale,
            theme: this.props.theme,

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
        let params = this.props.route.parameters;
        let db = this.props.database.use({ schema: params.schema, by: this });
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
        let params = this.props.route.parameters;
        let db = this.props.database.use({ schema: params.schema, by: this });
        return db.removeOne({ table: 'reaction' }, reaction);
    }

    /**
     * Change options concerning a story
     *
     * @param  {Object} options
     */
    setOptions(options) {
        let before = this.state.options;
        this.setState({ options }, () => {
            if (options.editReaction && !before.editReaction) {
                let reaction = _.clone(this.props.reaction);
                reaction.published = false;
                this.saveReaction(reaction);
            }
            if (options.removeReaction && !before.removeReaction) {
                this.removeReaction(this.props.reaction);
            }
            if (options.hideReaction !== before.hideReaction) {
                let reaction = _.clone(this.props.reaction);
                reaction.public = !options.hideReaction;
                this.saveReaction(reaction);
            }
        });
    }

    /**
     * Called when a resource is referenced by Markdown
     */
    handleReference = (evt) => {
        let resources = this.props.reaction.details.resources;
        let res = Markdown.findReferencedResource(resources, evt.name);
        if (res) {
            let theme = this.props.theme;
            let url;
            if (evt.forImage)  {
                if (res.type === 'audio') {
                    url = require('!file-loader!speaker.svg') + `#${encodeURI(res.url)}`;
                } else {
                    // images are style at height = 1.5em
                    url = theme.getImageURL(res, { height: 24 });
                }
            } else {
                url = theme.getURL(res);
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
                    let audioURL = this.props.theme.getAudioURL(res, { version });
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
                if (!this.state.showingReferencedMediaDialog) {
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

function getNoteHash(link) {
    let noteId = _.get(link, 'note.id');
    return (noteId) ? `#note_${noteId}` : '';
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
