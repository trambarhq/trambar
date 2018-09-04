import React from 'react';

require('./page-container.scss');

module.exports = React.createClass({
    displayName: 'PageContainer',

    setNode(node) {
        if (node) {
            var activeElement = document.activeElement;
            if (!activeElement || activeElement === document.body) {
                node.focus();
            }
        }
    },

    render() {
        var className = 'page-container';
        if (this.props.className) {
            className += ' ' + this.props.className;
        }
        return (
            <div className={className} tabIndex={0} ref={this.setNode}>
                <div className="contents">
                    {this.props.children}
                </div>
            </div>
        );
    },
});
