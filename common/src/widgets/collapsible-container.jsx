var React = require('react'), PropTypes = React.PropTypes;

require('./collapsible-container.scss');

module.exports = React.createClass({
    displayName: 'CollapsibleContainer',
    propTypes: {
        open: React.PropTypes.bool,
        children: React.PropTypes.element,
    },

    /**
     * Return initial state of component
     *
     * @return {Object}
     */
    getInitialState: function() {
        return {
            hidden: !this.props.open,
        };
    },

    /**
     * Change state.hidden when props.open changes
     *
     * @param  {Object} nextProps
     */
    componentWillReceiveProps: function(nextProps) {
        if (this.props.open != nextProps.open) {
            if (nextProps.open) {
                if (this.domNode.style.height === '') {
                    this.domNode.style.height = '0px';
                }
                this.setState({ hidden: false });
                setTimeout(() => {
                    var height = this.getContentHeight();
                    this.domNode.style.height = height + 'px';
                }, 0);
                setTimeout(() => {
                    if (this.props.open) {
                        this.domNode.style.height = '';
                    }
                }, 300);
            } else {
                if (this.domNode.style.height === '') {
                    var height = this.getContentHeight();
                    this.domNode.style.height = height + 'px';
                }
                setTimeout(() => {
                    this.domNode.style.height = '0px';
                }, 0);
                setTimeout(() => {
                    // stop rendering the component after it has fully transitioned out
                    if (!this.props.open) {
                        this.setState({ hidden: true });
                    }
                }, 300);
            }
        }
    },

    /**
     * Render component
     *
     * @return {ReactElement}
     */
    render: function() {
        return (
            <div ref={this.setDOMNode} className="collapsible-container">
                {!this.state.hidden ? this.props.children : null}
            </div>
        );
    },

    /**
     * Remove reference to DOM node when component unmounts
     */
    componentWillUnmount: function() {
        this.domNode = null;
    },

    /**
     * Set DOM node
     *
     * @param  {DOMElement} node
     */
    setDOMNode: function(node) {
        this.domNode = node;
    },

    /**
     * Return the offset height of the first element node
     *
     * @return {Number}
     */
    getContentHeight: function() {
        if (this.domNode) {
            var childNode = this.domNode.firstChild;
            if (childNode) {
                return childNode.offsetHeight;
            }
        }
        return 0;
    },
});
