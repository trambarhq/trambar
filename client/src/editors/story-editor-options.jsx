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

    getDefaultProps: function() {
        return {
            inMenu: false,
            section: 'both',
        }
    },

    getInitialState: function() {
        return {
            selectingRecipients: false,
        };
    },

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

    renderButtons: function(section) {
        var t = this.props.locale.translate;
        var options = this.props.options;
        if (section === 'main') {
            var addIssueProps = {
                label: t('option-add-issue'),
                selected: options.addIssue,
                hidden: false, // TODO
                onClick: this.handleAddIssueClick,
            };
            var sendBookmarkProps = {
                label: _.isEmpty(options.bookmarkRecipients)
                    ? t('option-send-bookmarks')
                    : t('option-send-bookmarks-to-$1-users', _.size(options.bookmarkRecipients)),
                selected: !_.isEmpty(options.bookmarkRecipients),
                onClick: this.handleSendBookmarkClick,
            };
            var hidePostProps = {
                label: t('option-hide-post'),
                selected: options.hidePost,
                onClick: this.handleHidePostClick,
            };
            return (
                <div className={section}>
                    <OptionButton {...addIssueProps} />
                    <OptionButton {...sendBookmarkProps} />
                    <OptionButton {...hidePostProps} />
                    {this.renderUserSelectionDialogBox()}
                </div>
            );
        } else if (section === 'supplemental') {
            var mediaProps = {
                label: t('option-show-media'),
                selected: options.supplementalEditor === 'media' || !options.supplementalEditor,
                onClick: this.handleShowMediaClick,
            };
            var previewProps = {
                label: t('option-show-preview'),
                selected: options.supplementalEditor === 'preview',
                onClick: this.handleShowPreviewClick,
            };
            return (
                <div className={section}>
                    <OptionButton {...mediaProps} />
                    <OptionButton {...previewProps} />
                </div>
            );
        }
    },

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

    triggerChangeEvent: function(options) {
        if (this.props.onChange) {
            this.props.onChange({
                type: 'change',
                target: this,
                options,
            });
        }
    },

    handleAddIssueClick: function(evt) {
        var options = _.clone(this.props.options);
        options.addIssue = !options.addIssue;
        this.triggerChangeEvent(options);
    },

    handleSendBookmarkClick: function(evt) {
        this.setState({ selectingRecipients: true });
    },

    handleHidePostClick: function(evt) {
        var options = _.clone(this.props.options);
        options.hidePost = !options.hidePost;
        this.triggerChangeEvent(options);
    },

    handleRecipientsSelect: function(evt) {
        var options = _.clone(this.props.options);
        options.bookmarkRecipients = evt.selection;
        this.triggerChangeEvent(options);
        this.setState({ selectingRecipients: false });
    },

    handleRecipientsCancel: function(evt) {
        this.setState({ selectingRecipients: false });
    },

    handleShowMediaClick: function(evt) {
        var options = _.clone(this.props.options);
        options.supplementalEditor = 'media';
        this.triggerChangeEvent(options);
    },

    handleShowPreviewClick: function(evt) {
        var options = _.clone(this.props.options);
        options.supplementalEditor = 'preview';
        this.triggerChangeEvent(options);
    },
});
