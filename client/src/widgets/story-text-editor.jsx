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
var UserSelectionDialogBox = require('widgets/user-selection-dialog-box');

require('./story-text-editor.scss');

module.exports = React.createClass({
    displayName: 'StoryTextEditor',
    mixins: [ UpdateCheck ],
    propTypes: {
        story: PropTypes.object.isRequired,
        authors: PropTypes.arrayOf(PropTypes.object),
        languageCode: PropTypes.string.isRequired,

        database: PropTypes.instanceOf(Database).isRequired,
        route: PropTypes.instanceOf(Route).isRequired,
        locale: PropTypes.instanceOf(Locale).isRequired,
        theme: PropTypes.instanceOf(Theme).isRequired,

        onStoryChange: PropTypes.func,
        onAuthorsChange: PropTypes.func,
    },

    getInitialState: function() {
        return {
            selectingCoauthor: false,
        };
    },

    render: function() {
        return (
            <StorySection>
                <header>
                    {this.renderProfileImage()}
                    {this.renderNames()}
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
        var profileImage = _.get(this.props.authors, '0.details.profile_image');
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
                {_.join(names)}
                &nbsp;
            </span>
        )
    },

    renderCoauthoringButtons: function() {
        return (
            <div>
                <span className="button" onClick={this.handleCoauthoringClick}>
                    <i className="fa fa-plus-square" />
                    <span className="label">
                        Co-write post with a colleague
                    </span>
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
        var text = _.get(this.props.story, 'details.text');
        var code = this.props.languageCode.substr(0, 2);
        var props = {
            value: _.get(text, code, ''),
            onChange: this.handleTextChange,
        };
        return <textarea {...props} />;
    },

    renderButtons: function() {
        var t = this.props.locale.translate;
        var cancelButtonProps = {
            label: t('story-cancel'),
            onClick: this.handleCancelClick,
        };
        var postButtonProps = {
            label: t('story-post'),
            onClick: this.handlePostClick,
            emphasized: true,
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
     */
    triggerStoryChangeEvent: function(story) {
        if (this.props.onStoryChange) {
            this.props.onStoryChange({
                type: 'storychange',
                target: this,
                story,
            })
        }
    },

    /**
     * Call onAuthorsChange handler
     *
     * @param  {Array<User>} authors
     */
    triggerAuthorsChangeEvent: function(authors) {
        if (this.props.onAuthorsChange) {
            this.props.onAuthorsChange({
                type: 'authorschange',
                target: this,
                authors,
            })
        }
    },

    /**
     * Call onPost handler
     *
     * @param  {Array<User>} authors
     */
    triggerPostEvent: function(authors) {
        if (this.props.onPost) {
            this.props.onPost({
                type: 'post',
                target: this,
            })
        }
    },

    /**
     * Call onCancel handler
     *
     * @param  {Array<User>} authors
     */
    triggerCancelEvent: function(authors) {
        if (this.props.onCancel) {
            this.props.onCancel({
                type: 'cancel',
                target: this,
            })
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
        var author = evt.user;
        var authors = _.uniqBy(_.concat(this.props.authors, author), 'id');
        this.triggerAuthorsChangeEvent(authors);
        this.setState({ selectingCoauthor: false });
    },

    /**
     * Called when user changes the text
     *
     * @param  {Event} evt
     */
    handleTextChange: function(evt) {
        var text = evt.currentTarget.value;
        var story = _.cloneDeep(this.props.story);
        _.set(story.details, [ 'text', this.props.languageCode.substr(0, 2) ], text);
        this.triggerStoryChangeEvent(story);
    },

    /**
     * Called when user click Post button
     *
     * @param  {Event} evt
     */
    handlePostClick: function(evt) {
        this.triggerPostEvent();
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
