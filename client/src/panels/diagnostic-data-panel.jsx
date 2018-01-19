var _ = require('lodash');
var Promise = require('bluebird');
var React = require('react'), PropTypes = React.PropTypes;

// widgets
var SettingsPanel = require('widgets/settings-panel');
var Diagnostics = require('widgets/diagnostics');

require('./diagnostic-data-panel.scss');

module.exports = React.createClass({
    displayName: 'DiagnosticDataPanel',
    propTypes: {
        type: PropTypes.string.isRequired,
        title: PropTypes.string.isRequired,
    },

    /**
     * Return initial state of component
     *
     * @return {Object}
     */
    getInitialState: function() {
        return {
            contents: Diagnostics.get(this.props.type),
        };
    },

    /**
     * Render component if content is available
     *
     * @return {ReactElement}
     */
    render: function() {
        if (!this.state.contents) {
            return null;
        }
        return (
            <SettingsPanel className="diagnostic-data">
                <header>
                    <i className="fa fa-gear" /> {this.props.title}
                </header>
                <body>
                    {this.state.contents}
                </body>
            </SettingsPanel>
        );
    },

    /**
     * Add change handler
     */
    componentDidMount: function() {
        Diagnostics.addListener(this.handleChange);
    },

    /**
     * Remove change handler
     */
    componentWillUnmount: function() {
        Diagnostics.removeListener(this.handleChange);
    },

    /**
     * Called when diagnostic data has changed
     */
    handleChange: function() {
        var contents = Diagnostics.get(this.props.type);
        if (this.state.contents !== contents) {
            this.setState({ contents });
        }
    },
});
