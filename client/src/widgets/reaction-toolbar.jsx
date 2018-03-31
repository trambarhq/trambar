var _ = require('lodash');
var React = require('react'), PropTypes = React.PropTypes;

var Locale = require('locale/locale');
var Theme = require('theme/theme');

// widgets
var HeaderButton = require('widgets/header-button');

require('./reaction-toolbar.scss');

module.exports = React.createClass({
    displayName: 'ReactionToolbar',
    propTypes: {
        access: PropTypes.oneOf([ 'read-only', 'read-comment', 'read-write' ]),
        currentUser: PropTypes.object,
        reactions: PropTypes.arrayOf(PropTypes.object),
        respondents: PropTypes.arrayOf(PropTypes.object),
        addingComment: PropTypes.bool,
        disabled: PropTypes.bool,
        locale: PropTypes.instanceOf(Locale),
        theme: PropTypes.instanceOf(Theme),
        onAction: PropTypes.func,
    },

    /**
     * Return a 'like' reaction by the current user
     *
     * @return {Object|null}
     */
    getCurrentUserLike: function() {
        return _.find(this.props.reactions, {
            type: 'like',
            user_id: _.get(this.props.currentUser, 'id'),
        });
    },

    /**
     * Return comments by current user
     *
     * @return {Array<Object>}
     */
    getCurrentUserComments: function() {
        var userId = _.get(this.props.currentUser, 'id');
        return _.filter(this.props.reactions, (reaction) => {
            if (reaction.user_id === userId) {
                if (reaction.type === 'comment' || reaction.type === 'note') {
                    return true;
                }
            }
        });
    },

    /**
     * Render component
     *
     * @return {ReactElement}
     */
    render: function() {
        var t = this.props.locale.translate;
        var access = this.props.access;
        var canComment = (access === 'read-comment' || access === 'read-write');
        var likeButtonProps = {
            icon: 'thumbs-up',
            label: t('story-like'),
            hidden: !canComment,
            highlighted: !!this.getCurrentUserLike(),
            disabled: this.props.disabled,
            onClick: this.handleLikeClick,
        };
        var commentButtonProps = {
            icon: 'comment',
            label: t('story-comment'),
            hidden: !canComment,
            highlighted: !_.isEmpty(this.getCurrentUserComments()) || this.props.addingComment,
            disabled: this.props.disabled,
            onClick: this.handleCommentClick,
        };
        return (
            <div className="reaction-toolbar">
                <HeaderButton {...likeButtonProps} />
                <HeaderButton {...commentButtonProps} />
            </div>
        );
    },

    /**
     * Inform parent component that certain action should occur
     *
     * @param  {String} action
     * @param  {Object|undefined} props
     */
    triggerActionEvent: function(action, props) {
        if (this.props.onAction) {
            this.props.onAction(_.extend({
                type: 'action',
                target: this,
                action,
            }, props));
        }
    },

    /**
     * Called when user click on like button
     *
     * @param  {Event} evt
     */
    handleLikeClick: function(evt) {
        var like = this.getCurrentUserLike();
        if (like) {
            this.triggerActionEvent('like-remove', { like });
        } else {
            this.triggerActionEvent('like-add');
        }
    },

    /**
     * Called when user click on comment button
     *
     * @param  {Event} evt
     */
    handleCommentClick: function(evt) {
        this.triggerActionEvent('reaction-add');
    },

    /**
     * Called when user click on show button
     *
     * @param  {Event} evt
     */
    handleShowClick: function(evt) {
        this.triggerActionEvent('reaction-expand');
    },
});
