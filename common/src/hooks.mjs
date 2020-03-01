import _ from 'lodash';
import { useState, useMemo, useRef, useCallback } from 'react';
import { useSaveBuffer, AsyncSaveBuffer } from 'relaks';
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
  isExisting(object) {
    return _.some(this.original, { id: object.id });
  }

  isKeeping(object) {
    return _.some(this.current, { id: object.id });
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
    const existing = _.find(this.current, { id: object.id });
    let newList;
    if (existing) {
      newList = _.without(this.current, existing);
    } else {
      newList = _.concat(this.current, object);
    }
    this.update(newList);
  }
}

function useSelectionBuffer(params) {
  const selection = useSaveBuffer({
    compare: (a, b) => {
      const idsA = _.map(a, 'id');
      const idsB = _.map(b, 'id');
      return _.isEmpty(_.xor(idsA, idsB));
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

  set(key, value) {
    if (value === undefined) {
      this.unset(key);
    } else {
      this.update(_.decoupleSet(this.current, key, value));
    }
  };

  unset(key, value) {
    this.update(_.decoupleUnset(this.current, key, value));
  };
}

function useDraftBuffer(params) {
  const draft = useSaveBuffer({
    compare: _.isEqual,
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
