import _ from 'lodash';
import { useState, useMemo, useRef, useCallback } from 'react';
import { useLatest, useAfterglow, useConfirmation, useSelectionBuffer, useDraftBuffer } from 'common/hooks.mjs';

import { useSaveBuffer, Cancellation } from 'relaks';

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

export {
    useLatest,
    useConfirmation,
    useDialogHandling,
    useSelectionBuffer,
    useDraftBuffer,
};
