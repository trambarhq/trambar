var _ = require('lodash');
var React = require('react'), PropTypes = React.PropTypes;
var Markdown = require('utils/markdown');
var PlainText = require('utils/plain-text');
var Memoize = require('utils/memoize');
var ComponentRefs = require('utils/component-refs');
var ExternalDataUtils = require('objects/utils/external-data-utils');
var UserUtils = require('objects/utils/user-utils');

var Database = require('data/database');
var Route = require('routing/route');
var Locale = require('locale/locale');
var Theme = require('theme/theme');

// mixins
var UpdateCheck = require('mixins/update-check');

// widgets
var ProfileImage = require('widgets/profile-image');
var MediaView = require('views/media-view');
var MediaDialogBox = require('dialogs/media-dialog-box');
var ReactionProgress = require('widgets/reaction-progress');
var Time = require('widgets/time');
var ReactionViewOptions = require('views/reaction-view-options');

require('./reaction-view.scss');

module.exports = React.createClass({
    displayName: 'ReactionView',
    mixins: [ UpdateCheck ],
    propTypes: {
        access: PropTypes.oneOf([ 'read-only', 'read-comment', 'read-write' ]).isRequired,
        highlighting: PropTypes.bool,
        reaction: PropTypes.object.isRequired,
        respondent: PropTypes.object,
        story: PropTypes.object.isRequired,
        currentUser: PropTypes.object.isRequired,
        repo: PropTypes.object,

        database: PropTypes.instanceOf(Database).isRequired,
        route: PropTypes.instanceOf(Route).isRequired,
        locale: PropTypes.instanceOf(Locale).isRequired,
        theme: PropTypes.instanceOf(Theme).isRequired,
    },

    /**
     * Return initial state of component
     *
     * @return {Object}
     */
    getInitialState: function() {
        this.components = ComponentRefs({
            audioPlayer: HTMLAudioElement,
        });
        var nextState = {
            options: defaultOptions,
            selectedResourceURL: null,
            showingReferencedMediaDialog: false,
            renderingReferencedMediaDialog: false,
        };
        this.updateOptions(nextState, this.props);
        return nextState;
    },

    /**
     * Return class name, possibly with modifiers
     *
     * @return {String}
     */
    getClassName: function() {
        var className = 'reaction-view';
        if (this.props.highlighting) {
            className += ' highlighting';
        }
        return className;
    },

    /**
     * Update options when new data arrives from server
     *
     * @param  {Object} nextProps
     */
    componentWillReceiveProps: function(nextProps) {
        var nextState = _.clone(this.state);
        if (this.props.reaction !== nextProps.reaction) {
            this.updateOptions(nextState, nextProps);
        }
        var changes = _.pickBy(nextState, (value, name) => {
            return this.state[name] !== value;
        });
        if (!_.isEmpty(changes)) {
            this.setState(changes);
        }
    },

    /**
     * Update state.options based on props
     *
     * @param  {Object} nextState
     * @param  {Object} nextProps
     */
    updateOptions: function(nextState, nextProps) {
        var options = nextState.options = _.clone(nextState.options);
        options.hideReaction = !nextProps.reaction.public;
    },

    /**
     * Render component
     *
     * @return {ReactElement}
     */
    render: function() {
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
    },

    /**
     * Render profile image
     *
     * @return {ReactElement}
     */
    renderProfileImage: function() {
        var props = {
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
    },

    /**
     * Render user name and text
     *
     * @return {ReactElement}
     */
    renderText: function() {
        var t = this.props.locale.translate;
        var p = this.props.locale.pick;
        var reaction = this.props.reaction;
        var user = this.props.currentUser;
        var story = this.props.story;
        var repo = this.props.repo;
        var name = UserUtils.getDisplayName(this.props.respondent, this.props.locale);
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
                    var text = _.get(reaction, 'details.text');
                    var markdown = _.get(reaction, 'details.markdown', false);
                    if (markdown) {
                        // parse the Markdown text
                        var paragraphs = Markdown.render(p(text), this.handleReference);
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
                    var url, target;
                    var user = this.props.currentUser;
                    var repo = this.props.repo;
                    if (UserUtils.canAccessRepo(user, repo)) {
                        switch (story.type) {
                            case 'push':
                            case 'merge':
                                var link = ExternalDataUtils.findLinkByRelations(reaction, 'note', 'commit');
                                if (link) {
                                    var commitId = link.commit.id;
                                    var hash = getNoteHash(link);
                                    url = `${repo.details.web_url}/commit/${commitId}${hash}`;
                                    target = link.type;
                                }
                                break;
                            case 'issue':
                                var link = ExternalDataUtils.findLinkByRelations(reaction, 'note', 'issue');
                                if (link) {
                                    var issueNumber = link.issue.number;
                                    var hash = getNoteHash(link);
                                    url = `${repo.details.web_url}/issues/${issueNumber}${hash}`;
                                    target = link.type;
                                }
                                break;
                            case 'merge-request':
                                var link = ExternalDataUtils.findLinkByRelations(reaction, 'note', 'merge_request');
                                if (link) {
                                    var mergeRequestNumber = link.merge_request.number;
                                    var hash = getNoteHash(link);
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
                        var url, target;
                        if (UserUtils.canAccessRepo(user, repo)) {
                            var link = ExternalDataUtils.findLinkByRelations(reaction, 'issue');
                            if (link) {
                                var issueNumber = _.get(link, 'issue.number');
                                var hash = getNoteHash(link);
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
                        var url, target;
                        if (UserUtils.canAccessRepo(user, repo)) {
                            var link = ExternalDataUtils.findLinkByRelations(reaction, 'merge_request');
                            if (link) {
                                var mergeRequestNumber = link.merge_request.number;
                                var hash = getNoteHash(link);
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
                    var url, target;
                    if (UserUtils.canAccessRepo(user, repo)) {
                        var link = ExternalDataUtils.findLinkByRelations(reaction, 'issue');
                        if (link) {
                            var issueNumber = link.issue.number;
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
            var phrase;
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
    },

    /**
     * Render option button
     *
     * @return {ReactElement|null}
     */
    renderOptionButton: function() {
        if (!this.props.reaction.published) {
            return null;
        }
        var props = {
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
    },

    /**
     * Render the publication time
     *
     * @return {ReactElement|null}
     */
    renderProgress: function() {
        if (!this.props.reaction.published) {
            return null;
        }
        var props = {
            reaction: this.props.reaction,
            locale: this.props.locale,
        };
        return <ReactionProgress {...props} />;
    },

    /**
     * Render audio player for embed audio in markdown text
     *
     * @return {ReactElement|null}
     */
    renderAudioPlayer: function() {
        if (!this.state.audioURL) {
            return null;
        }
        var audioProps = {
            ref: this.components.setters.audioPlayer,
            src: this.state.audioURL,
            autoPlay: true,
            controls: true,
            onEnded: this.handleAudioEnded,
        };
        return <audio {...audioProps} />;
    },

    /**
     * Render attached media
     *
     * @return {ReactElement}
     */
    renderMedia: function() {
        var resources = _.get(this.props.reaction, 'details.resources');
        if (!_.isEmpty(this.resourcesReferenced)) {
            resources = _.difference(resources, _.values(this.resourcesReferenced));
        }
        if (_.isEmpty(resources)) {
            return null;
        }
        var props = {
            locale: this.props.locale,
            theme: this.props.theme,
            resources,
            width: (this.props.theme.mode === 'signle-col') ? 220 : 300
        };
        return <div className="media"><MediaView {...props} /></div>;
    },

    /**
     * Render dialog box showing referenced image at full size
     *
     * @return {ReactElement|null}
     */
    renderReferencedMediaDialog: function() {
        if (!this.state.renderingReferencedMediaDialog) {
            return null;
        }
        var selectedResource = this.resourcesReferenced[this.state.selectedResourceURL];
        var zoomableResources = getZoomableResources(this.resourcesReferenced);
        var zoomableIndex = _.indexOf(zoomableResources, selectedResource);
        if (zoomableIndex === -1) {
            return null;
        }
        var dialogProps = {
            show: this.state.showingReferencedMediaDialog,
            resources: zoomableResources,
            selectedIndex: zoomableIndex,

            locale: this.props.locale,
            theme: this.props.theme,

            onClose: this.handleReferencedMediaDialogClose,
        };
        return <MediaDialogBox {...dialogProps} />;
    },

    /**
     * Save reaction to remote database
     *
     * @param  {Reaction} reaction
     *
     * @return {Promise<Reaction>}
     */
    saveReaction: function(reaction) {
        var params = this.props.route.parameters;
        var db = this.props.database.use({ schema: params.schema, by: this });
        return db.start().then(() => {
            return db.saveOne({ table: 'reaction' }, reaction);
        });
    },

    /**
     * Remove reaction from remote database
     *
     * @param  {Reaction} reaction
     *
     * @return {Promise<Reaction>}
     */
    removeReaction: function(reaction) {
        var params = this.props.route.parameters;
        var db = this.props.database.use({ schema: params.schema, by: this });
        return db.removeOne({ table: 'reaction' }, reaction);
    },

    /**
     * Change options concerning a story
     *
     * @param  {Object} options
     */
    setOptions: function(options) {
        var before = this.state.options;
        this.setState({ options }, () => {
            if (options.editReaction && !before.editReaction) {
                var reaction = _.clone(this.props.reaction);
                reaction.published = false;
                this.saveReaction(reaction);
            }
            if (options.removeReaction && !before.removeReaction) {
                this.removeReaction(this.props.reaction);
            }
            if (options.hideReaction !== before.hideReaction) {
                var reaction = _.clone(this.props.reaction);
                reaction.public = !options.hideReaction;
                this.saveReaction(reaction);
            }
        });
    },

    /**
     * Called when a resource is referenced by Markdown
     */
    handleReference: function(evt) {
        var resources = this.props.reaction.details.resources;
        var res = Markdown.findReferencedResource(resources, evt.name);
        if (res) {
            var theme = this.props.theme;
            var url;
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
    },

    /**
     * Called when user clicks on the text contents
     *
     * @param  {Event} evt
     */
     handleMarkdownClick: function(evt) {
        var target = evt.target;
        if (target.tagName === 'IMG') {
            var src = target.getAttribute('src');
            var res = this.resourcesReferenced[src];
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
                    var version = chooseAudioVersion(res);
                    var audioURL = this.props.theme.getAudioURL(res, { version });
                    this.setState({ audioURL });
                }
            } else {
                var targetRect = target.getBoundingClientRect();
                var width = target.naturalWidth + 50;
                var height = target.naturalHeight + 50;
                var left = targetRect.left + window.screenLeft;
                var top = targetRect.top + window.screenTop;
                window.open(target.src, '_blank', `width=${width},height=${height},left=${left},top=${top}status=no,menubar=no`);
            }
        }
    },

    /**
     * Called when user closes referenced media dialog
     *
     * @param  {Object} evt
     */
    handleReferencedMediaDialogClose: function(evt) {
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
    },

    /**
     * Called when options are changed
     *
     * @param  {Object} evt
     */
    handleOptionsChange: function(evt) {
        this.setOptions(evt.options);
    },

    /**
     * Called when audio playback ends
     *
     * @param  {Event} evt
     */
    handleAudioEnded: function(evt) {
        this.setState({ audioURL: null });
    },
});

var defaultOptions = {
    hideReaction: false,
    editReaction: false,
    removeReaction: false,
};

var getZoomableResources = Memoize(function(resources) {
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
    var noteId = _.get(link, 'note.id');
    return (noteId) ? `#note_${noteId}` : '';
}
