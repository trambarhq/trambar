import React, { useState, useImperativeHandle } from 'react';
import { useListener } from 'relaks';

// widgets
import { ConfirmationDialogBox } from '../dialogs/confirmation-dialog-box.jsx';

/**
 * Component that renders a confirmation dialog box.
 */
export const ActionConfirmation = React.forwardRef((props, ref) => {
  const { env } = props;
  const { t } = env.locale;
  const [ question, setQuestion ] = useState(null);

  useImperativeHandle(ref, () => {
    async function ask(message) {
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
    };
    return { ask };
  });

  const handleConfirm = useListener((evt) => {
    if (question) {
      setQuestion(null);
      question.resolve(true);
    }
  });
  const handleCancel = useListener((evt) => {
    if (question) {
      setQuestion(null);
      question.resolve(false);
    }
  });

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
});
