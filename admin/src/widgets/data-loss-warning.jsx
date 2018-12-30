import React, { PureComponent } from 'react';
import ComponentRefs from 'utils/component-refs';

// widgets
import ActionConfirmation from 'widgets/action-confirmation';

/**
 * Component that bring up a confirmation dialog when there're unsaved changes.
 *
 * @extends PureComponent
 */
class DataLossWarning extends PureComponent {
    static displayName = 'DataLossWarning';

    constructor(props) {
        super(props);
        this.components = ComponentRefs({
            confirmation: ActionConfirmation
        });
    }

    /**
     * Render component
     *
     * @return  {ReactElement|null}
     */
    render() {
        let { env } = this.props;
        let { setters } = this.components;
        let props = {
            ref: setters.confirmation,
            env,
        };
        return <ActionConfirmation {...props} />
    }

    /**
     * Put a hook on the current route when there're changes
     *
     * @param  {Object} prevProps
     * @param  {Object} prevState
     */
    componentDidUpdate(prevProps, prevState) {
        let { route, changes } = this.props;
        if (prevProps.changes !== changes) {
            if (changes) {
                route.keep(this.confirmRouteChange);
            } else {
                route.free(this.confirmRouteChange);
            }
        }
    }

    /**
     * Called just before a route change occurs
     *
     * @return {Promise<Boolean>}
     */
    confirmRouteChange = () => {
        let { env } = this.props;
        let { confirmation } = this.components;
        let { t } = env.locale;
        let message = t('confirmation-data-loss');
        return confirmation.ask(message);
    }
}

export {
    DataLossWarning as default,
    DataLossWarning,
};

import Route from 'routing/route';
import Environment from 'env/environment';

if (process.env.NODE_ENV !== 'production') {
    const PropTypes = require('prop-types');

    DataLossWarning.propTypes = {
        route: PropTypes.instanceOf(Route).isRequired,
        env: PropTypes.instanceOf(Environment).isRequired,
        changes: PropTypes.bool,
    };
}
