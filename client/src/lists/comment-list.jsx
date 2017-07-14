var _ = require('lodash');
var React = require('react'), PropTypes = React.PropTypes;
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
var OnDemand = require('widgets/on-demand');
var CommentView = require('views/comment-view');
var CommentEditor = require('editors/comment-editor');

require('./comment-list.scss');

module.exports = React.createClass({
    displayName: 'CommentList',
    mixins: [ UpdateCheck ],
    propTypes: {
        showingEditor: PropTypes.bool,
        story: PropTypes.object.isRequired,
        reactions: PropTypes.arrayOf(PropTypes.object),
        respondents: PropTypes.arrayOf(PropTypes.object),
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
                {this.renderReactions()}
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
                reactions.push(null);
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
        if (!reaction) {
            isUserDraft = true;
        } else if (!reaction.published) {
            if (reaction.user_id === this.props.currentUser.id) {
                isUserDraft = true;
            }
        }
        if (isUserDraft) {
            return this.renderEditor(reaction, index === list.length - 1);
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
        var tempCopy = findTemporaryCopy(this.props.reactions, reaction);
        var props = {
            reaction,
            respondent,
            beingEdited: !!tempCopy,
            currentUser: this.props.currentUser,
            locale: this.props.locale,
            theme: this.props.theme,
            key: reaction.id,
        };
        return <CommentView {...props} />
    },

    /**
     * Render coment editor
     *
     * @param  {Reaction} reaction
     * @param  {Boolean} last
     *
     * @return {ReactElement|null}
     */
    renderEditor: function(reaction, last) {
        var tempCopy = findTemporaryCopy(this.props.reactions, reaction);
        var props = {
            reaction,
            story: this.props.story,
            currentUser: this.props.currentUser,
            database: this.props.database,
            payloads: this.props.payloads,
            route: this.props.route,
            locale: this.props.locale,
            theme: this.props.theme,
            key: (last) ? 0 : reaction.id,
            ref: (last) ? 'last' : undefined,
            onFinish: this.props.onFinish,
        };
        return <CommentEditor {...props} />
    },

    /**
     * Set keyboard focus on last editor
     *
     * @return {[type]}
     */
    focus: function() {
        var component = this.refs.last;
        if (component) {
            component.focus();
        }
    },
});

var sortReactions = Memoize(function(reactions, currentUser) {
    // move published comment of current user to bottom
    var ownByUser = (r) => {
        return r.user_id === currentUser;
    };
    return _.orderBy(reactions,
        [ 'published', 'ptime', ownByUser, 'id' ],
        [ 'desc',      'asc',   'asc',     'asc' ]
    );
});

var findTemporaryCopy = Memoize(function(reactions, reaction) {
    if (reaction) {
        return _.find(reactions, { published_version_id: reaction.id });
    } else {
        return null;
    }
});

var findRespondent = Memoize(function(users, reaction) {
    if (reaction) {
        return _.find(users, { id: reaction.user_id });
    } else {
        return null;
    }
});
