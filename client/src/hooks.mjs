import _ from 'lodash';
import { useState, useMemo, useRef, useCallback } from 'react';
import { useSaveBuffer, Cancellation } from 'relaks';

function useConfirmation() {
    const confirmationRef = useRef();
    const confirm = useCallback(async (question, cancelable) => {
        const { ask } = confirmationRef.current;
        const confirmed = await ask(question, cancelable);
        if (!confirmed) {
            throw new Cancellation;
        }
    });
    return [ confirmationRef, confirm ];
}

function useDialogHandling() {
    const [ open, setOpen ] = useState(false);
    const handleOpen = useCallback(() => {
        setOpen(true);
    });
    const handleClose = useCallback(() => {
        setOpen(false);
    });
    return [ open, handleOpen, handleClose ];
}

function useDraftBuffer(active, additionalParams) {
    const draft = useSaveBuffer({
        compare: _.isEqual,
        reset: !active,
        ...additionalParams,
    });
    draft.getCurrent = function(key, def) {
        return _.get(this.current, key, def);
    };
    draft.getOriginal = function(key, def) {
        return _.get(this.original, key, def);
    };
    draft.get = draft.getCurrent;
    draft.update = function(key, value) {
        this.set(_.decoupleSet(this.current, key, value));
    };
    draft.toggle = function(key) {
        const value = this.get(key);
        this.update(key, value ? undefined : true);
    };
    return draft;
}

export {
    useConfirmation,
    useDialogHandling,
    useDraftBuffer,
};
