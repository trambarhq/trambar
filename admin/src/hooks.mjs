import _ from 'lodash';
import { useState, useMemo, useRef, useCallback } from 'react';
import { useSaveBuffer, Cancellation } from 'relaks';
import * as SlugGenerator from 'common/utils/slug-generator.mjs';

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
    const confirm = useCallback(async (question) => {
        const { ask } = confirmationRef.current;
        const confirmed = await ask(question);
        if (!confirmed) {
            throw new Cancellation;
        }
    });
    return [ confirmationRef, confirm ];
}

function useSortHandling() {
    const [ sort, setSort ] = useState({ columns: [ 'name' ], directions: [ 'asc' ] });
    const handleSort = useCallback((evt) => {
        const { columns, directions } = evt;
        setSort({ columns, directions });
    });
    return [ sort, handleSort ];
}

function useEditHandling(route) {
    const handleEditClick = useCallback((evt) => {
        route.modify({ editing: true });
    }, [ route ]);
    const handleCancelClick = useCallback((evt) => {
        route.modify({ editing: undefined });
    }, [ route ]);
    return [ handleEditClick, handleCancelClick ];
}

function useAddHandling(route, redirect) {
    const handleAddClick = useCallback((evt) => {
        const page = redirect.page || route.name;
        const params = { ...route.params, ...redirect.params };
        route.push(page, params);
    }, [ route ]);
    return [ handleAddClick ];
}

function useReturnHandling(route, redirect) {
    const handleReturnClick = useCallback((evt) => {
        const page = redirect.page || route.name;
        const params = { ...route.params, ...redirect.params };
        route.push(page, params);
    }, [ route ]);
    return [ handleReturnClick ];
}

function useRowHandling(selection, attr) {
    const handleRowClick = useCallback((evt) => {
        const id = parseInt(evt.currentTarget.getAttribute(attr));
        selection.toggle(id);
    });
    return [ handleRowClick ];
}

function useNameHandling(draft, params) {
    const { titleKey, nameKey, personal } = params;
    const method = (personal) ? 'fromPersonalName' : 'fromTitle';
    const f = SlugGenerator[method];
    const handleTitleChange = useCallback((evt) => {
        const title = evt.target.value;
        let after = _.decoupleSet(draft.current, titleKey, title);

        // derive name from title
        const titleBefore = _.get(draft.current, titleKey, {});
        const autoNameBefore = f(titleBefore);
        const autoName = f(title);
        const nameBefore = _.get(draft.current, nameKey, '');
        if (!nameBefore || nameBefore === autoNameBefore) {
            after = _.decoupleSet(after, nameKey, autoName);
        }
        draft.set(after);
    });
    const handleNameChange = useCallback((evt) => {
        const name = evt.target.value;
        const nameTransformed = _.toLower(name).replace(/[^\w\-]+/g, '');
        const nameLimited = nameTransformed.substr(0, 128);
        draft.set(_.decoupleSet(draft.current, nameKey, nameLimited));
    });
    return [ handleTitleChange, handleNameChange ];
}

function useSelectionBuffer(active, additionalParams) {
    const selection = useSaveBuffer({
        compare: (a, b) => {
            return _.isEmpty(_.xor(a, b));
        },
        reset: !active,
        ...additionalParams,
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
    useConfirmation,
    useSortHandling,
    useEditHandling,
    useAddHandling,
    useReturnHandling,
    useRowHandling,
    useNameHandling,
    useSelectionBuffer,
};
