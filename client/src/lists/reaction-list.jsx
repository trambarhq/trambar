var _ = require('lodash');
var React = require('react'), PropTypes = React.PropTypes;
var ReactDOM = require('react-dom');
var Memoize = require('utils/memoize');
var ComponentRefs = require('utils/component-refs');
var Merger = require('data/merger');

var Database = require('data/database');
var Payloads = require('transport/payloads');
var Route = require('routing/route');
var Locale = require('locale/locale');
var Theme = require('theme/theme');

// mixins
var UpdateCheck = require('mixins/update-check');

// widgets
var ReactionView = require('views/reaction-view');
var ReactionEditor = require('editors/reaction-editor');
var SmartList = require('widgets/smart-list');

require('./reaction-list.scss');

module.exports = React.createClass({
    displayName: 'ReactionList',
    mixins: [ UpdateCheck ],
    propTypes: {
        access: PropTypes.oneOf([ 'read-only', 'read-comment', 'read-write' ]).isRequired,
        acceptNewReaction: PropTypes.bool,
        story: PropTypes.object.isRequired,
        reactions: PropTypes.arrayOf(PropTypes.object),
        respondents: PropTypes.arrayOf(PropTypes.object),
        repo: PropTypes.object,
        currentUser: PropTypes.object,
        selectedReactionId: PropTypes.number,

        database: PropTypes.instanceOf(Database).isRequired,
        payloads: PropTypes.instanceOf(Payloads).isRequired,
        route: PropTypes.instanceOf(Route).isRequired,
        locale: PropTypes.instanceOf(Locale).isRequired,
        theme: PropTypes.instanceOf(Theme).isRequired,

        onFinish: PropTypes.func,
        onSelectionClear: PropTypes.func,
    },

    /**
     * Return default props
     *
     * @return {Object}
     */
    getDefaultProps: function() {
        return {
            acceptNewReaction: false,
        };
    },

    /**
     * Return initial state of component
     *
     * @return {Object}
     */
    getInitialState: function() {
        this.components = ComponentRefs({
            editor: ReactionEditor,
        });
        return {
            hiddenReactionIds: [],
        };
    },

    /**
     * Render component
     *
     * @return {ReactElement}
     */
    render: function() {
        var reactions = sortReactions(this.props.reactions, this.props.currentUser);
        if (this.props.acceptNewReaction) {
            // see if there's an unpublished reaction belonging to the current user
            var hasUserDraft = _.some(this.props.reactions, (r) => {
                if (r.user_id === this.props.currentUser.id) {
                    if (!r.published) {
                        return true;
                    }
                }
            });
            if (!hasUserDraft) {
                // add editor for blank comment
                reactions.unshift(null);
            }
        }
        var anchorId = this.props.selectedReactionId;
        var props = {
            items: reactions,
            behind: 5,
            ahead: 10,
            anchor: (anchorId) ? `reaction-${anchorId}` : undefined,
            offset: 4,
            inverted: true,

            onIdentity: this.handleReactionIdentity,
            onRender: this.handleReactionRender,
            onAnchorChange: this.handleReactionAnchorChange,
            onBeforeAnchor: this.handleReactionBeforeAnchor,
        }
        return (
            <div className="reaction-list">
                <SmartList {...props} />
            </div>
        );
    },

    /**
     * Called when SmartList wants an item's id
     *
     * @param  {Object} evt
     *
     * @return {String}
     */
    handleReactionIdentity: function(evt) {
        // use a fixed id for the first editor, so we don't lose focus
        // when the new reaction acquires an id after being saved automatically
        if (!evt.item) {
            return 'reaction-top';
        }
        return `reaction-${evt.item.id}`;
    },

    /**
     * Called when SmartList wants to render an item
     *
     * @param  {Object} evt
     *
     * @return {ReactElement}
     */
    handleReactionRender: function(evt) {
        var setters = this.components.setters;
        var reaction = evt.item;
        var isUserDraft = false;
        var isNewComment = false;
        var selected = false;
        if (!reaction) {
            isUserDraft = true;
            isNewComment = true;
        } else {
            if (!reaction.published) {
                if (reaction.user_id === this.props.currentUser.id) {
                    isUserDraft = true;
                    if (!reaction.ptime) {
                        isNewComment = true;
                    }
                }
            }
            selected = (reaction.id === this.props.selectedReactionId);
        }
        if (isUserDraft) {
            // always use 0 as the key for new comment by current user, so
            // the keyboard focus isn't taken away when autosave occurs
            // (and the comment gains an id)
            var key = (isNewComment) ? 0 : reaction.id;
            var props = {
                selected,
                reaction,
                story: this.props.story,
                currentUser: this.props.currentUser,
                database: this.props.database,
                payloads: this.props.payloads,
                route: this.props.route,
                locale: this.props.locale,
                theme: this.props.theme,
                onFinish: this.props.onFinish,
            };
            return <ReactionEditor ref={setters.editor} key={key} {...props} />
        } else {
            var respondent = findRespondent(this.props.respondents, reaction);
            var props = {
                access: this.props.access,
                selected,
                reaction,
                respondent,
                story: this.props.story,
                repo: this.props.repo,
                currentUser: this.props.currentUser,
                database: this.props.database,
                route: this.props.route,
                locale: this.props.locale,
                theme: this.props.theme,
            };
            return <ReactionView key={reaction.id} {...props} />
        }
    },

    /**
     * Called when a different story is positioned at the top of the viewport
     *
     * @param  {Object} evt
     */
    handleReactionAnchorChange: function(evt) {
        var reactionId = _.get(evt.item, 'id');
        if (!reactionId || _.includes(this.state.hiddenReactionIds, reactionId)) {
            // clear the whole list as soon as one of them come into view
            // or if we've reach the bottom (where the reaction might be null)
            this.setState({ hiddenReactionIds: [] });
        }
        if (this.props.selectedReactionId && reactionId !== this.props.selectedReactionId) {
            if (this.props.onSelectionClear) {
                this.props.onSelectionClear({
                    type: 'selectionclear',
                    target: this,
                });
            }
        }
    },

    /**
     * Called when SmartList notice new items were rendered off screen
     *
     * @param  {Object} evt
     */
    handleReactionBeforeAnchor: function(evt) {
        var reactionIds = _.map(evt.items, 'id');
        var hiddenReactionIds = _.union(reactionIds, this.state.hiddenReactionIds);
        this.setState({ hiddenReactionIds });
    },

    /**
     * Set focus on editor
     */
    focus: function() {
        var editor = this.components.editor;
        if (editor) {
            editor.focus();
        }
    }
});

var sortReactions = Memoize(function(reactions, currentUser) {
    // reactions are positioned from bottom up
    // place reactions with later ptime at towards the front of the list
    var sortedReactions = _.orderBy(reactions, [ 'ptime', 'id' ], [ 'desc', 'desc' ]);
    var ownUnpublished = _.remove(sortedReactions, { user_id: currentUser, ptime: null });
    // move unpublished comment of current user to beginning, so it shows up
    // at the bottom
    _.each(ownUnpublished, (reaction) => {
        sortedReactions.unshift(reaction);
    });
    return sortedReactions;
});

var findRespondent = Memoize(function(users, reaction) {
    if (reaction) {
        return _.find(users, { id: reaction.user_id });
    } else {
        return null;
    }
});
