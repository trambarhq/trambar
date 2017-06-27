var React = require('react'), PropTypes = React.PropTypes;

var Database = require('data/database');
var Route = require('routing/route');
var Locale = require('locale/locale');
var Theme = require('theme/theme');

// widgets
var StorySection = require('widgets/story-section');
var UserSelectionDialogBox = require('dialogs/user-selection-dialog-box');

require('./story-editor-options.scss');

module.exports = React.createClass({
    displayName: 'StoryEditorOptions',
    propTypes: {
        story: PropTypes.object.isRequired,
        options: PropTypes.object.isRequired,

        database: PropTypes.instanceOf(Database).isRequired,
        route: PropTypes.instanceOf(Route).isRequired,
        locale: PropTypes.instanceOf(Locale).isRequired,
        theme: PropTypes.instanceOf(Theme).isRequired,

        onChange: PropTypes.func,
    },

    getInitialState: function() {
        return {
            selectingRecipients: false,
        };
    },

    render: function() {
        var t = this.props.locale.translate;
        return (
            <StorySection className="story-editor-options">
                <header>
                    <div className="button disabled">
                        <i className="fa fa-chevron-circle-right"/>
                        <span className="label">{t('story-options')}</span>
                    </div>
                </header>
                <body>
                    {this.renderButtons()}
                    {this.renderUserSelectionDialogBox()}
                </body>
            </StorySection>
        );
    },

    renderButtons: function() {
        var t = this.props.locale.translate;
        var options = this.props.options;
        var addIssueProps = {
            label: t('option-add-issue'),
            selected: options.addIssue,
            onClick: this.handleAddIssueClick,
        };
        var sendBookmarkProps = {
            label: options.bookmarkRecipients
                ? t('option-send-bookmarks-to-$1-users', options.bookmarkRecipients.length)
                : t('option-send-bookmarks'),
            selected: !!options.bookmarkRecipients,
            onClick: this.handleSendBookmarkClick,
        };
        var hidePostProps = {
            label: t('option-hide-post'),
            selected: options.hidePost,
            onClick: this.handleHidePostClick,
        };
        return (
            <ul>
                <Button {...addIssueProps} />
                <Button {...sendBookmarkProps} />
                <Button {...hidePostProps} />
            </ul>
        );
    },

    renderUserSelectionDialogBox: function() {
        var props = {
            show: this.state.selectingRecipients,
            selection: this.props.options.bookmarkRecipients || [],

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
        var userIds = evt.selection;
        if (!_.isEmpty(userIds)) {
            options.bookmarkRecipients = userIds;
        } else {
            delete options.bookmarkRecipients;
        }
        this.triggerChangeEvent(options);
        this.setState({ selectingRecipients: false });
    },

    handleRecipientsCancel: function(evt) {
        this.setState({ selectingRecipients: false });
    },
});

function Button(props) {
    if (props.hidden) {
        return null;
    }
    var classNames = [];
    var iconClassNames = [ 'fa' ];
    if (props.selected) {
        classNames.push('selected');
        iconClassNames.push('fa-check-circle');
    } else {
        iconClassNames.push('fa-circle-o');
    }
    if (props.disabled) {
        classNames.push('disabled');
    }
    return (
        <li className={classNames.join(' ')} onClick={!props.disabled ? props.onClick : null}>
            <i className={iconClassNames.join(' ')} />
            <span className="label">{props.label}</span>
        </li>
    )
}
