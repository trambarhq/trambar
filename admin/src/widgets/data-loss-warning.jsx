import React, { useRef, useEffect } from 'react';

// widgets
import ActionConfirmation from './action-confirmation.jsx';

/**
 * Component that bring up a confirmation dialog when there're unsaved changes.
 */
function DataLossWarning(props) {
    const { route, env, changes } = props;
    const confirmation = useRef();

    useEffect(() => {
        if (changes) {
            const confirmRouteChange = async () => {
                const { ask } = confirmation.current;
                const { t } = env.locale;
                return ask(t('confirmation-data-loss'));
            };
            route.keep(confirmRouteChange);

            return () => {
                route.free(confirmRouteChange);
            };
        }
    }, [ route, env, changes ]);

    return <ActionConfirmation env={env} ref={confirmation} />
}

export {
    DataLossWarning as default,
    DataLossWarning,
};
