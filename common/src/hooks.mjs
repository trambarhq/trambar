import _ from 'lodash';
import { useState, useMemo, useRef, useCallback } from 'react';
import { useSaveBuffer, Cancellation } from 'relaks';

function useLatest(propValue) {
    const [ stateValue, setStateValue ] = useState();
    const stateValueTime = useMemo(() => new Date, [ stateValue ]);
    const propValueTime = useMemo(() => new Date, [ propValue ]);
    const latestValue = useMemo(() => {
        if (stateValueTime > propValueTime) {
            return stateValue;
        } else {
            return propValue;
        }
    }, [ stateValueTime, propValueTime ]);
    return [ latestValue, setStateValue ];
}

function useAfterglow(value, delay) {
    value = !!value;
    const [ state, setState ] = useState({ value });
    if (state.value != value) {
        if (value) {
            // truthy takes effect immediately
            state.value = value;
            if (state.timeout) {
                clearTimeout(state.timeout);
                state.timeout = 0;
            }
        } else {
            // falsy takes effect after a delay
            if (!state.timeout) {
                state.timeout = setTimeout(() => {
                    setState({ value, timeout: 0 });
                }, delay || 500);
            }
        }
    }
    return state.value;
}

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

function useSelectionBuffer(params) {
    const selection = useSaveBuffer({
        compare: (a, b) => {
            return _.isEmpty(_.xor(a, b));
        },
        ...params,
    });
    selection.shown = useAfterglow(!params.reset);
    selection.existing = function(id) {
        return _.includes(this.original, id);
    };
    selection.toggle = function(id) {
        const list = _.toggle(this.current, id);
        this.set(list);
    };
    selection.adding = function(id) {
        return !this.existing(id) && _.includes(this.current, id);
    };
    selection.keeping = function(id) {
        return _.includes(this.current, id);
    };
    selection.removing = function(id) {
        return this.existing(id) && !_.includes(this.current, id);
    };
    return selection;
}

function useDraftBuffer(params) {
    const draft = useSaveBuffer({
        compare: _.isEqual,
        ...params,
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
    return draft;
}

export {
    useLatest,
    useAfterglow,
    useConfirmation,
    useSelectionBuffer,
    useDraftBuffer,
};
