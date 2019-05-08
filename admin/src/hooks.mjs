import { useState, useCallback } from 'react';

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
        const { columns, direction } = evt;
        setSort({ columns, direction });
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

export {
    useAfterglow,
    useErrorHandling,
    useSortHandling,
    useEditToggle,
};
