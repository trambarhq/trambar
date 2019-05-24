import React, { useCallback } from 'react';

// widgets
import Overlay from 'common/widgets/overlay.jsx';
import PushButton from '../widgets/push-button.jsx';
import Scrollable from '../widgets/scrollable.jsx';
import UserSelectionList from '../lists/user-selection-list.jsx';

// custom hooks
import {
    useSelectionBuffer,
} from '../hooks';

import './user-selection-dialog-box.scss';

/**
 * Dialog box for selecting users from a list.
 */
function UserSelectionDialogBox(props) {
    const { database, route, env, disabled, selection, onSelect, onCancel } = props;
    const { t } = env.locale;
    const userSelection = useSelectionBuffer({
        original: selection,
    });

    const handleListSelect = useCallback((evt) => {
        userSelection.set(evt.selection)
    });
    const handleOKClick = useCallback((evt) => {
        if (onSelect) {
            onSelect({ selection: userSelection.current });
        }
    });
    const handleCancelClick = useCallback((evt) => {
        if (onCancel) {
            onCancel({});
        }
    });

    return (
        <div className="user-selection-dialog-box">
            {renderList()}
            {renderButtons()}
        </div>
    );

    function renderList() {
        const listProps = {
            selection: userSelection.current,
            disabled,
            database,
            route,
            env,
            onSelect: handleListSelect,
        };
        return (
            <Scrollable>
                <UserSelectionList {...listProps} />
            </Scrollable>
        );
    }

    function renderButtons() {
        const cancelButtonProps = {
            label: t('selection-cancel'),
            onClick: handleCancelClick,
        };
        const okButtonProps = {
            label: t('selection-ok'),
            onClick: handleOKClick,
            emphasized: true,
        };
        return (
            <div className="buttons">
                <PushButton {...cancelButtonProps} />
                <PushButton {...okButtonProps} />
            </div>
        );
    }
}

const component = Overlay.create(UserSelectionDialogBox);

export {
    component as default,
    component as UserSelectionDialogBox,
};
