var React = require('react'), PropTypes = React.PropTypes;

var Database = require('data/database');
var Payloads = require('transport/payloads');
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
        recommendations: PropTypes.arrayOf(PropTypes.object),
        recipients: PropTypes.arrayOf(PropTypes.object),
        currentUser: PropTypes.object.isRequired,
        pending: PropTypes.bool,

        database: PropTypes.instanceOf(Database).isRequired,
        payloads: PropTypes.instanceOf(Payloads).isRequired,
        route: PropTypes.instanceOf(Route).isRequired,
        locale: PropTypes.instanceOf(Locale).isRequired,
        theme: PropTypes.instanceOf(Theme).isRequired,

        onChange: PropTypes.func,
        onEdit: PropTypes.func,
        onBookmark: PropTypes.func,
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
        var nextState = {
            options: defaultOptions
        };
        this.updateOptions(nextState, this.props);
        return nextState;
    },

    componentWillReceiveProps: function(nextProps) {
        var nextState = _.clone(this.state);
        if (this.props.story !== nextProps.story || this.props.recommendations !== nextProps.recommendations) {
            this.updateOptions(nextState, nextProps);
        }
        var changes = _.pickBy(nextState, (value, name) => {
            return this.state[name] !== value;
        });
        if (!_.isEmpty(changes)) {
            this.setState(changes);
        }
    },

    /**
     * Update state.options based on props
     *
     * @param  {Object} nextState
     * @param  {Object} nextProps
     */
    updateOptions: function(nextState, nextProps) {
        var options = nextState.options = _.clone(nextState.options);
        options.hidePost = !nextProps.story.public;
        options.bookmarkRecipients = _.map(nextProps.recommendations, 'target_user_id');
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
            payloads: this.props.payloads,
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
     * @param  {String} path
     *
     * @return {Promise<Story>}
     */
    triggerChangeEvent: function(story, path) {
        if (this.props.onChange) {
            return this.props.onChange({
                type: 'change',
                target: this,
                story,
                path,
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
     * Ask parent component to add/remove bookmarks
     *
     * @param  {Story} story
     * @param  {Number} senderId,
     * @param  {Array<Number>} recipientIds
     *
     * @return {Promise<Array<Object>>}
     */
    triggerBookmarkEvent: function(story, senderId, recipientIds) {
        if (this.props.onBookmark) {
            return this.props.onBookmark({
                type: 'edit',
                target: this,
                story,
                senderId,
                recipientIds,
            });
        }
    },

    setOptions: function(options) {
        var before = this.state.options;
        this.setState({ options }, () => {
            if (options.editPost && !before.editPost) {
                this.triggerEditEvent();
            }
            if (!_.isEqual(options.bookmarkRecipients, before.bookmarkRecipients)) {
                var sender = this.props.currentUser;
                var story = this.props.story;
                this.triggerBookmarkEvent(story, sender.id, options.bookmarkRecipients);
            }
            if (options.hidePost !== before.hidePost) {
                var story = _.clone(this.props.story);
                story.public = !options.hidePost;
                this.triggerChangeEvent(story, 'public');
            }
        });
    },

    /**
     * Called when options are changed
     *
     * @param  {Object} evt
     */
    handleOptionsChange: function(evt) {
        this.setOptions(evt.options);
    },
});

var defaultOptions = {
    addIssue: false,
    hidePost: false,
    editPost: false,
    bookmarkRecipients: [],
};
