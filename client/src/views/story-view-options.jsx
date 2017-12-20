var _ = require('lodash');
var React = require('react'), PropTypes = React.PropTypes;
var Moment = require('moment');
var UserUtils = require('objects/utils/user-utils');

var Database = require('data/database');
var Route = require('routing/route');
var Locale = require('locale/locale');
var Theme = require('theme/theme');

// widgets
var OptionButton = require('widgets/option-button');
var UserSelectionDialogBox = require('dialogs/user-selection-dialog-box');
var IssueDialogBox = require('dialogs/issue-dialog-box');

require('./story-view-options.scss');

module.exports = React.createClass({
    displayName: 'StoryViewOptions',
    propTypes: {
        section: PropTypes.oneOf([ 'main', 'both' ]),
        access: PropTypes.oneOf([ 'read-only', 'read-comment', 'read-write' ]).isRequired,
        story: PropTypes.object.isRequired,
        repos: PropTypes.arrayOf(PropTypes.object),
        currentUser: PropTypes.object.isRequired,
        options: PropTypes.object.isRequired,

        database: PropTypes.instanceOf(Database).isRequired,
        route: PropTypes.instanceOf(Route).isRequired,
        locale: PropTypes.instanceOf(Locale).isRequired,
        theme: PropTypes.instanceOf(Theme).isRequired,

        onChange: PropTypes.func,
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
        var t = this.props.locale.translate;
        return (
            <div className="story-view-options">
                {this.renderButtons('main')}
            </div>
        );
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
        var access = this.props.access;
        var canWrite = (access === 'read-write');
        var canComment = (canWrite || access === 'read-write');
        var user = this.props.currentUser;
        var story = this.props.story;
        if (section === 'main') {
            var bookmarking = (user) ? _.includes(options.bookmarkRecipients, user.id) : false;
            var otherRecipients = (user) ? _.without(options.bookmarkRecipients, user.id) : [];
            var bookmarkProps = {
                label: t('option-bookmark-story'),
                selected: bookmarking,
                onClick: this.handleBookmarkClick,
            };
            var sendBookmarkProps = {
                label: _.isEmpty(otherRecipients)
                    ? t('option-send-bookmarks')
                    : t('option-send-bookmarks-to-$count-users', _.size(otherRecipients)),
                hidden: !(canWrite && UserUtils.canSendBookmarks(user, story)),
                selected: !_.isEmpty(otherRecipients) || this.state.selectingRecipients,
                onClick: this.handleSendBookmarkClick,
            };
            var addIssueProps = {
                label: t('option-add-issue'),
                hidden: !(canWrite && UserUtils.canAddIssue(user, story, this.props.repos)),
                selected: !!options.issueDetails || this.state.enteringIssueDetails,
                onClick: this.handleAddIssueClick,
            };
            var hideProps = {
                label: t('option-hide-post'),
                hidden: !(canWrite && UserUtils.canHideStory(user, story)),
                selected: options.hidePost,
                onClick: this.handleHideClick,
            };
            var editProps = {
                label: t('option-edit-post'),
                hidden: !(canWrite && UserUtils.canEditStory(user, story)),
                selected: options.editPost,
                onClick: this.handleEditClick,
            };
            var removeProps = {
                label: t('option-remove-post'),
                hidden: !(canWrite && UserUtils.canRemoveStory(user, story)),
                selected: options.removePost,
                onClick: this.handleRemoveClick,
            };
            var bumpProps = {
                label: t('option-bump-post'),
                hidden: !(canWrite && UserUtils.canBumpStory(user, story)),
                selected: options.bumpPost,
                onClick: this.handleBumpClick,
            };
            return (
                <div className={section}>
                    <OptionButton {...bookmarkProps} />
                    <OptionButton {...sendBookmarkProps} />
                    <OptionButton {...addIssueProps} />
                    <OptionButton {...hideProps} />
                    <OptionButton {...editProps} />
                    <OptionButton {...removeProps} />
                    <OptionButton {...bumpProps} />
                    {this.renderRecipientDialogBox()}
                    {this.renderIssueDialogBox()}
                </div>
            );
        }
    },

    /**
     * Render dialog for selecting users
     *
     * @return {ReactElement|null}
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
            allowClearing: false,
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

            // stop menu from closing, as otherwise this component would unmount
            evt.stopPropagation();
            this.sendBookmakTarget = evt.target;
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
            }, 1000);

            // fire click event to close menu
            if (this.sendBookmakTarget) {
                this.sendBookmakTarget.click();
                this.sendBookmakTarget = null;
            }
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

            // stop menu from closing, as otherwise this component would unmount
            evt.stopPropagation();
            this.issueDetailsTarget = evt.target;
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
            }, 1000);

            // fire click event to close menu
            if (this.issueDetailsTarget) {
                this.issueDetailsTarget.click();
                this.issueDetailsTarget = null;
            }
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
    handleHideClick: function(evt) {
        var options = _.clone(this.props.options);
        options.hidePost = !options.hidePost;
        this.triggerChangeEvent(options);
    },

    /**
     * Called when user clicks on edit post button
     *
     * @param  {Event} evt
     */
    handleEditClick: function(evt) {
        var options = _.clone(this.props.options);
        options.editPost = true;
        this.triggerChangeEvent(options);
    },

    /**
     * Called when user clicks on remove post button
     *
     * @param  {Event} evt
     */
    handleRemoveClick: function(evt) {
        var options = _.clone(this.props.options);
        options.removePost = true;
        this.triggerChangeEvent(options);
    },

    /**
     * Called when user clicks on bump post button
     *
     * @param  {Event} evt
     */
    handleBumpClick: function(evt) {
        var options = _.clone(this.props.options);
        options.bumpPost = true;
        this.triggerChangeEvent(options);
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
        this.closeSelectionDialogBox();
    },

    /**
     * Called when user cancel user selection
     *
     * @param  {Object} evt
     */
    handleRecipientsCancel: function(evt) {
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
        this.closeIssueDialogBox();
    },

    /**
     * Called when user cancel editing of issue details
     *
     * @param  {Object} evt
     */
    handleIssueCancel: function(evt) {
        this.closeIssueDialogBox();
    },
});
