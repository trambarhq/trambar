import _ from 'lodash';
import React, { PureComponent } from 'react';

// widgets
import Overlay from 'widgets/overlay';
import PushButton from 'widgets/push-button';
import Scrollable from 'widgets/scrollable';
import UserSelectionList from 'lists/user-selection-list';

import './user-selection-dialog-box.scss';

class UserSelectionDialogBox extends PureComponent {
    static displayName = 'UserSelectionDialogBox';

    constructor(props) {
        let { selection } = props;
        super(props);
        this.state = {
            selection,
        };
    }

    /**
     * Update selection in state if necessary
     *
     * @param  {Object} nextProps
     */
    componentWillReceiveProps(nextProps) {
        let { selection } = this.props;
        if (nextProps.selection !== selection) {
            this.setState({ selection: nextProps.selection });
        }
    }

    /**
     * Render component
     *
     * @return {ReactElement}
     */
    render() {
        let { show } = this.props;
        let overlayProps = { show, onBackgroundClick: this.handleCancelClick };
        return (
            <Overlay {...overlayProps}>
                <div className="user-selection-dialog-box">
                    {this.renderList()}
                    {this.renderButtons()}
                </div>
            </Overlay>
        );
    }

    /**
     * Render list of users
     *
     * @return {ReactElement}
     */
    renderList() {
        let { database, route, env, disabled } = this.props;
        let { selection } = this.state;
        let listProps = {
            selection,
            disabled,
            database,
            route,
            env,
            onSelect: this.handleListSelect,
        };
        return (
            <Scrollable>
                <UserSelectionList {...listProps} />
            </Scrollable>
        );
    }

    /**
     * Render cancel and OK buttons
     *
     * @return {ReactElement}
     */
    renderButtons() {
        let { env } = this.props;
        let { t } = env.locale;
        let cancelButtonProps = {
            label: t('selection-cancel'),
            onClick: this.handleCancelClick,
        };
        let okButtonProps = {
            label: t('selection-ok'),
            onClick: this.handleOKClick,
            emphasized: true,
        };
        return (
            <div className="buttons">
                <PushButton {...cancelButtonProps} />
                <PushButton {...okButtonProps} />
            </div>
        );
    }

    /**
     * Called when user select or unselect another user
     *
     * @param  {Object} evt
     */
    handleListSelect = (evt) => {
        let { selection } = this.state;
        if (!_.isEqual(selection, evt.selection)) {
            selection = evt.selection;
            this.setState({ selection });
        }
    }

    /**
     * Called when user click OK button
     *
     * @param  {Event} evt
     */
    handleOKClick = (evt) => {
        let { onSelect } = this.props;
        let { selection } = this.state;
        if (onSelect) {
            onSelect({
                type: 'select',
                target: this,
                selection,
            });
        }
    }

    /**
     * Called when user click cancel button or outside the dialog box
     *
     * @param  {Event} evt
     */
    handleCancelClick = (evt) => {
        let { onCancel } = this.props;
        if (onCancel) {
            onCancel({
                type: 'cancel',
                target: this,
            });
        }
    }
}

export {
    UserSelectionDialogBox as default,
    UserSelectionDialogBox,
};

import Database from 'data/database';
import Route from 'routing/route';
import Environment from 'env/environment';

if (process.env.NODE_ENV !== 'production') {
    const PropTypes = require('prop-types');

    UserSelectionDialogBox.propTypes = {
        show: PropTypes.bool,
        selection: PropTypes.arrayOf(PropTypes.number).isRequired,
        disabled: PropTypes.arrayOf(PropTypes.number),

        database: PropTypes.instanceOf(Database).isRequired,
        route: PropTypes.instanceOf(Route).isRequired,
        env: PropTypes.instanceOf(Environment).isRequired,

        onSelect: PropTypes.func,
        onCancel: PropTypes.func,
    };
}
