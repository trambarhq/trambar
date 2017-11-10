var _ = require('lodash');
var Promise = require('bluebird');
var React = require('react'), PropTypes = React.PropTypes;

var Locale = require('locale/locale');
var Theme = require('theme/theme');

// mixins
var UpdateCheck = require('mixins/update-check');

// widgets
var ConfirmationDialogBox = require('dialogs/confirmation-dialog-box');

module.exports = React.createClass({
    displayName: 'ActionConfirmation',
    mixins: [ UpdateCheck ],
    propTypes: {
        locale: PropTypes.instanceOf(Locale).isRequired,
        theme: PropTypes.instanceOf(Theme).isRequired,
    },

    /**
     * Return initial state
     *
     * @return {Object}
     */
    getInitialState: function() {
        return {
            showing: false,
            rendering: false,
            message: null,
            resolve: null,
            promise: null,
        }
    },

    /**
     * Render component
     *
     * @return  {ReactElement|null}
     */
    render: function() {
        if (!this.state.rendering) {
            return null;
        }
        var t = this.props.locale.translate;
        var dialogProps = {
            show: this.state.showing,
            dangerous: true,
            locale: this.props.locale,
            theme: this.props.theme,
            onConfirm: this.handleConfirm,
            onCancel: this.handleCancel,
        };
        return (
            <ConfirmationDialogBox {...dialogProps}>
                {this.state.message}
            </ConfirmationDialogBox>
        )
    },

    /**
     * Show confirmation dialog with given message
     *
     * @param  {String|ReactElement} message
     * @param  {Boolean|undefined} bypass
     *
     * @return {Promise<Boolean>}
     */
    ask: function(message, bypass) {
        if (typeof(bypass) === 'boolean') {
            // return without user intervention if the result is provided
            if (this.state.promise) {
                var promise = this.state.promise;
                if (bypass) {
                    this.handleConfirm();
                } else {
                    this.handleCancel();
                }
                return promise;
            } else {
                return Promise.resolve(bypass);
            }
        }
        if (this.state.promise) {
            this.setState({ message });
        } else {
            var resolve;
            var promise = new Promise((f) => { resolve = f });
            this.setState({
                showing: true,
                rendering: true,
                message,
                resolve,
                promise,
            });
            return promise;
        }
    },

    /**
     * Ask a series of confirmation questions
     *
     * @param  {Array<String|ReactElement>} message
     * @param  {Array<Boolean|undefined>} bypass
     *
     * @return {Promise<Boolean>}
     */
    askSeries: function(messages, bypass) {
        return Promise.reduce(messages, (confirmed, message, index) => {
            if (!confirmed) {
                return false;
            }
            return this.ask(message, (bypass) ? bypass[index] : undefined);
        }, true);
    },

    /**
     * Called when user click confirms the action
     *
     * @param  {Object} evt
     */
    handleConfirm: function(evt) {
        var resolve = this.state.resolve;
        this.setState({
            showing: false,
            rendering: false,
            resolve: null,
            promise: null,
        }, () => {
            if (resolve) {
                resolve(true);
            }
        });
    },

    /**
     * Called when user cancels the action
     *
     * @param  {Object} evt
     */
    handleCancel: function(evt) {
        var resolve = this.state.resolve;
        this.setState({
            showing: false,
            resolve: null,
            promise: null
        }, () => {
            if (resolve) {
                resolve(false);
            }
            setTimeout(() => {
                if (!this.state.showing) {
                    this.setState({ rendering: false });
                }
            })
        });
    },
});
