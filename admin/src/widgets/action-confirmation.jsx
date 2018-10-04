import _ from 'lodash';
import Promise from 'bluebird';
import React, { PureComponent } from 'react';

// widgets
import ConfirmationDialogBox from 'dialogs/confirmation-dialog-box';

class ActionConfirmation extends PureComponent {
    static displayName = 'ActionConfirmation';

    constructor(props) {
        super(props);
        this.state = {
            showing: false,
            rendering: false,
            message: null,
            resolve: null,
            promise: null,
        };
    }

    /**
     * Render component
     *
     * @return  {ReactElement|null}
     */
    render() {
        let { env } = this.props;
        let { showing, rendering, message } = this.state;
        let { t } = env.locale;
        if (!rendering) {
            return null;
        }
        let dialogProps = {
            show: showing,
            dangerous: true,
            env,
            onConfirm: this.handleConfirm,
            onCancel: this.handleCancel,
        };
        return (
            <ConfirmationDialogBox {...dialogProps}>
                {message}
            </ConfirmationDialogBox>
        )
    }

    /**
     * Show confirmation dialog with given message
     *
     * @param  {String|ReactElement} message
     * @param  {Boolean|undefined} bypass
     *
     * @return {Promise<Boolean>}
     */
    ask(message, bypass) {
        let { promise } = this.state;
        if (typeof(bypass) === 'boolean') {
            // return without user intervention if the result is provided
            if (promise) {
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
        if (promise) {
            this.setState({ message });
        } else {
            let resolve;
            promise = new Promise((f) => { resolve = f });
            this.setState({
                showing: true,
                rendering: true,
                message,
                resolve,
                promise,
            });
            return promise;
        }
    }

    /**
     * Ask a series of confirmation questions
     *
     * @param  {Array<String|ReactElement>} message
     * @param  {Array<Boolean|undefined>} bypass
     *
     * @return {Promise<Boolean>}
     */
    askSeries(messages, bypass) {
        return Promise.reduce(messages, (confirmed, message, index) => {
            if (!confirmed) {
                return false;
            }
            return this.ask(message, (bypass) ? bypass[index] : undefined);
        }, true);
    }

    /**
     * Called when user click confirms the action
     *
     * @param  {Object} evt
     */
    handleConfirm = (evt) => {
        let { resolve } = this.state;
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
    }

    /**
     * Called when user cancels the action
     *
     * @param  {Object} evt
     */
    handleCancel = (evt) => {
        let { resolve } = this.state;
        this.setState({
            showing: false,
            resolve: null,
            promise: null
        }, () => {
            if (resolve) {
                resolve(false);
            }
            setTimeout(() => {
                let { showing } = this.state;
                if (!showing) {
                    this.setState({ rendering: false });
                }
            })
        });
    }
}

export {
    ActionConfirmation as default,
    ActionConfirmation,
};

import Environment from 'env/environment';

if (process.env.NODE_ENV !== 'production') {
    const PropTypes = require('prop-types');

    ActionConfirmation.propTypes = {
        env: PropTypes.instanceOf(Environment).isRequired,
    };
}
