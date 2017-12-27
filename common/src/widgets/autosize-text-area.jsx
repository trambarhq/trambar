var _ = require('lodash');
var React = require('react'), PropTypes = React.PropTypes;
var ComponentRefs = require('utils/component-refs');

require('./autosize-text-area.scss');

module.exports = React.createClass({
    displayName: 'AutosizeTextArea',
    propTypes: {
        autofocus: PropTypes.bool,
    },

    /**
     * Return default props
     *
     * @return {Object}
     */
    getDefaultProps: function() {
        return {
            autofocus: false
        };
    },

    /**
     * Return initial state of component
     *
     * @return {Object}
     */
    getInitialState: function() {
        this.components = ComponentRefs({
            actual: HTMLTextAreaElement,
            shadow: HTMLTextAreaElement,
        });
        return {
            requiredHeight: undefined,
        };
    },

    /**
     * Render component
     *
     * @return {ReactElement}
     */
    render: function() {
        var setters = this.components.setters;
        var style = _.extend({
            height: this.state.requiredHeight,
        }, this.props.style);
        var props = _.omit(this.props, 'style', 'autofocus');
        return (
            <div className="autosize-text-area">
                <textarea ref={setters.shadow} style={style} className="shadow" value={props.value} readOnly />
                <textarea ref={setters.actual} style={style} {...props} />
            </div>
        );
    },

    /**
     * Add resize handler and update height
     *
     * @return {[type]}
     */
    componentDidMount: function() {
        window.removeEventListener('resize', this.handleDocumentResize);
        this.updateSize();
        if (this.props.autofocus) {
            this.components.actual.focus();
        }
    },

    /**
     * Update height when value changes
     *
     * @param  {Object} prevProps
     * @param  {Object} prevState
     */
    componentDidUpdate: function(prevProps, prevState) {
        if (prevProps.value !== this.props.value) {
            this.updateSize();
        }
    },

    /**
     * Remove resize handler
     *
     * @return {[type]}
     */
    componentWillUnmount: function() {
        window.removeEventListener('resize', this.handleDocumentResize);
    },

    focus: function() {
        var actual = this.components.actual;
        if (actual) {
            actual.focus();
        }
    },

    updateSize: function() {
        var shadow = this.components.shadow;
        var actual = this.components.actual;
        if (!shadow || !actual) {
            return;
        }
        var oHeight = shadow.offsetHeight;
        var sHeight = shadow.scrollHeight;
        var cHeight = shadow.clientHeight;
        var aHeight = actual.offsetHeight;
        var requiredHeight = sHeight + (oHeight - cHeight);
        if (this.state.height !== requiredHeight) {
            if (aHeight > requiredHeight && aHeight > this.state.requiredHeight) {
                // don't apply the new height if it's the textarea is taller than
                // expected--i.e. the user has manually resized it
                return;
            }
            this.setState({ requiredHeight })
        }
    },

    /**
     * Called when user resizes the TEXTAREA
     *
     * @param  {Event} evt
     */
    handleResize: function(evt) {
        console.log('resize');
    },

    /**
     * Called when the browser window is resized
     *
     * @param  {Event} evt
     */
    handleDocumentResize: function(evt) {
        this.updateSize();
    }
});
