import React, { useContext } from 'react';
import { useListener } from 'relaks';

const TextContext = React.createContext();

function usePlainText(hookOpts) {
    const context = useContext(TextContext);
    const options = { ...context, ...hookOpts };
    const extractText = useListener((target, path) => {
        const object = resolve(target, path, options);
        return object.getPlainText(options);
    });
    return extractText;
}

function useRichText(hookOpts) {
    const context = useContext(TextContext);
    const options = { ...context, ...hookOpts };
    const createElement = useListener((target, path) => {
        const object = resolve(target, path, options);
        return object.getRichText(options);
    });
    return createElement;
}

function resolve(target, path) {
    return target;
}

export {
    usePlainText,
    useRichText,
    TextContext,
};
