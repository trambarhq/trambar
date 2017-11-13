var React = require('react'), PropTypes = React.PropTypes;

var Database = require('data/database');
var Route = require('routing/route');
var Locale = require('locale/locale');
var Theme = require('theme/theme');

// widgets
var StorySection = require('widgets/story-section');
var HeaderButton = require('widgets/header-button');
var OptionButton = require('widgets/option-button');
var UserSelectionDialogBox = require('dialogs/user-selection-dialog-box');

require('./story-editor-options.scss');

module.exports = React.createClass({
    displayName: 'StoryEditorOptions',
    propTypes: {
        inMenu: PropTypes.bool,
        section: PropTypes.oneOf([ 'main', 'supplemental', 'both' ]),
        story: PropTypes.object.isRequired,
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
     * Return true if user can hide a story
     *
     * @return {Boolean}
     */
    canHideStory: function() {
        if (this.props.currentUser) {
            var story = this.props.story;
            var userType = this.props.currentUser.type;
            if (userType !== 'guest') {
                if (userType === 'admin') {
                    return true;
                }
                var userId = this.props.currentUser.id;
                if (_.includes(story.user_ids, userId)) {
                    return true;
                }
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
        // TODO: should check whether user has a Gitlab account
        if (this.props.currentUser) {
            var userType = this.props.currentUser.type;
            if (userType !== 'guest') {
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
                <div className="editor-options in-menu">
                    {this.renderButtons(this.props.section)}
                </div>
            );
        } else {
            var t = this.props.locale.translate;
            return (
                <StorySection className="editor-options">
                    <header>
                        <HeaderButton icon="chevron-circle-right" label={t('story-options')} disabled />
                    </header>
                    <body>
                        {this.renderButtons('main')}
                        {this.renderButtons('supplemental')}
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
            var userId = _.get(this.props.currentUser, 'id');
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
                selected: options.addIssue,
                hidden: this.canAddIssue(),
                onClick: this.handleAddIssueClick,
            };
            var hidePostProps = {
                label: t('option-hide-post'),
                selected: options.hidePost,
                hidden: this.canHideStory(),
                onClick: this.handleHidePostClick,
            };
            return (
                <div className={section}>
                    <OptionButton {...bookmarkProps} />
                    <OptionButton {...sendBookmarkProps} />
                    <OptionButton {...addIssueProps} />
                    <OptionButton {...hidePostProps} />
                    {this.renderUserSelectionDialogBox()}
                </div>
            );
        } else if (section === 'supplemental') {
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
     * @return {ReactElement|null}
     */
    renderUserSelectionDialogBox: function() {
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

            // stop menu from closing, as otherwise this component would be
            // unmounted
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
    handleHidePostClick: function(evt) {
        var options = _.clone(this.props.options);
        options.hidePost = !options.hidePost;
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
     * Called when user clicks show media button
     *
     * @param  {Event} evt
     */
    handleShowMediaPreviewClick: function(evt) {
        var options = _.clone(this.props.options);
        options.preview = 'media';
        this.triggerChangeEvent(options);
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
    },
});
