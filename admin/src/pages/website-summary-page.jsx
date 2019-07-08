import _ from 'lodash';
import React from 'react';
import Relaks, { useProgress, useListener, useErrorCatcher } from 'relaks';
import { memoizeWeak } from 'common/utils/memoize.mjs';

// widgets
import { PushButton } from '../widgets/push-button.jsx';
import { ComboButton } from '../widgets/combo-button.jsx';
import { ActionConfirmation } from '../widgets/action-confirmation.jsx';
import { UnexpectedError } from '../widgets/unexpected-error.jsx';

// custom hooks
import {
    useSelectionBuffer,
    useSortHandler,
    useRowToggle,
    useConfirmation,
    useDataLossWarning,
} from '../hooks.mjs';

import './website-summary-page.scss';

async function WebsiteSummaryPage(props) {
    const { database, route, env, projectID, editing } = props;
    const [ show ] = useProgress();

    render();

    function render() {
        show(<h1>Website</h1>);
    }
}

const component = Relaks.memo(WebsiteSummaryPage);

export {
    component as default,
    component as WebsiteSummaryPage,
};
