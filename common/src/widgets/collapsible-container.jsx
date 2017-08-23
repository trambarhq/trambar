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
            // set the container height manually
            var contents = this.refs.contents;
            var container = this.refs.container;
            var contentHeight = contents.offsetHeight;
            container.style.height = contentHeight + 'px';
            this.state.contentHeight = contentHeight;
        }
    },

    componentDidUpdate: function(prevProps, prevState) {
        var contents = this.refs.contents;
        var contentHeight = contents.offsetHeight;
        if (this.state.contentHeight !== contentHeight) {
            this.setState({ contentHeight });
        }
    },
});
