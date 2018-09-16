import _ from 'lodash';
import React, { PureComponent } from 'react';

// widgets
import Overlay from 'widgets/overlay';
import PushButton from 'widgets/push-button';
import Scrollable from 'widgets/scrollable';
import OptionButton from 'widgets/option-button';

import './project-management-dialog-box.scss';

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
        let overlayProps = {
            show: this.props.show,
            onBackgroundClick: this.handleCancelClick,
        };
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
        return (
            <Scrollable>
                {_.map(this.props.projectLinks, this.renderProjectButton)}
            </Scrollable>
        );
    }

    /**
     * Render button for project
     *
     * @param  {Object} link
     * @param  {Number} index
     *
     * @return {ReactElement}
     */
    renderProjectButton(link, index) {
        let p = this.props.locale.pick;
        let props = {
            id: link.key,
            label: p(link.name),
            iconOn: 'times-circle',
            selected: _.includes(this.state.selection, link.key),
            onClick: this.handleProjectClick,
        };
        return <OptionButton key={index} {...props} />;
    }

    /**
     * Render cancel and OK buttons
     *
     * @return {ReactElement}
     */
    renderButtons() {
        let t = this.props.locale.translate;
        let cancelProps = {
            label: t('project-management-cancel'),
            onClick: this.handleCancelClick,
        };
        let removeProps = {
            label: t('project-management-remove'),
            onClick: this.handleRemoveClick,
            emphasized: true,
            disabled: _.isEmpty(this.state.selection),
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
        let key = evt.currentTarget.id;
        let selection = _.slice(this.state.selection);
        if (_.includes(selection, key)) {
            _.pull(selection, key);
        } else {
            selection.push(key);
        }
        this.setState({ selection });
    }

    /**
     * Called when user click remove button
     *
     * @param  {Event} evt
     */
    handleRemoveClick = (evt) => {
        if (this.props.onDelete) {
            this.props.onDelete({
                type: 'delete',
                target: this,
                selection: this.state.selection,
            })
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
    ProjectManagementDialogBox as default,
    ProjectManagementDialogBox,
};

import Route from 'routing/route';
import Environment from 'env/environment';

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
