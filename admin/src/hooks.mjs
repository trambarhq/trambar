import _ from 'lodash';
import { useState, useMemo, useCallback } from 'react';
import { useSaveBuffer } from 'relaks';

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

function useErrorHandling() {
    const [ problems, setProblems ] = useState({});
    const setUnxpectedError = useCallback((err) => {
        const problems = { unexpected: err.message };
        setProblems(problems);
    });
    return [ problems, setProblems, setUnxpectedError ];
}

function useSortHandling() {
    const [ sort, setSort ] = useState({ columns: [ 'name' ], directions: [ 'asc' ] });
    const handleSort = useCallback((evt) => {
        const { columns, directions } = evt;
        setSort({ columns, directions });
    });
    return [ sort, handleSort ];
}

function useEditToggle(route, addParams) {
    const handleEditClick = useCallback(() => {
        route.modify({ editing: true });
    }, [ route ]);
    const handleCancelClick = useCallback(() => {
        route.modify({ editing: undefined });
    }, [ route ]);

    const handlers = [ handleEditClick, handleCancelClick ];
    if (addParams) {
        const handleAddClick = useCallback(() => {
            const params = { ...route.params, ...addParams.params };
            route.push(addParams.page, params);
        }, [ route ]);
        handlers.push(handleAddClick);
    }
    return handlers;
}

function useSelectionBuffer(active) {
    const selection = useSaveBuffer({
        compare: (a, b) => {
            return _.isEmpty(_.xor(a, b));
        },
        reset: !active,
    });
    selection.shown = useAfterglow(active);
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

export {
    useLatest,
    useAfterglow,
    useErrorHandling,
    useSortHandling,
    useEditToggle,
    useSelectionBuffer,
};
