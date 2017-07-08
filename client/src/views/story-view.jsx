var React = require('react'), PropTypes = React.PropTypes;

var Database = require('data/database');
var Route = require('routing/route');
var Locale = require('locale/locale');
var Theme = require('theme/theme');

// mixins
var UpdateCheck = require('mixins/update-check');

// widgets
var StoryContents = require('views/story-contents');
var StoryComments = require('views/story-comments');
var StoryViewOptions = require('views/story-view-options');
var CornerPopUp = require('widgets/corner-pop-up');

require('./story-view.scss');

module.exports = React.createClass({
    displayName: 'StoryView',
    mixins: [ UpdateCheck ],
    propTypes: {
        story: PropTypes.object.isRequired,
        authors: PropTypes.arrayOf(PropTypes.object),
        reactions: PropTypes.arrayOf(PropTypes.object),
        respondents: PropTypes.arrayOf(PropTypes.object),
        currentUser: PropTypes.object.isRequired,
        pending: PropTypes.bool,

        database: PropTypes.instanceOf(Database).isRequired,
        route: PropTypes.instanceOf(Route).isRequired,
        locale: PropTypes.instanceOf(Locale).isRequired,
        theme: PropTypes.instanceOf(Theme).isRequired,

        onChange: PropTypes.func,
        onEdit: PropTypes.func,
    },

    /**
     * Return default props
     *
     * @return {Object}
     */
    getDefaultProps: function() {
        return {
            pending: false,
        };
    },

    /**
     * Return initial state of component
     *
     * @return {Object}
     */
    getInitialState: function() {
        return {
            options: defaultOptions
        }
    },

    /**
     * Render component
     *
     * @return {ReactElement}
     */
    render: function() {
        //console.log(`Rending ${this.props.story.id}`)
        if (this.props.theme.mode === 'columns-1') {
            return (
                <div className="story-view columns-1">
                    {this.renderContents()}
                    {this.renderComments()}
                </div>
            );
        } else if (this.props.theme.mode === 'columns-2') {
            return (
                <div className="story-view columns-2">
                    <div className="column-1">
                        {this.renderContents()}
                    </div>
                    <div className="column-2">
                        {this.renderComments()}
                    </div>
                </div>
            );
        } else if (this.props.theme.mode === 'columns-3') {
            return (
                <div className="story-view columns-3">
                    <div className="column-1">
                        {this.renderContents()}
                    </div>
                    <div className="column-2">
                        {this.renderComments()}
                    </div>
                    <div className="column-3">
                        {this.renderOptions()}
                    </div>
                </div>
            );
        }
    },

    /**
     * Render the main contents, including media attached to story
     *
     * @return {ReactElement}
     */
    renderContents: function() {
        var props = {
            story: this.props.story,
            authors: this.props.authors,
            pending: this.props.pending,
            cornerPopUp: this.renderPopUpMenu('main'),

            database: this.props.database,
            route: this.props.route,
            locale: this.props.locale,
            theme: this.props.theme,
        };
        return <StoryContents {...props} />;
    },

    /**
     * Render comments panel
     *
     * @return {ReactElement}
     */
    renderComments: function() {
        var props = {
            story: this.props.story,
            reactions: this.props.reactions,
            respondents: this.props.respondents,
            currentUser: this.props.currentUser,

            database: this.props.database,
            route: this.props.route,
            locale: this.props.locale,
            theme: this.props.theme,
        };
        return <StoryComments {...props} />;
    },

    /**
     * Render popup menu containing options for given section
     *
     * @param  {String} section
     *
     * @return {ReactElement}
     */
    renderPopUpMenu: function(section) {
        if (this.props.theme.mode === 'columns-3') {
            return null;
        }
        return (
            <CornerPopUp>
                {this.renderOptions(true, section)}
            </CornerPopUp>
        );
    },

    /**
     * Render options pane or simply the list of options when it's in a menu
     *
     * @param  {Boolean} inMenu
     * @param  {String} section
     *
     * @return {ReactElement}
     */
    renderOptions: function(inMenu, section) {
        var props = {
            inMenu,
            section,
            story: this.props.story,
            currentUser: this.props.currentUser,
            options: this.state.options,

            database: this.props.database,
            route: this.props.route,
            locale: this.props.locale,
            theme: this.props.theme,

            onChange: this.handleOptionsChange,
            onEdit: this.props.onEdit,
        };
        return <StoryViewOptions {...props} />;
    },

    /**
     * Ask parent component to change a story
     *
     * @param  {Story} story
     *
     * @return {Promise<Story>}
     */
    triggerChangeEvent: function(story) {
        if (this.props.onChange) {
            return this.props.onChange({
                type: 'change',
                target: this,
                story
            });
        }
    },

    /**
     * Ask parent component to begin editing of a published story
     *
     * @return {Promise<Story>}
     */
    triggerEditEvent: function() {
        if (this.props.onEdit) {
            return this.props.onEdit({
                type: 'edit',
                target: this,
                story: this.props.story
            });
        }
    },

    /**
     * Called when options are changed
     *
     * @param  {Object} evt
     */
    handleOptionsChange: function(evt) {
        var optionsBefore = this.state.options;
        var options = evt.options;
        this.setState({ options }, () => {
            if (!optionsBefore.editPost && options.editPost) {
                this.triggerEditEvent();
            }
        });
    },
});

var defaultOptions = {
    addIssue: false,
    hidePost: false,
    editPost: false,
    bookmarkRecipients: [],
};
