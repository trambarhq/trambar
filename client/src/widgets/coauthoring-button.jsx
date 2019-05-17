import _ from 'lodash';
import React, { useState, useCallback } from 'react';

// widgets
import { HeaderButton } from './header-button.jsx';
import { UserSelectionDialogBox } from '../dialogs/user-selection-dialog-box';

import './coauthoring-button.scss';

/**
 * Button for adding/removing co-authors from a story. The component is also
 * responsible for rendering the dialog box.
 */
function CoauthoringButton(props) {
    const { database, route, env, story, coauthoring, onRemove, onSelect } = props;
    const { t } = env.locale;
    const [ selecting, setSelecting ] = useState(false);

    const handleClick = useCallback((evt) => {
        if (coauthoring) {
            if (onRemove) {
                onRemove({});
            }
        } else {
            setSelecting(true);
        }
    }, [ onRemove ]);
    const handleCancel = useCallback((evt) => {
        setSelecting(false);
    });
    const handleSelect = useCallback((evt) => {
        if (onSelect) {
            onSelect({ selection: evt.selection });
        }
        setSelecting(false);
    }, [ onSelect ]);

    let icon, label;
    if (coauthoring) {
        icon = 'minus-square';
        label = t('story-remove-yourself');
    } else {
        icon = 'plus-square';
        if (story.user_ids.length > 1) {
            label = t('story-add-remove-coauthor');
        } else {
            label = t('story-add-coauthor');
        }
    }
    return (
        <span className="coauthoring-button">
            <span onClick={handleClick}>
                <i className={`fa fa-${icon}`} />
                <span className="label">{label}</span>
            </span>
            {renderDialogBox()}
        </span>
    );

    function renderDialogBox() {
        const props = {
            show: selecting,
            selection: story.user_ids,
            disabled: _.slice(story.user_ids, 0, 1),
            database,
            route,
            env,
            onSelect: handleSelect,
            onCancel: handleCancel,
        };
        return <UserSelectionDialogBox {...props} />;
    }
}

export {
    CoauthoringButton as default,
    CoauthoringButton,
};
