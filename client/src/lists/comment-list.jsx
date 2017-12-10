var _ = require('lodash');
var React = require('react'), PropTypes = React.PropTypes;
var ReactDOM = require('react-dom');
var Memoize = require('utils/memoize');
var Merger = require('data/merger');

var Database = require('data/database');
var Payloads = require('transport/payloads');
var Route = require('routing/route');
var Locale = require('locale/locale');
var Theme = require('theme/theme');

// mixins
var UpdateCheck = require('mixins/update-check');

// widgets
var CommentView = require('views/comment-view');
var CommentEditor = require('editors/comment-editor');
var Scrollable = require('widgets/scrollable');

require('./comment-list.scss');

module.exports = React.createClass({
    displayName: 'CommentList',
    mixins: [ UpdateCheck ],
    propTypes: {
        access: PropTypes.oneOf([ 'read-only', 'read-comment', 'read-write' ]).isRequired,
        showingEditor: PropTypes.bool,
        story: PropTypes.object.isRequired,
        reactions: PropTypes.arrayOf(PropTypes.object),
        respondents: PropTypes.arrayOf(PropTypes.object),
        repo: PropTypes.object,
        currentUser: PropTypes.object,

        database: PropTypes.instanceOf(Database).isRequired,
        payloads: PropTypes.instanceOf(Payloads).isRequired,
        route: PropTypes.instanceOf(Route).isRequired,
        locale: PropTypes.instanceOf(Locale).isRequired,
        theme: PropTypes.instanceOf(Theme).isRequired,

        onFinish: PropTypes.func,
    },

    /**
     * Return default props
     *
     * @return {Object}
     */
    getDefaultProps: function() {
        return {
            showingEditor: true
        };
    },

    /**
     * Render component
     *
     * @return {ReactElement}
     */
    render: function() {
        return (
            <div className="comment-list">
                <Scrollable>
                    {this.renderReactions()}
                </Scrollable>
            </div>
        );
    },

    /**
     * Render reactions
     *
     * @return {Array<ReactElement}
     */
    renderReactions: function() {
        var reactions = sortReactions(this.props.reactions, this.props.currentUser);
        // remove temporary copies
        reactions = _.filter(reactions, (r) => {
            return !r.published_version_id;
        });
        if (this.props.showEditor) {
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
        return _.map(reactions, this.renderReaction);
    },

    /**
     * Render a reaction
     *
     * @param  {Reaction|null} reaction
     * @param  {Number} index
     * @param  {Array} list
     *
     * @return {ReactElement|null}
     */
    renderReaction: function(reaction, index, list) {
        var isUserDraft = false;
        var isNewComment = false;
        if (!reaction) {
            isUserDraft = true;
            isNewComment = true;
        } else if (!reaction.published) {
            if (reaction.user_id === this.props.currentUser.id) {
                isUserDraft = true;
                if (!reaction.ptime) {
                    isNewComment = true;
                }
            }
        }
        if (isUserDraft) {
            return this.renderEditor(reaction, isNewComment);
        } else {
            return this.renderView(reaction);
        }
    },

    /**
     * Render comment view
     *
     * @type {ReactElement}
     */
    renderView: function(reaction) {
        var respondent = findRespondent(this.props.respondents, reaction);
        var props = {
            access: this.props.access,
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
        return <CommentView key={reaction.id} {...props} />
    },

    /**
     * Render coment editor
     *
     * @param  {Reaction} reaction
     * @param  {Boolean} isNewComment
     *
     * @return {ReactElement|null}
     */
    renderEditor: function(reaction, isNewComment) {
        // always use 0 as the key for new comment by current user, so
        // the keyboard focus isn't taken away when autosave occurs
        // (and the comment gains an id)
        var key = (isNewComment) ? 0 : reaction.id;
        var props = {
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
        return <CommentEditor key={key} {...props} />
    },

    /**
     * Direct keyboard focus to newly created textarea
     *
     * @param  {Object} prevProps
     * @param  {Object} prevState
     */
    componentDidUpdate: function(prevProps, prevState) {
        var node = ReactDOM.findDOMNode(this);
        var textAreas = node.getElementsByTagName('TEXTAREA');
        textAreas = _.filter(textAreas, { readOnly: false });
        var newTextArea = _.first(_.difference(textAreas, this.textAreas));
        if (newTextArea) {
            newTextArea.focus();
        }
        this.textAreas = textAreas;
    },
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
