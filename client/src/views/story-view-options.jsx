var React = require('react'), PropTypes = React.PropTypes;
var Moment = require('moment');

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
     * Return true if story can be edited
     *
     * @return {Boolean}
     */
    isEditable: function() {
        var story = this.props.story;
        if (_.includes(editableStoryTypes, story.type)) {
            var userId = this.props.currentUser.id;
            if (_.includes(story.user_ids, userId)) {
                // allow editing for 3 days
                if (Moment() < Moment(story.ptime).add(3, 'day')) {
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
    isTrackable: function() {
        var story = this.props.story;
        if (_.includes(trackableStoryTypes, story.type)) {
            var userType = this.props.currentUser.type;
            if (userType === 'member' || userType === 'admin') {
                return true;
            }
        }
        return false;
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
            var addIssueProps = {
                label: t('option-add-issue'),
                hidden: !this.isTrackable(),
                selected: options.addIssue,
                onClick: this.handleAddIssueClick,
            };
            var sendBookmarkProps = {
                label: _.isEmpty(options.bookmarkRecipients)
                    ? t('option-send-bookmarks')
                    : t('option-send-bookmarks-to-$count-users', _.size(options.bookmarkRecipients)),
                selected: !_.isEmpty(options.bookmarkRecipients),
                onClick: this.handleSendBookmarkClick,
            };
            var hidePostProps = {
                label: t('option-hide-post'),
                selected: options.hidePost,
                onClick: this.handleHidePostClick,
            };
            var editPostProps = {
                label: t('option-edit-post'),
                hidden: !this.isEditable(),
                selected: options.editPost,
                onClick: this.handleEditPostClick,
            };
            return (
                <div className={section}>
                    <OptionButton {...addIssueProps} />
                    <OptionButton {...sendBookmarkProps} />
                    <OptionButton {...hidePostProps} />
                    <OptionButton {...editPostProps} />
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
     */
    openSelectionDialogBox: function() {
        this.setState({
            selectingRecipients: true,
            renderingDialogBox: true
        });
    },

    /**
     * Close dialog box
     */
    closeSelectionDialogBox: function() {
        this.setState({ selectingRecipients: false });
        setTimeout(() => {
            if (!this.state.selectingRecipients) {
                this.setState({ renderingDialogBox: false });
            }
        }, 1000);
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
     * Called when user clicks on send bookmark button
     *
     * @param  {Event} evt
     */
    handleSendBookmarkClick: function(evt) {
        this.openSelectionDialogBox();
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
     * Called when user clicks on edit post button
     *
     * @param  {Event} evt
     */
    handleEditPostClick: function(evt) {
        var options = _.clone(this.props.options);
        options.editPost = true;
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

var editableStoryTypes = [
    'story',
    'task-list',
    'survey',
];

var trackableStoryTypes = [
    'story',
];
