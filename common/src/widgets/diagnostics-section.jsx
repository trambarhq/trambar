var React = require('react'), PropTypes = React.PropTypes;

var CollapsibleContainer = require('widgets/collapsible-container');

module.exports = React.createClass({
    displayName: 'DiagnosticsSection',
    propTypes: {
        label: PropTypes.string,
    },

    /**
     * Return initial state of component
     *
     * @return {Object}
     */
    getInitialState: function() {
        return {
            open: false
        };
    },

    /**
     * Render component
     *
     * @return {ReactElement}
     */
    render: function() {
        var className = 'diagnostics-section';
        if (this.state.open) {
            className += ' open';
        }
        return (
            <div className={className}>
                <div className="title" onClick={this.handleLabelClick}>
                    {this.props.label}
                </div>
                <CollapsibleContainer open={this.state.open}>
                    {this.props.children}
                </CollapsibleContainer>
            </div>
        );
    },

    /**
     * Called when user clicks label
     *
     * @param  {Event} evt
     */
    handleLabelClick: function(evt) {
        var open = !this.state.open;
        this.setState({ open });
    },
})
