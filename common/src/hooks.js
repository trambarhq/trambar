import React from 'react';
import { useSaveBuffer, AsyncSaveBuffer } from 'relaks';
import { Cancellation } from './errors.js';
import { get, isEqual, decoupleSet, decoupleUnset } from './utils/object-utils.js';

const { useState, useMemo, useRef, useCallback } = React;

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
  isExisting(object) {
    return this.original.some(x => x.id === object.id);
  }

  isKeeping(object) {
    return this.current.some(c => c.id === object.id);
  }

  isAdding(object) {
    return !this.isExisting(object) && this.isKeeping(object);
  }

  isRemoving(object) {
    return this.isExisting(object) && !this.isKeeping(object);
  }

  adding() {
    const list = [];
    for (let object of this.current) {
      if (!this.isExisting(object)) {
        list.push(object);
      }
    }
    return list;
  }

  removing() {
    const list = [];
    for (let object of this.original) {
      if (!this.isKeeping(object)) {
        list.push(object);
      }
    }
    return list;
  }

  toggle(object) {
    const newList = this.current.slice();
    const index = newList.findIndex(c => c.id === object.id);
    if (index !== -1) {
      newList.splice(index, 1);
    } else {
      newList.push(object);
    }
    this.update(newList);
  }
}

function useSelectionBuffer(params) {
  const selection = useSaveBuffer({
    original: [],
    compare: (a, b) => {
      const idsA = a.map(obj => obj.id).sort();
      const idsB = b.map(obj => obj.id).sort();
      return isEqual(idsA, idsB);
    },
    ...params,
  }, AsyncSelectionBuffer);
  selection.shown = useAfterglow(!params.reset);
  return selection;
}

class AsyncDraftBuffer extends AsyncSaveBuffer {
  getCurrent(key, def) {
    return get(this.current, key, def);
  }

  getOriginal(key, def) {
    return get(this.original, key, def);
  }

  get(key, def) {
    return this.getCurrent(key, def);
  }

  set(key, value) {
    if (value === undefined) {
      this.unset(key);
    } else {
      this.update(decoupleSet(this.current, key, value));
    }
  };

  unset(key, value) {
    this.update(decoupleUnset(this.current, key, value));
  };
}

function useDraftBuffer(params) {
  const draft = useSaveBuffer({
    compare: isEqual,
    ...params,
  }, AsyncDraftBuffer);
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
