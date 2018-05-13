var React = require('react');

require('./page-container.scss');

module.exports = React.createClass({
    displayName: 'PageContainer',

    setNode: function(node) {
        if (node) {
            var activeElement = document.activeElement;
            if (!activeElement || activeElement === document.body) {
                node.focus();
            }
        }
    },

    render: function() {
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
