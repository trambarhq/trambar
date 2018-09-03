import _ from 'lodash';
import React, { PureComponent } from 'react';
import DeviceManager from 'media/device-manager';

// widgets
import HeaderButton from 'widgets/header-button';
import UserSelectionDialogBox from 'dialogs/user-selection-dialog-box';

import './coauthoring-button.scss';

class CoauthoringButton extends PureComponent {
    static displayName = 'CoauthoringButton';

    constructor(props) {
        super(props);
        this.state = {
            selecting: false,
        };
    }

    /**
     * Render component
     *
     * @return {ReactElement}
     */
    render() {
        var t = this.props.locale.translate;
        var icon, label;
        if (this.props.coauthoring) {
            icon = 'minus-square';
            label = t('story-remove-yourself');
        } else {
            icon = 'plus-square';
            if (this.props.story.user_ids.length > 1) {
                label = t('story-add-remove-coauthor');
            } else {
                label = t('story-add-coauthor');
            }
        }
        return (
            <span className="coauthoring-button" onClick={this.handleClick}>
                <i className={`fa fa-${icon}`} />
                <span className="label">{label}</span>
                {this.renderDialogBox()}
            </span>
        );
    }

    /**
     * Render dialog box for selecting co-authors
     *
     * @return {ReactElement}
     */
    renderDialogBox() {
        var props = {
            show: this.state.selecting,
            selection: this.props.story.user_ids,
            disabled: _.slice(this.props.story.user_ids, 0, 1),
            database: this.props.database,
            route: this.props.route,
            locale: this.props.locale,
            theme: this.props.theme,

            onSelect: this.handleSelect,
            onCancel: this.handleCancel,
        };
        return <UserSelectionDialogBox {...props} />;
    }

    /**
     * Called when user clicks the button
     *
     * @param  {Event} evt
     */
    handleClick = (evt) => {
        if (this.props.coauthoring) {
            if (this.props.onRemove) {
                this.props.onRemove({
                    type: 'remove',
                    target: this,
                });
            }
        } else {
            this.setState({ selecting: true });
        }
    }

    /**
     * Called when user clicks the x or outside the modal
     *
     * @param  {Event} evt
     */
    handleCancel = (evt) => {
        this.setState({ selecting: false });
    }

    /**
     * Called when user selects a user from the list
     *
     * @param  {Object} evt
     */
    handleSelect = (evt) => {
        if (this.props.onSelect) {
            this.props.onSelect({
                type: 'select',
                target: this,
                selection: evt.selection
            });
        }
        this.setState({ selecting: false });
    }
}

export {
    CoauthoringButton as default,
    CoauthoringButton,
};

import Database from 'data/database';
import Route from 'routing/route';
import Locale from 'locale/locale';
import Theme from 'theme/theme';

if (process.env.NODE_ENV !== 'production') {
    const PropTypes = require('prop-types');

    CoauthoringButton.propTypes = {
        coauthoring: PropTypes.bool,
        story: PropTypes.object.isRequired,
        database: PropTypes.instanceOf(Database).isRequired,
        route: PropTypes.instanceOf(Route).isRequired,
        locale: PropTypes.instanceOf(Locale).isRequired,
        theme: PropTypes.instanceOf(Theme).isRequired,

        onSelect: PropTypes.func,
        onRemove: PropTypes.func,
    };
}
