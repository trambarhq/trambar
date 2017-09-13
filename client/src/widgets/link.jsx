var _ = require('lodash');
var React = require('react'), PropTypes = React.PropTypes;

module.exports = React.createClass({
    displayName: 'Link',
    propTypes: {
        url: PropTypes.string,
    },

    /**
     * Return initial state of component
     *
     * @return {Object}
     */
    getInitialState: function() {
        return {
            hasFocus: false
        };
    },

    /**
     * Render component
     *
     * @return {ReactElement}
     */
    render: function() {
        var props = _.omit(this.props, 'url');
        if (this.props.url) {
            if (this.state.hasFocus) {
                props.href = this.props.url;
            } else {
                props['data-url'] = this.props.url;
            }
            if (props.tabIndex === undefined) {
                props.tabIndex = 0;
            }
        }
        props.onFocus = this.handleFocus;
        props.onBlur = this.handleBlur;
        return (
            <a {...props}>{this.props.children}</a>
        );
    },

    /**
     * Called when component gains keyboard focus
     *
     * @param  {Event} evt
     */
    handleFocus: function(evt) {
        this.setState({ hasFocus: true });
    },

    /**
     * Called when component loses keyboard focus
     *
     * @param  {Event} evt
     */
    handleBlur: function(evt) {
        this.setState({ hasFocus: false });
    },
});
