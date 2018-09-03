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
        if (!this.props.component) {
            return null;
        }
        var overlayProps = {
            show: this.props.show,
            onBackgroundClick: this.props.onClose,
        };
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
        var component = this.props.component;
        if (component.image) {
            return (
                <div className="picture">
                    <ResourceView resource={component.image} height={48} theme={this.props.theme} />
                </div>
            );
        } else {
            var icon = component.icon || {};
            var iconClassName = icon.class || 'fa-cubes';
            var style = {
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
        var p = this.props.locale.pick;
        var text = p(this.props.component.text);
        var elements = MarkGor.parse(text);
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
        var t = this.props.locale.translate;
        var closeButtonProps = {
            label: t('app-component-close'),
            emphasized: true,
            onClick: this.props.onClose,
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

import Locale from 'locale/locale';
import Theme from 'theme/theme';

if (process.env.NODE_ENV !== 'production') {
    const PropTypes = require('prop-types');

    AppComponentDialogBox.propTypes = {
        show: PropTypes.bool,
        component: PropTypes.object.isRequired,
        locale: PropTypes.instanceOf(Locale).isRequired,
        theme: PropTypes.instanceOf(Theme).isRequired,
        onClose: PropTypes.func,
    };
}
