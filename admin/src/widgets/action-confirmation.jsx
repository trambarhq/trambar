import React, { useState, useImperativeHandle, useCallback } from 'react';

// widgets
import ConfirmationDialogBox from '../dialogs/confirmation-dialog-box.jsx';

/**
 * Component that renders a confirmation dialog box.
 */
function ActionConfirmation(props, ref) {
    const { env } = props;
    const [ question, setQuestion ] = useState(null);

    useImperativeHandle(ref, () => {
        return {
            ask: async (message) => {
                let promise, resolve;
                if (question) {
                    promise = question.promise;
                    resolve = question.resolve;
                } else {
                    promise = new Promise((f) => { resolve = f });
                }
                const newQuestion = {
                    message,
                    promise,
                    resolve,
                };
                setQuestion(newQuestion);
                return promise;
            },
        };
    });

    const handleConfirm = useCallback((evt) => {
        if (question) {
            setQuestion(null);
            question.resolve(true);
        }
    }, [ question ]);
    const handleCancel = useCallback((evt) => {
        if (question) {
            setQuestion(null);
            question.resolve(false);
        }
    }, [ question ]);

    const { t } = env.locale;
    const dialogProps = {
        show: !!question,
        dangerous: true,
        env,
        onConfirm: handleConfirm,
        onCancel: handleCancel,
    };
    return (
        <ConfirmationDialogBox {...dialogProps}>
            {question ? question.message : undefined}
        </ConfirmationDialogBox>
    )
}

const component = React.forwardRef(ActionConfirmation);

export {
    component as default,
    component as ActionConfirmation,
};
