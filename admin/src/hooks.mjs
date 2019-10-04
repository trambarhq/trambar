import _ from 'lodash';
import { useState, useCallback, useEffect } from 'react';
import { useListener } from 'relaks';
import { useLatest, useAfterglow, useConfirmation, useSelectionBuffer, useDraftBuffer } from 'common/hooks.mjs';
import * as SlugGenerator from 'common/utils/slug-generator.mjs';
import Cancellation from 'common/errors/cancellation.mjs';

function useDataLossWarning(route, env, confirm) {
    const { t } = env.locale;
    const [ context ] = useState({ changed: false });
    const warn = useCallback((changed) => {
        context.changed = changed;
    }, []);
    useEffect(() => {
        const confirmChange = (evt) => {
            if (context.changed) {
                return confirm(t('confirmation-data-loss'));
            }
        };
        route.keep(confirmChange);
        return () => {
            route.free(confirmChange);
        };
    }, [ route, env ]);
    return warn;
}

function useValidation(reporting) {
    const [ problems, setProblems ] = useState({});
    const reportProblems = useCallback((problems) => {
        setProblems(problems);
        if (!_.isEmpty(problems)) {
            throw new Cancellation;
        }
    });
    useEffect(() => {
        if (!reporting && !_.isEmpty(problems)) {
            setProblems({});
        }
    }, [ reporting ]);
    return [ (reporting) ? problems : {}, reportProblems ];
}

function useSortHandler() {
    const [ sort, setSort ] = useState({ columns: [ 'name' ], directions: [ 'asc' ] });
    const handleSort = useCallback((evt) => {
        const { columns, directions } = evt;
        setSort({ columns, directions });
    }, []);
    return [ sort, handleSort ];
}

function useRowToggle(selection, objects) {
    const handleRowClick = useListener((evt) => {
        const id = parseInt(evt.currentTarget.getAttribute('data-id'));
        const object = _.find(objects, { id });
        console.log(id, object);
        if (object) {
            selection.toggle(object);
        }
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
        const titleBefore = draft.current?.[titleKey] ?? {};
        const autoNameBefore = f(titleBefore);
        const autoName = f(title);
        const nameBefore = draft.current?.[nameKey] ?? '';
        if (!nameBefore || nameBefore === autoNameBefore) {
            after = _.decoupleSet(after, nameKey, autoName);
        }
        draft.update(after);
    }, []);
    const handleNameChange = useCallback((evt) => {
        const name = evt.target.value;
        const nameTransformed = _.toLower(name).replace(/[^\w\-]+/g, '');
        const nameLimited = nameTransformed.substr(0, 128);
        draft.update(_.decoupleSet(draft.current, nameKey, nameLimited));
    }, []);
    return [ handleTitleChange, handleNameChange ];
}

export {
    useLatest,
    useAfterglow,
    useConfirmation,
    useDataLossWarning,
    useValidation,
    useSortHandler,
    useRowToggle,
    useAutogenID,
    useSelectionBuffer,
    useDraftBuffer,
};
