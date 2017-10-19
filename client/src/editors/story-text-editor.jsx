var React = require('react'), PropTypes = React.PropTypes;
var TagScanner = require('utils/tag-scanner');
var Markdown = require('utils/markdown');

var Database = require('data/database');
var Route = require('routing/route');
var Locale = require('locale/locale');
var Theme = require('theme/theme');

// mixins
var UpdateCheck = require('mixins/update-check');

// widgets
var StorySection = require('widgets/story-section');
var MultipleUserNames = require('widgets/multiple-user-names');
var Time = require('widgets/time');
var PushButton = require('widgets/push-button');
var ProfileImage = require('widgets/profile-image');
var UserSelectionDialogBox = require('dialogs/user-selection-dialog-box');
var AutosizeTextArea = require('widgets/autosize-text-area');
var StoryText = require('widgets/story-text');

require('./story-text-editor.scss');

module.exports = React.createClass({
    displayName: 'StoryTextEditor',
    mixins: [ UpdateCheck ],
    propTypes: {
        story: PropTypes.object.isRequired,
        authors: PropTypes.arrayOf(PropTypes.object),
        options: PropTypes.object.isRequired,
        cornerPopUp: PropTypes.element,

        database: PropTypes.instanceOf(Database).isRequired,
        route: PropTypes.instanceOf(Route).isRequired,
        locale: PropTypes.instanceOf(Locale).isRequired,
        theme: PropTypes.instanceOf(Theme).isRequired,

        onChange: PropTypes.func,
        onPublish: PropTypes.func,
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
                    {this.renderAuthorNames()}
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
        var props = {
            user: _.get(this.props.authors, 0),
            theme: this.props.theme,
            size: 'medium',
        };
        return <ProfileImage {...props} />;
    },

    /**
     * Render the names of the author and co-authors
     *
     * @return {ReactElement}
     */
    renderAuthorNames: function() {
        var t = this.props.locale.translate;
        var n = this.props.locale.name;
        var authors = this.props.authors;
        var names = _.map(authors, (author) => {
            return n(author.details.name, author.details.gender);
        });
        var contents;
        switch (names.length) {
            // the list can be empty during loading
            case 0:
                contents = '\u00a0';
                break;
            case 1:
                contents = `${names[0]}`;
                break;
            case 2:
                contents = t('story-author-$name1-and-$name2', names[0], names[1]);
                break;
            default:
                var coauthors = _.slice(authors, 1);
                var props = {
                    users: coauthors,
                    label: t('story-author-$count-others', coauthors.length),
                    title: t('story-coauthors'),
                    locale: this.props.locale,
                    theme: this.props.theme,
                    key: 1,
                };
                var users = <MultipleUserNames {...props} />
                contents = t('story-author-$name-and-$users', names[0], users, coauthors.length);
        }
        return <span className="name">{contents}</span>;
    },

    /**
     * Render button that opens coauthor selection dialog box
     *
     * @return {ReactElement}
     */
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
        var languageCode = this.props.options.languageCode;
        var lang = languageCode.substr(0, 2);
        var langText = _.get(this.props.story, [ 'details', 'text', lang ], '');
        var props = {
            value: langText,
            lang: lang,
            onChange: this.handleTextChange,
        };
        return <AutosizeTextArea {...props} />;
    },

    renderButtons: function() {
        var t = this.props.locale.translate;
        var noText = _.isEmpty(_.get(this.props.story, 'details.text'));
        var noResources = _.isEmpty(_.get(this.props.story, 'details.resources'));
        var publishing = _.get(this.props.story, 'published', false);
        var cancelButtonProps = {
            label: t('story-cancel'),
            onClick: this.props.onCancel,
            disabled: (noText && noResources) || publishing,
        };
        var postButtonProps = {
            label: t('story-post'),
            onClick: this.props.onPublish,
            emphasized: true,
            disabled: (noText && noResources) || publishing,
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
        var path = 'user_ids';
        var story = _.decoupleSet(this.props.story, path, evt.selection);
        this.triggerChangeEvent(story, path);
        this.setState({ selectingCoauthor: false });
    },

    /**
     * Called when user changes the text
     *
     * @param  {Event} evt
     */
    handleTextChange: function(evt) {
        var langText = evt.currentTarget.value;
        var languageCode = this.props.options.languageCode;
        var lang = languageCode.substr(0, 2);
        var path = `details.text.${lang}`;
        var story = _.decoupleSet(this.props.story, path, langText);

        // remove zero-length text
        story.details.text = _.pickBy(story.details.text, 'length');
        if (_.isEmpty(story.details.text)) {
            // remove the text object altogether
            story.details = _.omit(story.details, 'text');
        }

        // automatically enable Markdown formatting
        if (story.details.markdown === undefined) {
            if (Markdown.detect(langText)) {
                story.details.markdown = true;
            }
        }

        // automatically set story type to task list
        if (!story.type) {
            if (StoryText.hasLists(story)) {
                story.type = 'task-list';
            }
        }

        // look for tags
        story.tags = TagScanner.findTags(story.details.text);

        this.triggerChangeEvent(story, path);
    },
});
