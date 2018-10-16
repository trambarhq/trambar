import React, { PureComponent } from 'react';

import './page-container.scss';

/**
 * Container holding a page's contents.
 *
 * @extends PureComponent
 */
class PageContainer extends PureComponent {
    static displayName = 'PageContainer';

    setNode(node) {
        if (node) {
            let activeElement = document.activeElement;
            if (!activeElement || activeElement === document.body) {
                // set focus so that arrow keys can be used to scroll the page
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
