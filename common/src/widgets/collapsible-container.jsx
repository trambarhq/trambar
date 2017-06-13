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
                this.setState({ hidden: false });
            } else {
                // stop rendering the component after it has fully transitioned out
                setTimeout(() => {
                    if (!this.props.open) {
                        this.setState({ hidden: true });
                    }
                }, 1000);
            }
        }
    },

    /**
     * Render component
     *
     * @return {ReactElement}
     */
    render: function() {
        if (this.state.hidden) {
            return null;
        }
        var style = {};
        if (this.props.open) {
            style.height = this.getContentHeight();
        } else {
            style.height = 0;
        }
        var ref = this.setDOMNode;
        return (
            <div ref={ref} style={style} className="collapsible-container">
                {this.props.children}
            </div>
        );
    },

    /**
     * Call componentDidUpdate() to handle case where open is true initially
     */
    componentDidMount: function() {
        this.componentDidUpdate({}, { hidden: true });
    },

    /**
     * Render if the content height is different from the height set for the
     * container
     *
     * @param  {Object} prevProps
     * @param  {Object} prevState
     */
    componentDidUpdate: function(prevProps, prevState) {
        if (this.props.open) {
            if (this.domNode) {
                var styleHeight = parseInt(this.domNode.style.height);
                var contentHeight = this.getContentHeight();
                if (styleHeight !== contentHeight) {
                    this.forceUpdate();
                }
            }
        }
        if (this.state.hidden) {
            // DOM node is no longer in the tree
            this.domNode = null;
        }
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
