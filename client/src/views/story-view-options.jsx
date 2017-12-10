var React = require('react'), PropTypes = React.PropTypes;
var Moment = require('moment');
var StoryTypes = require('objects/types/story-types');

var Database = require('data/database');
var Route = require('routing/route');
var Locale = require('locale/locale');
var Theme = require('theme/theme');

// widgets
var StorySection = require('widgets/story-section');
var HeaderButton = require('widgets/header-button');
var OptionButton = require('widgets/option-button');
var UserSelectionDialogBox = require('dialogs/user-selection-dialog-box');

require('./story-view-options.scss');

module.exports = React.createClass({
    displayName: 'StoryViewOptions',
    propTypes: {
        inMenu: PropTypes.bool,
        section: PropTypes.oneOf([ 'main', 'supplemental', 'both' ]),
        access: PropTypes.oneOf([ 'read-only', 'read-comment', 'read-write' ]).isRequired,
        story: PropTypes.object.isRequired,
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
            inMenu: false,
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
            renderingDialogBox: false,
        };
    },

    /**
     * Return true if current user can perform write action
     *
     * @return {Boolean}
     */
    canWrite: function() {
        var access = this.props.access;
        return (access === 'read-write');
    },

    /**
     * Return true if current user can comment
     *
     * @return {Boolean}
     */
    canComment: function() {
        var access = this.props.access;
        return (access === 'read-comment' || access === 'read-write');
    },

    /**
     * Return true if user can hide a story
     *
     * @return {Boolean}
     */
    canHideStory: function() {
        if (!this.canWrite()) {
            return false;
        }
        var story = this.props.story;
        var user = this.props.currentUser;
        if (user.type !== 'guest') {
            if (user.type === 'admin') {
                return true;
            }
            if (_.includes(story.user_ids, user.id)) {
                return true;
            }
        }
        return false;
    },

    /**
     * Return true if story can be edited
     *
     * @return {Boolean}
     */
    canEditStory: function() {
        if (!this.canWrite()) {
            return false;
        }
        var story = this.props.story;
        var user = this.props.currentUser;
        if (_.includes(StoryTypes.editable, story.type)) {
            if (_.includes(story.user_ids, user.id)) {
                // allow editing for 3 days
                if (Moment() < Moment(story.ptime).add(3, 'day')) {
                    return true;
                }
            }
        }
        return false;
    },

    /**
     * Return true if story can be removed by current user
     *
     * @return {Boolean}
     */
    canRemoveStory: function() {
        if (!this.canWrite()) {
            return false;
        }
        var story = this.props.story;
        var user = this.props.currentUser;
        if (_.includes(story.user_ids, user.id)) {
            // allow removal for 3 days
            if (Moment() < Moment(story.ptime).add(3, 'day')) {
                return true;
            }
        }
        if (user.type === 'admin') {
            return true;
        }
        return false;
    },

    /**
     * Return true if story can be bumped by current user
     *
     * @return {Boolean}
     */
    canBumpStory: function() {
        if (!this.canWrite()) {
            return false;
        }
        var story = this.props.story;
        var user = this.props.currentUser;
        if (_.includes(story.user_ids, user.id) || user.type === 'admin') {
            // allow bumping after a day
            if (Moment() > Moment(story.btime || story.ptime).add(1, 'day')) {
                return true;
            }
        }
        return false;
    },

    /**
     * Return true if story can be added to tracker
     *
     * @return {[type]}
     */
    canAddIssue: function() {
        if (!this.canWrite()) {
            return false;
        }
        // TODO: should check whether user has a Gitlab account
        var story = this.props.story;
        var user = this.props.currentUser;
        if (_.includes(StoryTypes.trackable, story.type)) {
            if (user.type !== 'guest') {
                return true;
            }
        }
        return false;
    },

    /**
     * Return true if current user can send bookmark to other users
     *
     * @return {Boolean}
     */
    canSendBookmarks: function() {
        if (!this.canWrite()) {
            return false;
        }
        // TODO
        return true;
    },

    /**
     * Render component
     *
     * @return {ReactElement}
     */
    render: function() {
        if (this.props.inMenu) {
            return (
                <div className="view-options in-menu">
                    {this.renderButtons(this.props.section)}
                </div>
            );
        } else {
            var t = this.props.locale.translate;
            return (
                <StorySection className="view-options">
                    <header>
                        <HeaderButton icon="chevron-circle-right" label={t('story-options')} disabled />
                    </header>
                    <body>
                        {this.renderButtons('main')}
                    </body>
                </StorySection>
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
            var userId = this.props.currentUser.id;
            var bookmarking = _.includes(options.bookmarkRecipients, userId);
            var otherRecipients = _.without(options.bookmarkRecipients, userId);
            var bookmarkProps = {
                label: t('option-bookmark-story'),
                selected: bookmarking,
                onClick: this.handleBookmarkClick,
            };
            var sendBookmarkProps = {
                label: _.isEmpty(otherRecipients)
                    ? t('option-send-bookmarks')
                    : t('option-send-bookmarks-to-$count-users', _.size(otherRecipients)),
                hidden: !this.canSendBookmarks(),
                selected: !_.isEmpty(otherRecipients),
                onClick: this.handleSendBookmarkClick,
            };
            var addIssueProps = {
                label: t('option-add-issue'),
                hidden: !this.canAddIssue(),
                selected: options.addIssue,
                onClick: this.handleAddIssueClick,
            };
            var hideProps = {
                label: t('option-hide-post'),
                hidden: !this.canHideStory(),
                selected: options.hidePost,
                onClick: this.handleHideClick,
            };
            var editProps = {
                label: t('option-edit-post'),
                hidden: !this.canEditStory(),
                selected: options.editPost,
                onClick: this.handleEditClick,
            };
            var removeProps = {
                label: t('option-remove-post'),
                hidden: !this.canRemoveStory(),
                selected: options.removePost,
                onClick: this.handleRemoveClick,
            };
            var bumpProps = {
                label: t('option-bump-post'),
                hidden: !this.canBumpStory(),
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
                    {this.renderUserSelectionDialogBox()}
                </div>
            );
        }
    },

    /**
     * Render dialog for selecting users
     *
     * @return {ReactElement|null}
     */
    renderUserSelectionDialogBox: function() {
        if (!this.state.renderingDialogBox) {
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
                renderingDialogBox: true
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
                    this.setState({ renderingDialogBox: false });
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
        var options = _.clone(this.props.options);
        options.addIssue = !options.addIssue;
        this.triggerChangeEvent(options);
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
});
