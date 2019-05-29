import _ from 'lodash';
import React, { useState, useRef, useEffect } from 'react';
import { useListener } from 'relaks';
import { useLatest } from '../hooks';

import './combo-button.scss';

/**
 * A push button with a drop-down menu.
 */
function ComboButton(props) {
    const { preselected, alert, children } = props;
    const [ open, setOpen ] = useState(false);
    const [ selected, setSelected ] = useLatest(preselected);
    const containerNode = useRef();

    const handleSideButtonClick = useListener((evt) => {
        setOpen(!open);
    });
    const handleItemClick = useListener((evt) => {
        const name = evt.currentTarget.getAttribute('data-name');
        setSelected(name);
        setOpen(false);
    });
    const handleBodyMouseDown = useListener((evt) => {
        let insideMenu = isInside(evt.target, containerNode.current);
        if (!insideMenu) {
            setOpen(false);
        }
    });

    useEffect(() => {
        // add/remove document-level mousedown handler when menu opens and closes
        if (open) {
            const appContainer = document.getElementById('react-container');
            appContainer.addEventListener('mousedown', handleBodyMouseDown);
            return () => {
                appContainer.removeEventListener('mousedown', handleBodyMouseDown);
            };
        }
    }, [ open ]);

    return (
        <div className="combo-button" ref={containerNode}>
            {renderMainButton()}
            {renderSideButton()}
            {renderMenu()}
        </div>
    );

    function renderMainButton() {
        const options = React.Children.toArray(children);
        let selectedOption = _.find(options, (option) => {
            return option.props.name === selected;
        });
        if (!selectedOption) {
            selectedOption = _.first(options);
        }
        const props = _.omit(selectedOption.props, 'separator');
        props.className = props.className ? `main ${props.className}`: 'main';
        if (alert) {
            props.className += ' alert';
        }
        if (!props.onClick) {
            props.onClick = handleSideButtonClick;
        }
        return (
            <button {...props}>
                {selectedOption.props.children}
            </button>
        );
    }

    function renderSideButton() {
        return (
            <button className="side" onClick={handleSideButtonClick}>
                <i className="fa fa-angle-down" />
            </button>
        );
    }

    function renderMenu() {
        if (!open) {
            return null;
        }
        const options = React.Children.toArray(children);
        return (
            <div className="container">
                <div className="menu">
                    {_.map(options, renderOption)}
                </div>
            </div>
        );
    }

    function renderOption(option, i) {
        const { name, separator, hidden, disabled } = option.props;
        if (!name || hidden) {
            return null;
        }
        const itemProps = {
            'data-name': name,
            className: 'option',
            onClick: handleItemClick,
        };
        const linkProps = _.omit(option.props, 'name', 'separator', 'disabled');
        if (disabled) {
            itemProps.className += ' disabled';
            itemProps.onClick = null;
            linkProps.onClick = null;
        }
        if (separator) {
            itemProps.className += ' separator';
        }
        return (
            <div key={i} {...itemProps}>
                <div {...linkProps}>
                    {option.props.children}
                </div>
            </div>
        );
    }

}

function isInside(node, container) {
    for (let n = node; n !== document.body.parentNode; n = n.parentNode) {
        if (n === container) {
            return true;
        }
    }
    return false;
}

ComboButton.defaultProps = {
    preselected: undefined,
    alert: false,
};

export {
    ComboButton as default,
    ComboButton,
};
