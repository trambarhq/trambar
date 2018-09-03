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
        super(props);
        this.state = {
            selection: this.props.selection,
        };
    }

    /**
     * Update selection in state if necessary
     *
     * @param  {Object} nextProps
     */
    componentWillReceiveProps(nextProps) {
        if (this.props.selection !== nextProps.selection) {
            this.setState({ selection: nextProps.selection });
        }
    }

    /**
     * Render component
     *
     * @return {ReactElement}
     */
    render() {
        var overlayProps = {
            show: this.props.show,
            onBackgroundClick: this.handleCancelClick,
        };
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
        var listProps = {
            selection: this.state.selection,
            disabled: this.props.disabled,

            database: this.props.database,
            route: this.props.route,
            locale: this.props.locale,
            theme: this.props.theme,

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
        var t = this.props.locale.translate;
        var cancelButtonProps = {
            label: t('selection-cancel'),
            onClick: this.handleCancelClick,
        };
        var okButtonProps = {
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
        var selection = evt.selection;
        if (_.isEqual(selection, this.props.selection)) {
            selection = this.props.selection;
        }
        this.setState({ selection });
    }

    /**
     * Called when user click OK button
     *
     * @param  {Event} evt
     */
    handleOKClick = (evt) => {
        if (this.props.onSelect) {
            this.props.onSelect({
                type: 'select',
                target: this,
                selection: this.state.selection,
            });
        }
    }

    /**
     * Called when user click cancel button or outside the dialog box
     *
     * @param  {Event} evt
     */
    handleCancelClick = (evt) => {
        if (this.props.onCancel) {
            this.props.onCancel({
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
import Locale from 'locale/locale';
import Theme from 'theme/theme';

if (process.env.NODE_ENV !== 'production') {
    const PropTypes = require('prop-types');

    UserSelectionDialogBox.propTypes = {
        show: PropTypes.bool,
        selection: PropTypes.arrayOf(PropTypes.number).isRequired,
        disabled: PropTypes.arrayOf(PropTypes.number),

        database: PropTypes.instanceOf(Database).isRequired,
        route: PropTypes.instanceOf(Route).isRequired,
        locale: PropTypes.instanceOf(Locale).isRequired,
        theme: PropTypes.instanceOf(Theme).isRequired,

        onSelect: PropTypes.func,
        onCancel: PropTypes.func,
    };
}
