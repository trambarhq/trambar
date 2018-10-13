import _ from 'lodash';
import React, { PureComponent } from 'react';
import ComponentRefs from 'utils/component-refs';

import './autosize-text-area.scss';

/**
 * A text area that automatically expands its height to accommodate the text
 * within it.
 *
 * @extends {PureComponent}
 */
class AutosizeTextArea extends PureComponent {
    static displayName = 'AutosizeTextArea';

    constructor(props) {
        super(props);
        this.components = ComponentRefs({
            actual: HTMLTextAreaElement,
            shadow: HTMLTextAreaElement,
        });
        this.state = {
            requiredHeight: undefined,
        };
    }

    /**
     * Return the actual textarea element
     *
     * @return {HTMLTextAreaElement}
     */
    getElement() {
        return this.components.actual;
    }

    /**
     * Save caret position when we receive new text
     *
     * @param  {Object}
     */
    componentWillReceiveProps(nextProps) {
        let { value } = this.props;
        let { actual } = this.components;
        if (nextProps.value !== value) {
            if (actual && actual === document.activeElement) {
                if (actual.value !== nextProps.value) {
                    this.caretPosition = {
                        selectionStart: actual.selectionStart,
                        selectionEnd: actual.selectionEnd,
                        text: actual.value,
                    };
                }
            }
        }
    }

    /**
     * Render component
     *
     * @return {ReactElement}
     */
    render() {
        let { style } = this.props;
        let { requiredHeight } = this.state;
        let { setters } = this.components;
        style = _.extend({ height: requiredHeight }, style);
        let props = _.omit(this.props, 'style');
        return (
            <div className="autosize-text-area">
                <textarea ref={setters.shadow} style={style} className="shadow" value={props.value} readOnly />
                <textarea ref={setters.actual} style={style} {...props} />
            </div>
        );
    }

    /**
     * Add resize handler and update height
     */
    componentDidMount() {
        window.removeEventListener('resize', this.handleDocumentResize);
        this.updateSize();
    }

    /**
     * Update height when value changes
     *
     * @param  {Object} prevProps
     * @param  {Object} prevState
     */
    componentDidUpdate(prevProps, prevState) {
        let { value } = this.props;
        let { actual } = this.components;
        if (this.caretPosition) {
            // restore cursor position, using text in front of and after the
            // cursor as anchors
            let startBefore = this.caretPosition.selectionStart;
            let endBefore = this.caretPosition.selectionEnd;
            let textBefore = this.caretPosition.text;
            let textAfter = value;
            let textPrecedingCaretBefore = textBefore.substring(0, startBefore);
            let textFollowingCaretBefore = textBefore.substring(endBefore);
            let textSelectedBefore = textBefore.substring(startBefore, endBefore);
            let startAfter, endAfter;
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
                actual.selectionStart = startAfter;
                actual.selectionEnd = endAfter;
            }
            this.caretPosition = null;
        }
        if (prevProps.value !== value) {
            this.updateSize();
        }
    }

    /**
     * Remove resize handler
     *
     * @return {[type]}
     */
    componentWillUnmount() {
        window.removeEventListener('resize', this.handleDocumentResize);
    }

    /**
     * Set focus
     */
    focus() {
        this.components.actual.focus();
    }

    /**
     * Update the size of the textarea
     */
    updateSize() {
        let { height, requiredHeight } = this.state;
        let { shadow, actual } = this.components;
        if (!shadow || !actual) {
            return;
        }
        let oHeight = shadow.offsetHeight;
        let sHeight = shadow.scrollHeight;
        let cHeight = shadow.clientHeight;
        let aHeight = actual.offsetHeight;
        let requiredHeightAfter = sHeight + (oHeight - cHeight) + 1;
        if (height !== requiredHeightAfter) {
            if (aHeight > requiredHeightAfter && aHeight > requiredHeight) {
                // don't apply the new height if it's the textarea is taller than
                // expected--i.e. the user has manually resized it
                return;
            }
            this.setState({ requiredHeight: requiredHeightAfter });
        }
    }

    /**
     * Called when user resizes the TEXTAREA
     *
     * @param  {Event} evt
     */
    handleResize = (evt) => {
    }

    /**
     * Called when the browser window is resized
     *
     * @param  {Event} evt
     */
    handleDocumentResize = (evt) => {
        this.updateSize();
    }
}

export {
    AutosizeTextArea as default,
    AutosizeTextArea,
};
