import React, { PureComponent } from 'react';

import CollapsibleContainer from 'widgets/collapsible-container';

class DiagnosticsSection extends PureComponent {
    static displayName = 'DiagnosticsSection';

    constructor(props) {
        super(props);
        this.state = {
            open: false
        };
    }

    /**
     * Render component
     *
     * @return {ReactElement|null}
     */
    render() {
        let { hidden, label, children } = this.props;
        let { open } = this.state;
        if (hidden) {
            return null;
        }
        let className = 'diagnostics-section';
        if (open) {
            className += ' open';
        }
        return (
            <div className={className}>
                <div className="title" onClick={this.handleLabelClick}>
                    {label}
                </div>
                <CollapsibleContainer open={open}>
                    {children}
                </CollapsibleContainer>
            </div>
        );
    }

    /**
     * Called when user clicks label
     *
     * @param  {Event} evt
     */
    handleLabelClick = (evt) => {
        let { open } = this.state;
        open = !open;
        this.setState({ open });
    }
}

export {
    DiagnosticsSection as default,
    DiagnosticsSection,
};

if (process.env.NODE_ENV !== 'production') {
    const PropTypes = require('prop-types');

    DiagnosticsSection.propTypes = {
        label: PropTypes.string,
        hidden: PropTypes.bool,
    };
}
