import _ from 'lodash';
import React, { PureComponent } from 'react';

// widgets
import Overlay from 'common/widgets/overlay.jsx';
import PushButton from '../widgets/push-button.jsx';
import Scrollable from '../widgets/scrollable.jsx';
import OptionButton from '../widgets/option-button.jsx';

import './project-management-dialog-box.scss';

/**
 * Dialog box for removing a project from the list.
 *
 * @extends PureComponent
 */
class ProjectManagementDialogBox extends PureComponent {
    static displayName = 'ProjectManagementDialogBox';

    constructor(props) {
        super(props);
        this.state = {
            selection: [],
        };
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
                <div className="project-management-dialog-box">
                    {this.renderList()}
                    {this.renderButtons()}
                </div>
            </Overlay>
        );
    }

    /**
     * Render list of users
     *
     * @return {Array<ReactElement>}
     */
    renderList() {
        let { projectLinks } = this.props;
        return (
            <Scrollable>
            {
                _.map(projectLinks, (projectLink, i) => {
                    return this.renderProjectButton(projectLink, i);
                })
            }
            </Scrollable>
        );
    }

    /**
     * Render button for project
     *
     * @param  {Object} link
     * @param  {Number} i
     *
     * @return {ReactElement}
     */
    renderProjectButton(link, i) {
        let { env } = this.props;
        let { selection } = this.state;
        let { p } = env.locale;
        let props = {
            id: link.key,
            label: p(link.name),
            iconOn: 'times-circle',
            selected: _.includes(selection, link.key),
            onClick: this.handleProjectClick,
        };
        return <OptionButton key={i} {...props} />;
    }

    /**
     * Render cancel and OK buttons
     *
     * @return {ReactElement}
     */
    renderButtons() {
        let { env } = this.props;
        let { selection } = this.state;
        let { t } = env.locale;
        let cancelProps = {
            label: t('project-management-cancel'),
            onClick: this.handleCancelClick,
        };
        let removeProps = {
            label: t('project-management-remove'),
            onClick: this.handleRemoveClick,
            emphasized: true,
            disabled: _.isEmpty(selection),
        };
        return (
            <div className="buttons">
                <PushButton {...cancelProps} />
                <PushButton {...removeProps} />
            </div>
        );
    }

    /**
     * Called when user clicks
     *
     * @param  {Event} evt
     */
    handleProjectClick = (evt) => {
        let { selection } = this.state;
        let key = evt.currentTarget.id;
        if (_.includes(selection, key)) {
            selection = _.without(selection, key);
            _.pull(selection, key);
        } else {
            selection = _.concat(selection, key);
        }
        this.setState({ selection });
    }

    /**
     * Called when user click remove button
     *
     * @param  {Event} evt
     */
    handleRemoveClick = (evt) => {
        let { onDelete } = this.props;
        let { selection } = this.state;
        if (onDelete) {
            onDelete({
                type: 'delete',
                target: this,
                selection,
            })
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
    ProjectManagementDialogBox as default,
    ProjectManagementDialogBox,
};

import Route from 'common/routing/route.mjs';
import Environment from 'common/env/environment.mjs';

if (process.env.NODE_ENV !== 'production') {
    const PropTypes = require('prop-types');

    ProjectManagementDialogBox.propTypes = {
        show: PropTypes.bool,
        projectLinks: PropTypes.arrayOf(PropTypes.object).isRequired,
        route: PropTypes.instanceOf(Route).isRequired,
        env: PropTypes.instanceOf(Environment).isRequired,
        onDelete: PropTypes.func,
        onCancel: PropTypes.func,
    };
}
