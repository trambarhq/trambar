import _ from 'lodash';
import { useState, useMemo, useRef, useCallback } from 'react';
import { useSaveBuffer, AsyncSaveBuffer } from 'relaks';
import * as Markdown from './utils/markdown.mjs';
import Cancellation from './errors/cancellation.mjs';

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

class AsyncSelectionBuffer extends AsyncSaveBuffer {
    existing(id) {
        return _.includes(this.original, id);
    }

    toggle(id) {
        const list = _.toggle(this.current, id);
        this.set(list);
    }

    adding(id) {
        return !this.existing(id) && _.includes(this.current, id);
    }

    keeping(id) {
        return _.includes(this.current, id);
    }

    removing(id) {
        return this.existing(id) && !_.includes(this.current, id);
    }

    filter(objects, action) {
        const f = this[action];
        return _.filter(objects, (object) => {
            return f.call(this, object.id);
        });
    }
}

function useSelectionBuffer(params) {
    const selection = useSaveBuffer({
        compare: (a, b) => {
            return _.isEmpty(_.xor(a, b));
        },
        ...params,
    }, AsyncSelectionBuffer);
    selection.shown = useAfterglow(!params.reset);
    return selection;
}

class AsyncDraftBuffer extends AsyncSaveBuffer {
    getCurrent(key, def) {
        return _.get(this.current, key, def);
    }

    getOriginal(key, def) {
        return _.get(this.original, key, def);
    }

    get(key, def) {
        return this.getCurrent(key, def);
    }

    update(key, value) {
        this.set(_.decoupleSet(this.current, key, value));
    };
}

function useDraftBuffer(params) {
    const draft = useSaveBuffer({
        compare: _.isEqual,
        ...params,
    }, DraftBuffer);
    return draft;
}

export {
    useLatest,
    useAfterglow,
    useConfirmation,
    useSelectionBuffer,
    useDraftBuffer,

    AsyncSelectionBuffer,
    AsyncDraftBuffer,
};
