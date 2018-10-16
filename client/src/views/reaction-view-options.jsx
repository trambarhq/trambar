import _ from 'lodash';
import Moment from 'moment';
import React, { PureComponent } from 'react';
import * as UserUtils from 'objects/utils/user-utils';

// widgets
import PopUpMenu from 'widgets/pop-up-menu';
import OptionButton from 'widgets/option-button';

import './reaction-view-options.scss';

/**
 * Component that renders a pop-up menu used to alter options of reactions to
 * stories.
 *
 * @extends PureComponent
 */
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
        let { reaction, story, currentUser, access } = this.props;
        let active = false;
        if (UserUtils.canHideReaction(currentUser, story, reaction, access)) {
            active = true;
        }
        if (UserUtils.canEditReaction(currentUser, story, reaction, access)) {
            active = true;
        }
        if (UserUtils.canRemoveReaction(currentUser, story, reaction, access)) {
            active = true;
        }
        let props = {
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
        let { env, options, reaction, story, currentUser, access } = this.props;
        let { open } = this.state;
        let { t } = env.locale;
        if (!open) {
            return null;
        }
        let hideProps = {
            label: t('option-hide-comment'),
            hidden: !UserUtils.canHideReaction(currentUser, story, reaction, access),
            selected: options.hideReaction,
            onClick: this.handleHideClick,
        };
        let editProps = {
            label: t('option-edit-comment'),
            hidden: !UserUtils.canEditReaction(currentUser, story, reaction, access),
            selected: options.editReaction,
            onClick: this.handleEditClick,
        };
        let removeProps = {
            label: t('option-remove-comment'),
            hidden: !UserUtils.canRemoveReaction(currentUser, story, reaction, access),
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
        let { onChange } = this.props;
        if (onChange) {
            onChange({
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
        let { options } = this.props;
        options = _.clone(options);
        options.hideReaction = !options.hideReaction;
        this.triggerChangeEvent(options);
    }

    /**
     * Called when user clicks on edit comment button
     *
     * @param  {Event} evt
     */
    handleEditClick = (evt) => {
        let { options } = this.props;
        options = _.clone(options);
        options.editReaction = true;
        this.triggerChangeEvent(options);
    }

    /**
     * Called when user clicks on remove comment button
     *
     * @param  {Event} evt
     */
    handleRemoveClick = (evt) => {
        let { options } = this.props;
        options = _.clone(options);
        options.removeReaction = true;
        this.triggerChangeEvent(options);
    }
}

export {
    ReactionViewOptions as default,
    ReactionViewOptions,
};

import Environment from 'env/environment';

if (process.env.NODE_ENV !== 'production') {
    const PropTypes = require('prop-types');

    ReactionViewOptions.propTypes = {
        access: PropTypes.oneOf([ 'read-only', 'read-comment', 'read-write' ]).isRequired,
        currentUser: PropTypes.object.isRequired,
        reaction: PropTypes.object.isRequired,
        story: PropTypes.object.isRequired,
        options: PropTypes.object.isRequired,

        env: PropTypes.instanceOf(Environment).isRequired,
    };
}
