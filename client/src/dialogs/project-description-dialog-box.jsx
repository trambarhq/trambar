import _ from 'lodash';
import React, { PureComponent } from 'react';

// widgets
import Overlay from 'widgets/overlay';
import PushButton from 'widgets/push-button';
import ResourceView from 'widgets/resource-view';
import Scrollable from 'widgets/scrollable';

import './project-description-dialog-box.scss';

class ProjectDescriptionDialogBox extends PureComponent {
    static displayName = 'ProjectDescriptionDialogBox';

    /**
     * Render component
     *
     * @return {ReactElement}
     */
    render() {
        let overlayProps = {
            show: this.props.show,
            onBackgroundClick: this.handleCloseClick,
        };
        return (
            <Overlay {...overlayProps}>
                <div className="project-description-dialog-box">
                    {this.renderText()}
                    {this.renderButtons()}
                </div>
            </Overlay>
        );
    }

    /**
     * Render description of project
     *
     * @return {ReactElement}
     */
    renderText() {
        let p = this.props.locale.pick;
        let project = this.props.project;
        let image = _.find(project.details.resources, { type: 'image' });
        return (
            <Scrollable>
                <div className="title">{p(project.details.title) || project.name}</div>
                <div className="description">
                    <div className="image">
                        <ResourceView resource={image} width={160} theme={this.props.theme} />
                    </div>
                    {p(project.details.description)}
                </div>
            </Scrollable>
        );
    }

    /**
     * Render buttons
     *
     * @return {ReactElement}
     */
    renderButtons() {
        let t = this.props.locale.translate;
        let closeButtonProps = {
            label: t('project-description-close'),
            emphasized: true,
            onClick: this.handleCloseClick,
        };
        return (
            <div className="buttons">
                <PushButton {...closeButtonProps} />
            </div>
        );
    }

    /**
     * Called when user click cancel or ok button or outside the dialog box
     *
     * @param  {Event} evt
     */
    handleCloseClick = (evt) => {
        if (this.props.onClose) {
            this.props.onClose({ type: 'cancel', target: this });
        }
    }
}

export {
    ProjectDescriptionDialogBox as default,
    ProjectDescriptionDialogBox,
};

import Environment from 'env/environment';

if (process.env.NODE_ENV !== 'production') {
    const PropTypes = require('prop-types');

    ProjectDescriptionDialogBox.propTypes = {
        show: PropTypes.bool,
        project: PropTypes.object.isRequired,

        env: PropTypes.instanceOf(Environment).isRequired,

        onClose: PropTypes.func,
    };
}
