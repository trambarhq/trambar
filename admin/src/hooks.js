import { useState, useCallback, useEffect } from 'react';
import { useListener } from 'relaks';
import { useLatest, useAfterglow, useConfirmation, useSelectionBuffer, useDraftBuffer } from 'common/hooks.js';
import { fromPersonalName, fromTitle } from 'common/utils/slug-generator.js';
import { Cancellation } from 'common/errors.js';
import { isEmpty, get, decoupleSet } from 'common/utils/object-utils.js';

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
    if (problems?.length > 0) {
      throw new Cancellation;
    }
  });
  useEffect(() => {
    if (!reporting && !isEmpty(problems)) {
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
    const object = objects.find(obj => obj.id === id);
    if (object) {
      selection.toggle(object);
    }
  });
  return handleRowClick;
}

function useAutogenID(draft, params) {
  const { titleKey, nameKey, personal } = params;
  const f = (personal) ? fromPersonalName : fromTitle;
  const handleTitleChange = useCallback((evt) => {
    const title = evt.target.value;
    let after = decoupleSet(draft.current, titleKey, title);

    // derive name from title
    const titleBefore = get(draft.current, titleKey, {});
    const autoNameBefore = f(titleBefore);
    const autoName = f(title);
    const nameBefore = get(draft.current, nameKey, '');
    if (!nameBefore || nameBefore === autoNameBefore) {
      after = decoupleSet(after, nameKey, autoName);
    }
    draft.update(after);
  }, []);
  const handleNameChange = useCallback((evt) => {
    const name = evt.target.value;
    const nameTransformed = name.toLowerCase().replace(/[^\w\-]+/g, '');
    const nameLimited = nameTransformed.substr(0, 128);
    draft.update(decoupleSet(draft.current, nameKey, nameLimited));
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
