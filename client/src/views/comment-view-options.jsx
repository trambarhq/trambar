var _ = require('lodash');
var React = require('react'), PropTypes = React.PropTypes;
var Moment = require('moment');
var ReactionTypes = require('objects/types/reaction-types');

var Locale = require('locale/locale');
var Theme = require('theme/theme');

// widgets
var PopUpMenu = require('widgets/pop-up-menu');
var OptionButton = require('widgets/option-button');

require('./comment-view-options.scss');

module.exports = React.createClass({
    displayName: 'CommentViewOptions',
    propTypes: {
        access: PropTypes.oneOf([ 'read-only', 'read-comment', 'read-write' ]).isRequired,
        currentUser: PropTypes.object.isRequired,
        reaction: PropTypes.object.isRequired,
        story: PropTypes.object.isRequired,
        options: PropTypes.object.isRequired,

        locale: PropTypes.instanceOf(Locale),
        theme: PropTypes.instanceOf(Theme),
    },

    /**
     * Return intial state of component
     *
     * @return {Object}
     */
    getInitialState: function() {
        return {
            open: false
        };
    },

    /**
     * Return true if current user can perform write action
     *
     * @return {Boolean}
     */
    canWrite: function() {
        var access = this.props.access;
        return (access === 'read-write');
    },

    /**
     * Return true if current user can comment
     *
     * @return {Boolean}
     */
    canComment: function() {
        var access = this.props.access;
        return (access === 'read-comment' || access === 'read-write');
    },

    /**
     * Return true if reaction can be edited
     *
     * @return {Boolean}
     */
    canEditReaction: function() {
        if (!this.canComment()) {
            return false;
        }
        var reaction = this.props.reaction;
        var user = this.props.currentUser;
        if (_.includes(ReactionTypes.editable, reaction.type)) {
            if (reaction.user_id === user.id) {
                // allow editing for 3 days
                if (Moment() < Moment(reaction.ptime).add(3, 'day')) {
                    return true;
                }
            }
        }
        return false;
    },

    /**
     * Return true if comment can be edited
     *
     * @return {Boolean}
     */
    canRemoveReaction: function() {
        if (!this.canComment()) {
            return false;
        }
        var reaction = this.props.reaction;
        var story = this.props.story;
        var user = this.props.currentUser;
        if (user.type === 'admin') {
            return true;
        }
        if (reaction.user_id === user.id) {
            // allow removal for 3 days
            if (Moment() < Moment(reaction.ptime).add(3, 'day')) {
                return true;
            }
        }
        if (_.includes(story.user_ids, user.id)) {
            // allow removal by authors for 7 days
            if (Moment() < Moment(story.ptime).add(7, 'day')) {
                return true;
            }
        }
        return false;
    },

    /**
     * Return true if comment can be edited
     *
     * @return {Boolean}
     */
    canHideReaction: function() {
        if (!this.canWrite()) {
            return false;
        }
        var story = this.props.story;
        var user = this.props.currentUser;
        if (user.type !== 'guest') {
            if (user.type === 'admin') {
                return true;
            }
            if (_.includes(story.user_ids, user.id)) {
                return true;
            }
        }
        return false;
    },

    /**
     * Render component
     *
     * @return {ReactElement}
     */
    render: function() {
        var active = this.canEditReaction()
                  || this.canRemoveReaction()
                  || this.canHideReaction();
        var props = {
            className: 'comment-view-options',
            disabled: !active,
            popOut: true,
            onOpen: this.handleOpen,
            onClose: this.handleClose,
        };
        return (
            <PopUpMenu {...props}>
                <button>
                    <i className="fa fa-ellipsis-v" />
                </button>
                <menu>
                    {this.renderOptions()}
                </menu>
            </PopUpMenu>
        );
    },

    /**
     * Render options
     *
     * @return {ReactElement|null}
     */
    renderOptions: function() {
        if (!this.state.open) {
            return null;
        }
        var t = this.props.locale.translate;
        var options = this.props.options;
        var hideProps = {
            label: t('option-hide-comment'),
            hidden: !this.canHideReaction(),
            selected: options.hideReaction,
            onClick: this.handleHideClick,
        };
        var editProps = {
            label: t('option-edit-comment'),
            hidden: !this.canEditReaction(),
            selected: options.editReaction,
            onClick: this.handleEditClick,
        };
        var removeProps = {
            label: t('option-remove-comment'),
            hidden: !this.canRemoveReaction(),
            selected: options.removeReaction,
            onClick: this.handleRemoveClick,
        };
        return (
            <div className="view-options in-menu">
                <OptionButton {...hideProps} />
                <OptionButton {...editProps} />
                <OptionButton {...removeProps} />
            </div>
        );
    },

    /**
     * Inform parent component that options have been changed
     *
     * @param  {Object} options
     */
    triggerChangeEvent: function(options) {
        if (this.props.onChange) {
            this.props.onChange({
                type: 'change',
                target: this,
                options,
            });
        }
    },

    /**
     * Called when user opens the menu
     *
     * @param  {Object} evt
     */
    handleOpen: function(evt) {
        this.setState({ open: true });
    },

    /**
     * Called when user closes the menu
     *
     * @param  {Object} evt
     */
    handleClose: function(evt) {
        this.setState({ open: false });
    },

    /**
     * Called when user clicks on hide comment button
     *
     * @param  {Event} evt
     */
    handleHideClick: function(evt) {
        var options = _.clone(this.props.options);
        options.hideReaction = !options.hideReaction;
        this.triggerChangeEvent(options);
    },

    /**
     * Called when user clicks on edit comment button
     *
     * @param  {Event} evt
     */
    handleEditClick: function(evt) {
        var options = _.clone(this.props.options);
        options.editReaction = true;
        this.triggerChangeEvent(options);
    },

    /**
     * Called when user clicks on remove comment button
     *
     * @param  {Event} evt
     */
    handleRemoveClick: function(evt) {
        var options = _.clone(this.props.options);
        options.removeReaction = true;
        this.triggerChangeEvent(options);
    },
});
