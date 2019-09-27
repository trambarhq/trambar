import React, { useState } from 'react';
import { useListener } from 'relaks';

import { CollapsibleContainer } from 'common/widgets/collapsible-container.jsx';

function DiagnosticsSection(props) {
    const { hidden, label, children } = props;
    const [ open, setOpen ] = useState(false);

    const handleLabelClick = useListener((evt) => {
        setOpen(!open);
    });

    if (hidden) {
        return null;
    }
    const classNames = [ 'diagnostics-section' ];
    if (open) {
        classNames.push('open');
    }
    return (
        <div className={classNames.join(' ')}>
            <div className="title" onClick={handleLabelClick}>{label}</div>
            <CollapsibleContainer open={open}>
                {children}
            </CollapsibleContainer>
        </div>
    );
}

export {
    DiagnosticsSection as default,
    DiagnosticsSection,
};
