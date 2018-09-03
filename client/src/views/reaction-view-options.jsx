import _ from 'lodash';
import Moment from 'moment';
import React, { PureComponent } from 'react';
import UserUtils from 'objects/utils/user-utils';

// widgets
import PopUpMenu from 'widgets/pop-up-menu';
import OptionButton from 'widgets/option-button';

import './reaction-view-options.scss';

class ReactionViewOptions extends PureComponent {
    static displayName = 'ReactionViewOptions';

    constructor(props) {
        super(props);
        this.state = {
            open: false
        };
    }

    /**
     * Render component
     *
     * @return {ReactElement}
     */
    render() {
        var access = this.props.access;
        var user = this.props.currentUser;
        var story = this.props.story;
        var reaction = this.props.reaction;
        var active = false;
        if (UserUtils.canHideReaction(user, story, reaction, access)) {
            active = true;
        }
        if (UserUtils.canEditReaction(user, story, reaction, access)) {
            active = true;
        }
        if (UserUtils.canRemoveReaction(user, story, reaction, access)) {
            active = true;
        }
        var props = {
            className: 'reaction-view-options',
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
    }

    /**
     * Render options
     *
     * @return {ReactElement|null}
     */
    renderOptions() {
        if (!this.state.open) {
            return null;
        }
        var t = this.props.locale.translate;
        var options = this.props.options;
        var access = this.props.access;
        var user = this.props.currentUser;
        var story = this.props.story;
        var reaction = this.props.reaction;
        var hideProps = {
            label: t('option-hide-comment'),
            hidden: !UserUtils.canHideReaction(user, story, reaction, access),
            selected: options.hideReaction,
            onClick: this.handleHideClick,
        };
        var editProps = {
            label: t('option-edit-comment'),
            hidden: !UserUtils.canEditReaction(user, story, reaction, access),
            selected: options.editReaction,
            onClick: this.handleEditClick,
        };
        var removeProps = {
            label: t('option-remove-comment'),
            hidden: !UserUtils.canRemoveReaction(user, story, reaction, access),
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
    }

    /**
     * Inform parent component that options have been changed
     *
     * @param  {Object} options
     */
    triggerChangeEvent(options) {
        if (this.props.onChange) {
            this.props.onChange({
                type: 'change',
                target: this,
                options,
            });
        }
    }

    /**
     * Called when user opens the menu
     *
     * @param  {Object} evt
     */
    handleOpen = (evt) => {
        this.setState({ open: true });
    }

    /**
     * Called when user closes the menu
     *
     * @param  {Object} evt
     */
    handleClose = (evt) => {
        this.setState({ open: false });
    }

    /**
     * Called when user clicks on hide comment button
     *
     * @param  {Event} evt
     */
    handleHideClick = (evt) => {
        var options = _.clone(this.props.options);
        options.hideReaction = !options.hideReaction;
        this.triggerChangeEvent(options);
    }

    /**
     * Called when user clicks on edit comment button
     *
     * @param  {Event} evt
     */
    handleEditClick = (evt) => {
        var options = _.clone(this.props.options);
        options.editReaction = true;
        this.triggerChangeEvent(options);
    }

    /**
     * Called when user clicks on remove comment button
     *
     * @param  {Event} evt
     */
    handleRemoveClick = (evt) => {
        var options = _.clone(this.props.options);
        options.removeReaction = true;
        this.triggerChangeEvent(options);
    }
}

export {
    ReactionViewOptions as default,
    ReactionViewOptions,
};

import Locale from 'locale/locale';
import Theme from 'theme/theme';

if (process.env.NODE_ENV !== 'production') {
    const PropTypes = require('prop-types');

    ReactionViewOptions.propTypes = {
        access: PropTypes.oneOf([ 'read-only', 'read-comment', 'read-write' ]).isRequired,
        currentUser: PropTypes.object.isRequired,
        reaction: PropTypes.object.isRequired,
        story: PropTypes.object.isRequired,
        options: PropTypes.object.isRequired,

        locale: PropTypes.instanceOf(Locale),
        theme: PropTypes.instanceOf(Theme),
    };
}
