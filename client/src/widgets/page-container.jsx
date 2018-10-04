import React, { PureComponent } from 'react';

import './page-container.scss';

class PageContainer extends PureComponent {
    static displayName = 'PageContainer';

    setNode(node) {
        if (node) {
            let activeElement = document.activeElement;
            if (!activeElement || activeElement === document.body) {
                node.focus();
            }
        }
    }

    render() {
        let { className, children } = this.props;
        className = 'page-container' + ((className) ? ` ${className}` : '');
        return (
            <div className={className} tabIndex={0} ref={this.setNode}>
                <div className="contents">
                    {children}
                </div>
            </div>
        );
    }
}

export {
    PageContainer as default,
    PageContainer,
};
