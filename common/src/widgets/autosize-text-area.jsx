var _ = require('lodash');
var React = require('react'), PropTypes = React.PropTypes;
var ComponentRefs = require('utils/component-refs');

// mixins
var UpdateCheck = require('mixins/update-check');

require('./autosize-text-area.scss');

module.exports = React.createClass({
    displayName: 'AutosizeTextArea',
    mixins: [ UpdateCheck ],

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
     * Return the actual textarea element
     *
     * @return {HTMLTextAreaElement}
     */
    getElement: function() {
        return this.components.actual;
    },

    /**
     * Save caret position when we receive new text
     *
     * @param  {Object}
     */
    componentWillReceiveProps: function(nextProps) {
        if (this.props.value !== nextProps.value) {
            var el = this.components.actual;
            if (el && el === document.activeElement) {
                if (el.value !== nextProps.value) {
                    this.caretPosition = {
                        selectionStart: el.selectionStart,
                        selectionEnd: el.selectionEnd,
                        text: el.value,
                    };
                }
            }
        }
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
        var props = _.omit(this.props, 'style');
        return (
            <div className="autosize-text-area">
                <textarea ref={setters.shadow} style={style} className="shadow" value={props.value} readOnly />
                <textarea ref={setters.actual} style={style} {...props} />
            </div>
        );
    },

    /**
     * Add resize handler and update height
     */
    componentDidMount: function() {
        window.removeEventListener('resize', this.handleDocumentResize);
        this.updateSize();
    },

    /**
     * Update height when value changes
     *
     * @param  {Object} prevProps
     * @param  {Object} prevState
     */
    componentDidUpdate: function(prevProps, prevState) {
        if (this.caretPosition) {
            // restore cursor position, using text in front of and after the
            // cursor as anchors
            var el = this.components.actual;
            var startBefore = this.caretPosition.selectionStart;
            var endBefore = this.caretPosition.selectionEnd;
            var textBefore = this.caretPosition.text;
            var textAfter = this.props.value;
            var textPrecedingCaretBefore = textBefore.substring(0, startBefore);
            var textFollowingCaretBefore = textBefore.substring(endBefore);
            var textSelectedBefore = textBefore.substring(startBefore, endBefore);
            var startAfter, endAfter;
            if (_.startsWith(textAfter, textPrecedingCaretBefore)) {
                startAfter = startBefore;
            }
            if (_.endsWith(textAfter, textFollowingCaretBefore)) {
                endAfter = textAfter.length - textFollowingCaretBefore.length;
            }
            if (startAfter !== undefined && endAfter === undefined) {
                endAfter = startAfter + textSelectedBefore.length;
                if (endAfter > textAfter.length) {
                    endAfter = textAfter.length;
                }
            } else if (startAfter === undefined && endAfter !== undefined) {
                startAfter = endAfter - textSelectedBefore.length;
                if (startAfter < 0) {
                    startAfter = 0;
                }
            }
            if (startAfter !== undefined && endAfter !== undefined) {
                if (!textSelectedBefore) {
                    // don't select text when none was selected before
                    startAfter = endAfter;
                }
                el.selectionStart = startAfter;
                el.selectionEnd = endAfter;
            }
            this.caretPosition = null;
        }
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

    /**
     * Set focus
     */
    focus: function() {
        this.components.actual.focus();
    },

    /**
     * Update the size of the textarea
     */
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
        var requiredHeight = sHeight + (oHeight - cHeight) + 1;
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
