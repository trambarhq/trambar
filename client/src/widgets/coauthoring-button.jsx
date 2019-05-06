import _ from 'lodash';
import React, { PureComponent } from 'react';

// widgets
import HeaderButton from './header-button.jsx';
import UserSelectionDialogBox from '../dialogs/user-selection-dialog-box';

import './coauthoring-button.scss';

/**
 * Button for adding/removing co-authors from a story. The component is also
 * responsible for rendering the dialog box.
 *
 * @extends PureComponent
 */
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
        let { env, story, coauthoring } = this.props;
        let { t } = env.locale;
        let icon, label;
        if (coauthoring) {
            icon = 'minus-square';
            label = t('story-remove-yourself');
        } else {
            icon = 'plus-square';
            if (story.user_ids.length > 1) {
                label = t('story-add-remove-coauthor');
            } else {
                label = t('story-add-coauthor');
            }
        }
        return (
            <span className="coauthoring-button">
                <span onClick={this.handleClick}>
                    <i className={`fa fa-${icon}`} />
                    <span className="label">{label}</span>
                </span>
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
        let { database, route, env, story } = this.props;
        let { selecting } = this.state;
        let props = {
            show: selecting,
            selection: story.user_ids,
            disabled: _.slice(story.user_ids, 0, 1),
            database,
            route,
            env,
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
        let { coauthoring, onRemove } = this.props;
        if (coauthoring) {
            if (onRemove) {
                onRemove({
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
        let { onSelect } = this.props;
        if (onSelect) {
            onSelect({
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

import Database from 'common/data/database.mjs';
import Route from 'common/routing/route.mjs';
import Environment from 'common/env/environment.mjs';

if (process.env.NODE_ENV !== 'production') {
    const PropTypes = require('prop-types');

    CoauthoringButton.propTypes = {
        coauthoring: PropTypes.bool,
        story: PropTypes.object.isRequired,
        database: PropTypes.instanceOf(Database).isRequired,
        route: PropTypes.instanceOf(Route).isRequired,
        env: PropTypes.instanceOf(Environment).isRequired,

        onSelect: PropTypes.func,
        onRemove: PropTypes.func,
    };
}
