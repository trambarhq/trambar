var React = require('react'), PropTypes = React.PropTypes;

require('collapsible-container.scss');

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
                    this.setState({ hidden: true });
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
     * Force component to rerender when state.hidden goes from false to true,
     * as height couldn't be determined without actual DOM elements
     *
     * @param  {Object} prevProps
     * @param  {Object} prevState
     */
    componentDidUpdate: function(prevProps, prevState) {
        if (prevState.hidden !== this.state.hidden) {
            if (prevState.hidden) {
                var height = this.getContentHeight();
                if (height > 0) {
                    this.forceUpdate();
                }
            } else {
                this.domNode = null;
            }
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
