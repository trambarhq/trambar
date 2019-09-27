import React, { useRef, useEffect } from 'react';

import './page-container.scss';

/**
 * Container holding a page's contents.
 */
function PageContainer(props) {
    const { className, children } = props;
    const ref = useRef();

    useEffect(() => {
        const activeElement = document.activeElement;
        if (!activeElement || activeElement === document.body) {
            // set focus so that arrow keys can be used to scroll the page
            ref.current.focus();
        }
    }, []);

    const classNames = [ 'page-container' ];
    if (className) {
        classNames.push(className);
    }
    return (
        <div className={classNames.join(' ')} tabIndex={0} ref={ref}>
            <div className="contents">
                {children}
            </div>
        </div>
    );
}

export {
    PageContainer as default,
    PageContainer,
};
