import React, { useCallback } from 'react';

import CollapsibleContainer from 'common/widgets/collapsible-container.jsx';

function DiagnosticsSection(props) {
    const { hidden, label, children } = props;
    const [ open, setOpen ] = useState(false);

    const handleLabelClick = useCallback((evt) => {
        setOpen(!open);
    }, [ open ]);

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
