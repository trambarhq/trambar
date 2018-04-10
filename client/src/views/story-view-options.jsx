var _ = require('lodash');
var React = require('react'), PropTypes = React.PropTypes;
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
        reactions: PropTypes.arrayOf(PropTypes.object),
        repos: PropTypes.arrayOf(PropTypes.object),
        currentUser: PropTypes.object.isRequired,
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
        var user = this.props.currentUser;
        var story = this.props.story;
        var repos = this.props.repos;
        if (section === 'main') {
            var bookmarkProps;
            if (options.keepBookmark === undefined) {
                var bookmarking = (user) ? _.includes(options.bookmarkRecipients, user.id) : false;
                bookmarkProps = {
                    label: t('option-add-bookmark'),
                    selected: bookmarking,
                    hidden: !UserUtils.canCreateBookmark(user, story, access),
                    onClick: this.handleAddBookmarkClick,
                };
            } else {
                // viewing in bookmark page
                 bookmarkProps = {
                    label: t('option-keep-bookmark'),
                    selected: options.keepBookmark,
                    onClick: this.handleKeepBookmarkClick,
                };
            }
            var otherRecipients = (user) ? _.without(options.bookmarkRecipients, user.id) : [];
            var sendBookmarkProps = {
                label: _.isEmpty(otherRecipients)
                    ? t('option-send-bookmarks')
                    : t('option-send-bookmarks-to-$count-users', _.size(otherRecipients)),
                hidden: !UserUtils.canSendBookmarks(user, story, access),
                selected: !_.isEmpty(otherRecipients) || this.state.selectingRecipients,
                onClick: this.handleSendBookmarkClick,
            };
            var addIssueProps = {
                label: t('option-add-issue'),
                hidden: !UserUtils.canAddIssue(user, story, repos, access),
                selected: !!options.issueDetails || this.state.enteringIssueDetails,
                onClick: this.handleAddIssueClick,
            };
            var hideProps = {
                label: t('option-hide-story'),
                hidden: !UserUtils.canHideStory(user, story, access),
                selected: options.hideStory,
                onClick: this.handleHideClick,
            };
            var editProps = {
                label: t('option-edit-post'),
                hidden: !UserUtils.canEditStory(user, story, access),
                selected: options.editStory,
                onClick: this.handleEditClick,
            };
            var removeProps = {
                label: t('option-remove-story'),
                hidden: !UserUtils.canRemoveStory(user, story, access),
                selected: options.removeStory,
                onClick: this.handleRemoveClick,
            };
            var bumpProps = {
                label: t('option-bump-story'),
                hidden: !UserUtils.canBumpStory(user, story, access),
                selected: options.bumpStory,
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
        // don't allow issue to be deleted once someone has been assigned to it
        var props = {
            show: this.state.enteringIssueDetails,
            allowDeletion: !_.some(this.props.reactions, { type: 'assignment '}),
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
     * Called when user clicks on add bookmark button
     *
     * @param  {Event} evt
     */
    handleAddBookmarkClick: function(evt) {
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
     * Called when user clicks on keep bookmark button
     *
     * @param  {Event} evt
     */
    handleKeepBookmarkClick: function(evt) {
        var options = _.clone(this.props.options);
        var userId = this.props.currentUser.id;
        options.keepBookmark = false;
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
     * Called when user clicks on hide story button
     *
     * @param  {Event} evt
     */
    handleHideClick: function(evt) {
        var options = _.clone(this.props.options);
        options.hideStory = !options.hideStory;
        this.triggerChangeEvent(options);
        this.triggerCompleteEvent();
    },

    /**
     * Called when user clicks on edit story button
     *
     * @param  {Event} evt
     */
    handleEditClick: function(evt) {
        var options = _.clone(this.props.options);
        options.editStory = true;
        this.triggerChangeEvent(options);
        this.triggerCompleteEvent();
    },

    /**
     * Called when user clicks on remove story button
     *
     * @param  {Event} evt
     */
    handleRemoveClick: function(evt) {
        var options = _.clone(this.props.options);
        options.removeStory = true;
        this.triggerChangeEvent(options);
        this.triggerCompleteEvent();
    },

    /**
     * Called when user clicks on bump story button
     *
     * @param  {Event} evt
     */
    handleBumpClick: function(evt) {
        var options = _.clone(this.props.options);
        options.bumpStory = true;
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
});
