var React = require('react'), PropTypes = React.PropTypes;

var Database = require('data/database');
var Route = require('routing/route');
var Locale = require('locale/locale');
var Theme = require('theme/theme');

// mixins
var UpdateCheck = require('mixins/update-check');

// widgets
var StorySection = require('widgets/story-section');
var Time = require('widgets/time');
var PushButton = require('widgets/push-button');
var UserSelectionDialogBox = require('dialogs/user-selection-dialog-box');

require('./story-text-editor.scss');

module.exports = React.createClass({
    displayName: 'StoryTextEditor',
    mixins: [ UpdateCheck ],
    propTypes: {
        story: PropTypes.object.isRequired,
        authors: PropTypes.arrayOf(PropTypes.object),
        languageCode: PropTypes.string.isRequired,
        cornerPopUp: PropTypes.element,

        database: PropTypes.instanceOf(Database).isRequired,
        route: PropTypes.instanceOf(Route).isRequired,
        locale: PropTypes.instanceOf(Locale).isRequired,
        theme: PropTypes.instanceOf(Theme).isRequired,

        onChange: PropTypes.func,
        onCommit: PropTypes.func,
        onCancel: PropTypes.func,
    },

    getInitialState: function() {
        return {
            selectingCoauthor: false,
        };
    },

    render: function() {
        return (
            <StorySection className="text-editor">
                <header>
                    {this.renderProfileImage()}
                    {this.renderNames()}
                    {this.props.cornerPopUp}
                </header>
                <subheader>
                    {this.renderCoauthoringButtons()}
                    {this.renderUserSelectionDialogBox()}
                </subheader>
                <body>
                    {this.renderTextArea()}
                </body>
                <footer>
                    {this.renderButtons()}
                </footer>
            </StorySection>
        );
    },

    renderProfileImage: function() {
        var leadAuthor = _.get(this.props.authors, 0);
        var resources = _.get(leadAuthor, 'details.resources');
        var profileImage = _.find(resources, { type: 'image' });
        var url = this.props.theme.getImageUrl(profileImage, 48, 48);
        return (
            <div className="profile-image">
                <img src={url} />
            </div>
        );
    },

    renderNames: function() {
        var names = _.map(this.props.authors, 'details.name');
        return (
            <span className="name">
                {_.join(names, ', ')}
                &nbsp;
            </span>
        )
    },

    renderCoauthoringButtons: function() {
        var t = this.props.locale.translate;
        var label;
        if (this.props.story.user_ids.length > 1) {
            label = t('story-add-remove-coauthor');
        } else {
            label = t('story-add-coauthor');
        }
        return (
            <div>
                <span className="button" onClick={this.handleCoauthoringClick}>
                    <i className="fa fa-plus-square" />
                    <span className="label">{label}</span>
                </span>
            </div>
        )
    },

    renderUserSelectionDialogBox: function() {
        var props = {
            show: this.state.selectingCoauthor,
            selection: this.props.story.user_ids,
            disabled: _.slice(this.props.story.user_ids, 0, 1),

            database: this.props.database,
            route: this.props.route,
            locale: this.props.locale,
            theme: this.props.theme,

            onSelect: this.handleCoauthoringSelect,
            onCancel: this.handleCoauthoringCancel,
        };
        return <UserSelectionDialogBox {...props} />;
    },

    renderTextArea: function() {
        var code = this.props.languageCode.substr(0, 2);
        var text = _.get(this.props.story, [ 'details', 'text', code ], '');
        var props = {
            value: text,
            lang: this.props.languageCode,
            onChange: this.handleTextChange,
        };
        return <textarea {...props} />;
    },

    renderButtons: function() {
        var t = this.props.locale.translate;
        var noText = !_.get(this.props.story, 'details.text');
        var publishing = _.get(this.props.story, 'published', false);
        var cancelButtonProps = {
            label: t('story-cancel'),
            onClick: this.handleCancelClick,
            disabled: noText || publishing,
        };
        var postButtonProps = {
            label: t('story-post'),
            onClick: this.handlePostClick,
            emphasized: true,
            disabled: noText || publishing,
        };
        return (
            <div className="buttons">
                <PushButton {...cancelButtonProps} />
                <PushButton {...postButtonProps} />
            </div>
        );
    },

    /**
     * Call onStoryChange handler
     *
     * @param  {Story} story
     * @param  {String} path
     */
    triggerChangeEvent: function(story, path) {
        if (this.props.onChange) {
            this.props.onChange({
                type: 'change',
                target: this,
                story,
                path,
            })
        }
    },

    /**
     * Call onCommit handler
     */
    triggerCommitEvent: function() {
        if (this.props.onCommit) {
            this.props.onCommit({
                type: 'commit',
                target: this,
                story: this.props.story,
            });
        }
    },

    /**
     * Call onCancel handler
     */
    triggerCancelEvent: function() {
        if (this.props.onCancel) {
            this.props.onCancel({
                type: 'cancel',
                target: this,
                story: this.props.story,
            });
        }
    },

    /**
     * Called when user clicks add co-author button
     *
     * @param  {Event} evt
     */
    handleCoauthoringClick: function(evt) {
        this.setState({ selectingCoauthor: true });
    },

    /**
     * Called when user clicks the x or outside the modal
     *
     * @param  {Event} evt
     */
    handleCoauthoringCancel: function(evt) {
        this.setState({ selectingCoauthor: false });
    },

    /**
     * Called when user selects a user from the list
     *
     * @param  {Object} evt
     */
    handleCoauthoringSelect: function(evt) {
        // parent component will update user_ids in story
        var story = _.clone(this.props.story);
        story.user_ids = evt.selection;
        this.triggerChangeEvent(story, 'user_ids');
        this.setState({ selectingCoauthor: false });
    },

    /**
     * Called when user changes the text
     *
     * @param  {Event} evt
     */
    handleTextChange: function(evt) {
        var text = evt.currentTarget.value;
        var lang = this.props.languageCode.substr(0, 2);
        var story = _.clone(this.props.story);
        story.details = _.clone(story.details);
        if (story.details.text) {
            story.details.text = _.clone(story.details.text);
        } else {
            story.details.text = {};
        }
        if (text) {
            story.details.text[lang] = text;
        } else {
            if (story.details.text) {
                story.details.text = _.clone(story.details.text);
                delete story.details.text[lang];
                if (_.isEmpty(story.details.text)) {
                    delete story.details.text;
                }
            }
        }
        this.triggerChangeEvent(story, 'details.text');
    },

    /**
     * Called when user click Post button
     *
     * @param  {Event} evt
     */
    handlePostClick: function(evt) {
        this.triggerCommitEvent();
    },

    /**
     * Called when user click Cancel button
     *
     * @param  {Event} evt
     */
    handleCancelClick: function(evt) {
        this.triggerCancelEvent();
    },
});
