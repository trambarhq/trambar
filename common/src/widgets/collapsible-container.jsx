var React = require('react'), PropTypes = React.PropTypes;

require('./collapsible-container.scss');

module.exports = React.createClass({
    displayName: 'CollapsibleContainer',
    propTypes: {
        open: React.PropTypes.bool,
    },

    /**
     * Return initial state of component
     *
     * @return {Object}
     */
    getInitialState: function() {
        return {
            contentHeight: undefined,
        };
    },

    /**
     * Change state.hidden when props.open changes
     *
     * @param  {Object} nextProps
     */
    componentWillReceiveProps: function(nextProps) {
    },

    /**
     * Render component
     *
     * @return {ReactElement}
     */
    render: function() {
        var style = {};
        if (this.props.open) {
            style.height = this.state.contentHeight;
        } else {
            style.height = 0;
        }
        return (
            <div ref="container" className="collapsible-container" style={style}>
                <div ref="contents" className="collapsible-contents">
                    {this.props.children}
                </div>
            </div>
        );
    },

    componentDidMount: function() {
        if (this.props.open) {
            this.componentDidUpdate();
        }
    },

    componentDidUpdate: function(prevProps, prevState) {
        var contentHeight = getContentHeight(this.refs.contents);
        if (this.state.contentHeight !== contentHeight) {
            this.setState({ contentHeight });
        }
    },
});

function getContentHeight(div) {
    var height = div.offsetHeight;
    // find nexted collapsible containers
    var others = div.getElementsByClassName('collapsible-container');
    _.each(others, (other) => {
        // remove the container's current height
        height -= other.offsetHeight;
        // then add its eventual height when transition completes
        // (zero or height of its contents)
        if (parseInt(other.style.height) > 0) {
            var contents = other.children[0];
            height += contents.offsetHeight;
        }
    });
    return height;
}
