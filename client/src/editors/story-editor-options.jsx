var _ = require('lodash');
var React = require('react'), PropTypes = React.PropTypes;
var UserUtils = require('objects/utils/user-utils');

var Database = require('data/database');
var Route = require('routing/route');
var Locale = require('locale/locale');
var Theme = require('theme/theme');

// widgets
var HeaderButton = require('widgets/header-button');
var OptionButton = require('widgets/option-button');
var UserSelectionDialogBox = require('dialogs/user-selection-dialog-box');
var IssueDialogBox = require('dialogs/issue-dialog-box');

require('./story-editor-options.scss');

module.exports = React.createClass({
    displayName: 'StoryEditorOptions',
    propTypes: {
        section: PropTypes.oneOf([ 'main', 'preview', 'both' ]),
        story: PropTypes.object.isRequired,
        repos: PropTypes.arrayOf(PropTypes.object),
        currentUser: PropTypes.object,
        options: PropTypes.object.isRequired,

        database: PropTypes.instanceOf(Database).isRequired,
        route: PropTypes.instanceOf(Route).isRequired,
        locale: PropTypes.instanceOf(Locale).isRequired,
        theme: PropTypes.instanceOf(Theme).isRequired,

        onChange: PropTypes.func,
        onComplete: PropTypes.func,
    },

    /**
     * Return default props
     *
     * @return {Object}
     */
    getDefaultProps: function() {
        return {
            section: 'both',
        }
    },

    /**
     * Return initial state of component
     *
     * @return {Object}
     */
    getInitialState: function() {
        return {
            selectingRecipients: false,
            renderingRecipientDialogBox: false,
            enteringIssueDetails: false,
            renderingIssueDialogBox: false,
        };
    },

    /**
     * Render component
     *
     * @return {ReactElement}
     */
    render: function() {
        if (this.props.section === 'both') {
            return (
                <div className="story-editor-options">
                    {this.renderButtons('main')}
                    <div className="border" />
                    {this.renderButtons('preview')}
                </div>
            );
        } else {
            return (
                <div className="story-editor-options">
                    {this.renderButtons(this.props.section)}
                </div>
            );
        }
    },

    /**
     * Render list of buttons belonging to specified section
     *
     * @param  {String} section
     *
     * @return {ReactElement}
     */
    renderButtons: function(section) {
        var t = this.props.locale.translate;
        var options = this.props.options;
        if (section === 'main') {
            var access = this.props.access;
            var canWrite = (access === 'read-write');
            var canComment = (canWrite || access === 'read-write');
            var user = this.props.currentUser;
            var story = this.props.story;
            var bookmarking = (user) ? _.includes(options.bookmarkRecipients, user.id) : false;
            var otherRecipients = (user) ? _.without(options.bookmarkRecipients, user.id) : [];
            var bookmarkProps = {
                label: t('option-add-bookmark'),
                selected: bookmarking,
                onClick: this.handleBookmarkClick,
            };
            var sendBookmarkProps = {
                label: _.isEmpty(otherRecipients)
                    ? t('option-send-bookmarks')
                    : t('option-send-bookmarks-to-$count-users', _.size(otherRecipients)),
                hidden: !UserUtils.canSendBookmarks(user, story),
                selected: !_.isEmpty(otherRecipients),
                onClick: this.handleSendBookmarkClick,
            };
            var addIssueProps = {
                label: t('option-add-issue'),
                selected: !!options.issueDetails,
                hidden: !UserUtils.canAddIssue(user, story, this.props.repos),
                onClick: this.handleAddIssueClick,
            };
            var hidePostProps = {
                label: t('option-hide-story'),
                selected: options.hidePost,
                hidden: !UserUtils.canHideStory(user, story),
                onClick: this.handleHidePostClick,
            };
            return (
                <div className={section}>
                    <OptionButton {...bookmarkProps} />
                    <OptionButton {...sendBookmarkProps} />
                    <OptionButton {...addIssueProps} />
                    <OptionButton {...hidePostProps} />
                    {this.renderRecipientDialogBox()}
                    {this.renderIssueDialogBox()}
                </div>
            );
        } else if (section === 'preview') {
            var mediaProps = {
                label: t('option-show-media-preview'),
                selected: options.preview === 'media' || !options.preview,
                onClick: this.handleShowMediaPreviewClick,
            };
            var textProps = {
                label: t('option-show-text-preview'),
                selected: options.preview === 'text',
                onClick: this.handleShowTextPreviewClick,
            };
            return (
                <div className={section}>
                    <OptionButton {...mediaProps} />
                    <OptionButton {...textProps} />
                </div>
            );
        }
    },

    /**
     * Render dialog for selecting users
     *
     * @return {ReactElement}
     */
    renderRecipientDialogBox: function() {
        if (!this.state.renderingRecipientDialogBox) {
            return null;
        }
        var props = {
            show: this.state.selectingRecipients,
            selection: this.props.options.bookmarkRecipients,

            database: this.props.database,
            route: this.props.route,
            locale: this.props.locale,
            theme: this.props.theme,

            onSelect: this.handleRecipientsSelect,
            onCancel: this.handleRecipientsCancel,
        };
        return <UserSelectionDialogBox {...props} />;
    },

    /**
     * Render dialog for entering issue details
     *
     * @return {ReactElement}
     */
    renderIssueDialogBox: function() {
        if (!this.state.renderingIssueDialogBox) {
            return null;
        }
        var props = {
            show: this.state.enteringIssueDetails,
            allowClearing: !!this.props.options.issueDetails,
            issue: this.props.options.issueDetails,
            repos: this.props.repos,

            locale: this.props.locale,
            theme: this.props.theme,

            onConfirm: this.handleIssueConfirm,
            onCancel: this.handleIssueCancel,
        };
        return <IssueDialogBox {...props} />;
    },

    /**
     * Inform parent component that options have been changed
     *
     * @param  {Object} options
     */
    triggerChangeEvent: function(options) {
        if (this.props.onChange) {
            this.props.onChange({
                type: 'change',
                target: this,
                options,
            });
        }
    },

    /**
     * Inform parent component the action requested is either done or canceled
     */
    triggerCompleteEvent: function() {
        if (this.props.onComplete) {
            this.props.onComplete({
                type: 'complete',
                target: this,
            });
        }
    },

    /**
     * Open dialog box for selecting user
     *
     * @param  {Event} evt
     */
    openSelectionDialogBox: function(evt) {
        if (!this.state.selectingRecipients) {
            this.setState({
                selectingRecipients: true,
                renderingRecipientDialogBox: true
            });
        }
    },

    /**
     * Close dialog box
     */
    closeSelectionDialogBox: function() {
        if (this.state.selectingRecipients) {
            this.setState({ selectingRecipients: false });
            setTimeout(() => {
                if (!this.state.selectingRecipients) {
                    this.setState({ renderingRecipientDialogBox: false });
                }
            }, 500);
        }
    },

    /**
     * Open dialog box for entering issue details
     *
     * @param  {Event} evt
     */
    openIssueDialogBox: function(evt) {
        if (!this.state.enteringIssueDetails) {
            this.setState({
                enteringIssueDetails: true,
                renderingIssueDialogBox: true
            });
        }
    },

    /**
     * Close dialog box
     */
    closeIssueDialogBox: function() {
        if (this.state.enteringIssueDetails) {
            this.setState({ enteringIssueDetails: false });
            setTimeout(() => {
                if (!this.state.enteringIssueDetails) {
                    this.setState({ renderingIssueDialogBox: false });
                }
            }, 500);
        }
    },

    /**
     * Called when user clicks on bookmark post button
     *
     * @param  {Event} evt
     */
    handleBookmarkClick: function(evt) {
        var options = _.clone(this.props.options);
        var userId = this.props.currentUser.id;
        if (_.includes(options.bookmarkRecipients, userId)) {
            options.bookmarkRecipients = _.difference(options.bookmarkRecipients, [ userId ]);
        } else {
            options.bookmarkRecipients = _.union(options.bookmarkRecipients, [ userId ]);
        }
        this.triggerChangeEvent(options);
        this.triggerCompleteEvent();
    },

    /**
     * Called when user clicks on send bookmark button
     *
     * @param  {Event} evt
     */
    handleSendBookmarkClick: function(evt) {
        this.openSelectionDialogBox(evt);
    },

    /**
     * Called when user clicks on add issue to tracker button
     *
     * @param  {Event} evt
     */
    handleAddIssueClick: function(evt) {
        this.openIssueDialogBox(evt);
    },

    /**
     * Called when user clicks on hide post button
     *
     * @param  {Event} evt
     */
    handleHidePostClick: function(evt) {
        var options = _.clone(this.props.options);
        options.hidePost = !options.hidePost;
        this.triggerChangeEvent(options);
        this.triggerCompleteEvent();
    },

    /**
     * Called when user finishes selecting user
     *
     * @param  {Object} evt
     */
    handleRecipientsSelect: function(evt) {
        var options = _.clone(this.props.options);
        options.bookmarkRecipients = evt.selection;
        this.triggerChangeEvent(options);
        this.triggerCompleteEvent();
        this.closeSelectionDialogBox();
    },

    /**
     * Called when user cancel user selection
     *
     * @param  {Object} evt
     */
    handleRecipientsCancel: function(evt) {
        this.triggerCompleteEvent();
        this.closeSelectionDialogBox();
    },

    /**
     * Called when user finishes entering issue details
     *
     * @param  {Object} evt
     */
    handleIssueConfirm: function(evt) {
        var options = _.clone(this.props.options);
        options.issueDetails = evt.issue;
        this.triggerChangeEvent(options);
        this.triggerCompleteEvent();
        this.closeIssueDialogBox();
    },

    /**
     * Called when user cancel editing of issue details
     *
     * @param  {Object} evt
     */
    handleIssueCancel: function(evt) {
        this.triggerCompleteEvent();
        this.closeIssueDialogBox();
    },

    /**
     * Called when user clicks show media button
     *
     * @param  {Event} evt
     */
    handleShowMediaPreviewClick: function(evt) {
        var options = _.clone(this.props.options);
        options.preview = 'media';
        this.triggerChangeEvent(options);
        this.triggerCompleteEvent();
    },

    /**
     * Called when user clicks show preview button
     *
     * @param  {Event} evt
     */
    handleShowTextPreviewClick: function(evt) {
        var options = _.clone(this.props.options);
        options.preview = 'text';
        this.triggerChangeEvent(options);
        this.triggerCompleteEvent();
    },
});
