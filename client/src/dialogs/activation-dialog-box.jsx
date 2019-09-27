import _ from 'lodash';
import React, { useState } from 'react';
import { useListener } from 'relaks';

// widgets
import { Overlay } from 'common/widgets/overlay.jsx';
import { PushButton } from '../widgets/push-button.jsx';
import { TextField } from '../widgets/text-field.jsx';

import './activation-dialog-box.scss';

/**
 * Dialog box for manually entering the activation code.
 */
function ActivationDialogBox(props) {
    const { env, show, onCancel, onConfirm } = props;
    const { t } = env.locale;
    const [ address, setAddress ] = useState('');
    const [ code, setCode ] = useState('');
    const [ schema, setSchema ] = useState('');

    const handleCancelClick = useListener((evt) => {
        if (onCancel) {
            onCancel({});
        }
    });
    const handleOKClick = useListener((evt) => {
        if (onConfirm) {
            const codeCleaned = _.replace(code, /\s+/g, '');
            onConfirm({ address, code: codeCleaned, schema });
        }
    });
    const handleAddressChange = useListener((evt) => {
        const address = _.replace(evt.target.value, /\s+/g, '');
        setAddress(address);
    });
    const handleCodeChange = useListener((evt) => {
        const code = _.replace(_.toUpper(evt.target.value), /[^0-9A-F ]/g, '');
        if (_.replace(code, /\s+/g, '').length <= 16) {
            setCode(code);
        }
    });
    const handleSchemaChange = useListener((evt) => {
        const schema = _.toLower(_.replace(evt.target.value, /[^\w\-]/g, ''));
        setSchema(schema);
    });

    const overlayProps = { show, onBackgroundClick: onCancel };
    return (
        <Overlay {...overlayProps}>
            <div className="activation-dialog-box">
                {renderForm()}
                <div className="controls">
                    {renderButtons()}
                </div>
            </div>
        </Overlay>
    );

    function renderForm() {
        return (
            <div className="container">
                {renderAddressInput()}
                {renderCodeInput()}
                {renderSchemaInput()}
            </div>
        );
    }

    function renderAddressInput() {
        const props = {
            id: 'address',
            type: 'url',
            value: address,
            env,
            onChange: handleAddressChange,
        };
        return <TextField {...props}>{t('activation-address')}</TextField>;
    }

    function renderCodeInput() {
        const props = {
            id: 'code',
            value: code,
            spellCheck: false,
            env,
            onChange: handleCodeChange,
        };
        return <TextField {...props}>{t('activation-code')}</TextField>;
    }

    function renderSchemaInput() {
        const props = {
            id: 'schema',
            value: schema,
            spellCheck: false,
            env,
            onChange: handleSchemaChange,
        };
        return <TextField {...props}>{t('activation-schema')}</TextField>;
    }

    function renderButtons() {
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
        const cancelProps = {
            label: t('activation-cancel'),
            emphasized: false,
            onClick: handleCancelClick,
        };
        const confirmProps = {
            label: t('activation-ok'),
            emphasized: true,
            disabled: !acceptable,
            onClick: handleOKClick,
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
}

export {
    ActivationDialogBox as default,
    ActivationDialogBox,
};
