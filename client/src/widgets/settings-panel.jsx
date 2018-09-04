import _ from 'lodash';
import React, { PureComponent } from 'react';

import './settings-panel.scss';

class SettingsPanel extends PureComponent {
    static displayName = 'SettingsPanel';

    render() {
        var className = 'settings-panel';
        if (this.props.className) {
            className += ` ${this.props.className}`;
        }
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
        var children = React.Children.toArray(this.props.children);
        var element = _.find(children, { type: tag });
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
