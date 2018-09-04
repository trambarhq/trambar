import _ from 'lodash';
import React, { PureComponent } from 'react';

// widgets
import SettingsPanel from 'widgets/settings-panel';
import Diagnostics from 'widgets/diagnostics';

import './diagnostics-panel.scss';

class DiagnosticsPanel extends PureComponent {
    static displayName = 'DiagnosticsPanel';

    constructor(props) {
        super(props);
        this.state = {
            contents: Diagnostics.get(this.props.type),
        };
    }

    /**
     * Render component if content is available
     *
     * @return {ReactElement}
     */
    render() {
        if (!this.state.contents) {
            return null;
        }
        var className = `diagnostics ${this.props.type}`;
        return (
            <SettingsPanel className={className}>
                <header>
                    <i className="fa fa-gear" /> {this.props.title}
                </header>
                <body>
                    {this.state.contents}
                </body>
            </SettingsPanel>
        );
    }

    /**
     * Add change handler
     */
    componentDidMount() {
        Diagnostics.addListener(this.handleChange);
    }

    /**
     * Remove change handler
     */
    componentWillUnmount() {
        Diagnostics.removeListener(this.handleChange);
    }

    /**
     * Called when diagnostic data has changed
     */
    handleChange = (evt) => {
        var contents = Diagnostics.get(this.props.type);
        if (this.state.contents !== contents) {
            this.setState({ contents });
        }
    }
}

export {
    DiagnosticsPanel as default,
    DiagnosticsPanel,
};

if (process.env.NODE_ENV !== 'production') {
    const PropTypes = require('prop-types');

    DiagnosticsPanel.propTypes = {
        type: PropTypes.string.isRequired,
        title: PropTypes.string.isRequired,
    };
}
