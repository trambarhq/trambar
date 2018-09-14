import React, { PureComponent } from 'react';
import ComponentRefs from 'utils/component-refs';

// widgets
import ActionConfirmation from 'widgets/action-confirmation';

class DataLossWarning extends PureComponent {
    static displayName = 'DataLossWarning';

    constructor(props) {
        super(props);
        this.components = ComponentRefs({
            confirmation: ActionConfirmation
        });
    }

    /**
     * Put a hook on the current route when there're changes
     *
     * @param  {Object} nextProps
     */
    componentWillReceiveProps(nextProps) {
        let { changes } = this.props;
        if (nextProps.changes !== changes) {
            if (nextProps.changes) {
                nextProps.route.keep(this.confirmRouteChange);
            } else {
                nextProps.route.free(this.confirmRouteChange);
            }
        }
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
