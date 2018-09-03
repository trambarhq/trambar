import _ from 'lodash';
import React, { PureComponent } from 'react';

// widgets
import Overlay from 'widgets/overlay';
import PushButton from 'widgets/push-button';
import Scrollable from 'widgets/scrollable';

import './system-description-dialog-box.scss';

class SystemDescriptionDialogBox extends PureComponent {
    static displayName = 'SystemDescriptionDialogBox';

    /**
     * Render component
     *
     * @return {ReactElement}
     */
    render() {
        var overlayProps = {
            show: this.props.show,
            onBackgroundClick: this.handleCloseClick,
        };
        return (
            <Overlay {...overlayProps}>
                <div className="system-description-dialog-box">
                    {this.renderText()}
                    {this.renderButtons()}
                </div>
            </Overlay>
        );
    }

    /**
     * Render description of system
     *
     * @return {ReactElement}
     */
    renderText() {
        var p = this.props.locale.pick;
        var system = this.props.system;
        var title = p(_.get(system, 'details.title'));
        var description = p(_.get(system, 'details.description'));
        return (
            <Scrollable>
                <div className="title">{title}</div>
                <div className="description">
                    {description}
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
        var t = this.props.locale.translate;
        var closeButtonProps = {
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
    handleCloseClick(evt) {
        if (this.props.onClose) {
            this.props.onClose({ type: 'cancel', target: this });
        }
    }
}

export {
    SystemDescriptionDialogBox as default,
    SystemDescriptionDialogBox,
};

import Locale from 'locale/locale';
import Theme from 'theme/theme';

if (process.env.NODE_ENV !== 'production') {
    const PropTypes = require('prop-types');

    SystemDescriptionDialogBox.propTypes = {
        show: PropTypes.bool,
        system: PropTypes.object.isRequired,

        locale: PropTypes.instanceOf(Locale).isRequired,
        theme: PropTypes.instanceOf(Theme).isRequired,

        onClose: PropTypes.func,
    };
}
