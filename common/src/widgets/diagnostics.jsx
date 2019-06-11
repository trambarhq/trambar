import React from 'react';

let diagnosticsContents = {};
let listeners = [];
let immediate = 0;

function Diagnostics(props) {
    let type = props.type;
    let contents = props.children;
    diagnosticsContents[type] = contents;
    if (!immediate) {
        immediate = setImmediate(() => {
            immediate = 0;
            for (let f of listeners) {
                f({
                    type: 'change',
                    target: module.exports,
                });
            }
        });
    }
    return null;
}

Diagnostics.get = function(type) {
    return diagnosticsContents[type];
};

Diagnostics.addListener = function(listener) {
    if (listener) {
        listeners.push(listener);
    }
};

Diagnostics.removeListener = function(listener) {
    _.pull(listeners, listener);
};

export {
    Diagnostics as default,
    Diagnostics,
};
