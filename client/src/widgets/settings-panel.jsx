import _ from 'lodash';
import React, { PureComponent, Children } from 'react';

import './settings-panel.scss';

class SettingsPanel extends PureComponent {
    static displayName = 'SettingsPanel';

    render() {
        let { className } = this.props;
        className = 'settings-panel' + ((className) ? ` ${className}` : '');
        return (
            <div className={className}>
                {this.renderPart('header')}
                {this.renderPart('subheader')}
                {this.renderPart('body')}
                {this.renderPart('footer')}
            </div>
        );
    }

    renderPart(tag) {
        let { children } = this.props;
        children = Children.toArray(children);
        let element = _.find(children, { type: tag });
        if (!element) {
            return null;
        }
        return (
            <div className={tag} {...element.props}>
                {element.props.children}
            </div>
        );
    }
}

export {
    SettingsPanel as default,
    SettingsPanel,
};
