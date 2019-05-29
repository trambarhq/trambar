import _ from 'lodash';
import { useState, useCallback, useEffect } from 'react';
import { useLatest, useAfterglow, useConfirmation, useSelectionBuffer, useDraftBuffer } from 'common/hooks.mjs';
import * as SlugGenerator from 'common/utils/slug-generator.mjs';

function useDataLossWarning(route, env, confirm, hasChanged) {
    useEffect(() => {
        const { t } = env.locale;
        const confirmChange = (evt) => {
            if (hasChanged()) {
                return confirm(t('confirmation-data-loss'));
            }
        };
        route.keep(confirmChange);
        return () => {
            route.free(confirmChange);
        };
    }, [ route, env ]);
}

function useSortHandler() {
    const [ sort, setSort ] = useState({ columns: [ 'name' ], directions: [ 'asc' ] });
    const handleSort = useCallback((evt) => {
        const { columns, directions } = evt;
        setSort({ columns, directions });
    });
    return [ sort, handleSort ];
}

function useRowToggle(selection, attr) {
    const handleRowClick = useCallback((evt) => {
        const id = parseInt(evt.currentTarget.getAttribute(attr));
        selection.toggle(id);
    });
    return handleRowClick;
}

function useAutogenID(draft, params) {
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

export {
    useLatest,
    useAfterglow,
    useConfirmation,
    useDataLossWarning,
    useSortHandler,
    useRowToggle,
    useAutogenID,
    useSelectionBuffer,
    useDraftBuffer,
};
