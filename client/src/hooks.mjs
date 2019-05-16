import _ from 'lodash';
import { useState, useMemo, useRef, useCallback } from 'react';
import { useSaveBuffer } from 'relaks';

function useDraftBuffer(active, additionalParams) {
    const draft = useSaveBuffer({
        compare: _.isEqual,
        reset: !active,
        ...additionalParams,
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
    draft.toggle = function(key) {
        const value = this.get(key);
        this.update(key, value ? undefined : true);
    };
    return draft;

}

export {
    useDraftBuffer,
};
