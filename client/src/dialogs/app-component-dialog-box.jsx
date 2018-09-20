import React, { PureComponent } from 'react';
import MarkGor from 'mark-gor/react';

// widgets
import Overlay from 'widgets/overlay';
import PushButton from 'widgets/push-button';
import ResourceView from 'widgets/resource-view';

import './app-component-dialog-box.scss';

class AppComponentDialogBox extends PureComponent {
    static displayName = 'AppComponentDialogBox';

    /**
     * Render component
     *
     * @return {ReactElement}
     */
    render() {
        let { component, show, onClose } = this.props;
        if (!component) {
            return null;
        }
        let overlayProps = { show, onBackgroundClick: onClose };
        return (
            <Overlay {...overlayProps}>
                <div className="app-component-dialog-box">
                    <div className="contents">
                        {this.renderPicture()}
                        {this.renderText()}
                    </div>
                    {this.renderButtons()}
                </div>
            </Overlay>
        );
    }

    /**
     * Render icon or image
     *
     * @return {ReactElement}
     */
    renderPicture() {
        let { env, component } = this.props;
        if (component.image) {
            return (
                <div className="picture">
                    <ResourceView resource={component.image} height={48} env={env} />
                </div>
            );
        } else {
            let icon = component.icon || {};
            let iconClassName = icon.class || 'fa-cubes';
            let style = {
                color: icon.color,
                backgroundColor: icon.backgroundColor,
            };
            return (
                <div className="picture">
                    <div className="icon" style={style}>
                        <i className={`fa fa-fw ${iconClassName}`} />
                    </div>
                </div>
            );
        }
    }

    /**
     * Render text description of component, formatted as Markdown
     *
     * @return {ReactElement}
     */
    renderText() {
        let { env, component } = this.props;
        let { p } = env.locale;
        let text = p(component.text);
        let elements = MarkGor.parse(text);
        return (
            <div className="text">
                {elements}
            </div>
        );
    }

    /**
     * Render buttons
     *
     * @return {ReactElement}
     */
    renderButtons() {
        let { env, onClose } = this.props;
        let { t } = env.locale;
        let closeButtonProps = {
            label: t('app-component-close'),
            emphasized: true,
            onClick: onClose,
        };
        return (
            <div className="buttons">
                <PushButton {...closeButtonProps} />
            </div>
        );
    }
}

export {
    AppComponentDialogBox as default,
    AppComponentDialogBox,
};

import Environment from 'env/environment';

if (process.env.NODE_ENV !== 'production') {
    const PropTypes = require('prop-types');

    AppComponentDialogBox.propTypes = {
        show: PropTypes.bool,
        component: PropTypes.object.isRequired,
        env: PropTypes.instanceOf(Environment).isRequired,
        onClose: PropTypes.func,
    };
}
