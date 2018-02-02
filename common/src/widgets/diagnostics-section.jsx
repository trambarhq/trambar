var React = require('react'), PropTypes = React.PropTypes;

var CollapsibleContainer = require('widgets/collapsible-container');

module.exports = React.createClass({
    displayName: 'DiagnosticsSection',
    propTypes: {
        label: PropTypes.string,
        hidden: PropTypes.bool,
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
     * @return {ReactElement|null}
     */
    render: function() {
        if (this.props.hidden) {
            return null;
        }
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
