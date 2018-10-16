import _ from 'lodash';
import Promise from 'bluebird';
import React, { PureComponent } from 'react';

// widgets
import Overlay from 'widgets/overlay';
import PushButton from 'widgets/push-button';
import TextField from 'widgets/text-field';

import './activation-dialog-box.scss';

/**
 * Dialog box for manually entering the activation code.
 *
 * @extends PureComponent
 */
class ActivationDialogBox extends PureComponent {
    static displayName = 'ActivationDialogBox';

    constructor(props) {
        super(props);
        this.state = {
            address: '',
            code: '',
            schema: '',
        };
    }

    /**
     * Render component
     *
     * @return {ReactElement}
     */
    render() {
        let { show, onCancel } = this.props;
        let overlayProps = { show, onBackgroundClick: onCancel };
        return (
            <Overlay {...overlayProps}>
                <div className="activation-dialog-box">
                    {this.renderForm()}
                    <div className="controls">
                        {this.renderButtons()}
                    </div>
                </div>
            </Overlay>
        );
    }

    /**
     * Render form
     *
     * @return {ReactElement}
     */
    renderForm() {
        return (
            <div className="container">
                {this.renderAddressInput()}
                {this.renderCodeInput()}
                {this.renderSchemaInput()}
            </div>
        );
    }

    /**
     * Render input for entering address
     *
     * @return {ReactElement}
     */
    renderAddressInput() {
        let { env } = this.props;
        let { address } = this.state;
        let { t } = env.locale;
        let props = {
            id: 'address',
            type: 'url',
            value: address,
            env,
            onChange: this.handleAddressChange,
        };
        return <TextField {...props}>{t('activation-address')}</TextField>;
    }

    /**
     * Render input for activation code
     *
     * @return {ReactElement}
     */
    renderCodeInput() {
        let { env } = this.props;
        let { code } = this.state;
        let { t } = env.locale;
        let props = {
            id: 'code',
            value: code,
            spellCheck: false,
            env,
            onChange: this.handleCodeChange,
        };
        return <TextField {...props}>{t('activation-code')}</TextField>;
    }

    /**
     * Render input for schema
     *
     * @return {ReactElement}
     */
    renderSchemaInput() {
        let { env } = this.props;
        let { schema } = this.state;
        let { t } = env.locale;
        let props = {
            id: 'schema',
            value: schema,
            spellCheck: false,
            env,
            onChange: this.handleSchemaChange,
        };
        return <TextField {...props}>{t('activation-schema')}</TextField>;
    }

    /**
     * Render buttons
     *
     * @return {ReactElement}
     */
    renderButtons() {
        let { env } = this.props;
        let { address, code, schema } = this.state;
        let { t } = env.locale;
        let acceptable = true;
        if (!/^[0-9A-F]{16}$/i.test(_.replace(code, /\s/g, ''))) {
            acceptable = false;
        }
        if (!/https?:\/\/\w+/.test(address)) {
            acceptable = false;
        }
        if (!/\w+/.test(schema)) {
            acceptable = false;
        }
        let cancelProps = {
            label: t('activation-cancel'),
            emphasized: false,
            onClick: this.handleCancelClick,
        };
        let confirmProps = {
            label: t('activation-ok'),
            emphasized: true,
            disabled: !acceptable,
            onClick: this.handleOKClick,
        };
        return (
            <div className="buttons">
                <div className="right">
                    <PushButton {...cancelProps} />
                    <PushButton {...confirmProps} />
                </div>
            </div>
        );
    }

    /**
     * Called when user clicks the cancel button
     *
     * @param  {Event} evt
     */
    handleCancelClick = (evt) => {
        let { onCancel } = this.props;
        if (onCancel) {
            onCancel({
                type: 'cancel',
                target: this,
            });
        }
    }

    /**
     * Called when user clicks the open button
     *
     * @param  {Event} evt
     */
    handleOKClick = (evt) => {
        let { onConfirm } = this.props;
        let { address, code, schema } = this.state;
        if (onConfirm) {
            onConfirm({
                type: 'close',
                target: this,
                address,
                code: _.replace(code, /\s+/g, ''),
                schema,
            });
        }
    }

    /**
     * Called when user changes the server address
     *
     * @param  {Event} evt
     */
    handleAddressChange = (evt) => {
        let address = evt.target.value;
        address = _.replace(address, /\s+/g, '');
        this.setState({ address });
    }

    /**
     * Called when user changes the activation code
     *
     * @param  {Event} evt
     */
    handleCodeChange = (evt) => {
        let code = evt.target.value;
        code = _.replace(_.toUpper(code), /[^0-9A-F ]/g, '');
        if (_.replace(code, /\s+/g, '').length <= 16) {
            this.setState({ code });
        }
    }

    /**
     * Called when user changes the schema
     *
     * @param  {Event} evt
     */
    handleSchemaChange = (evt) => {
        let schema = evt.target.value;
        schema = _.replace(schema, /[^\w\-]/g, '');
        schema = _.toLower(schema);
        this.setState({ schema });
    }
}

export {
    ActivationDialogBox as default,
    ActivationDialogBox,
};

import Environment from 'env/environment';

if (process.env.NODE_ENV !== 'production') {
    const PropTypes = require('prop-types');

    ActivationDialogBox.propTypes = {
        show: PropTypes.bool,

        env: PropTypes.instanceOf(Environment).isRequired,

        onConfirm: PropTypes.func,
        onCancel: PropTypes.func,
    };
}
