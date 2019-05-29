import _ from 'lodash';
import React from 'react';
import Relaks, { useProgress, useListener } from 'relaks';
import * as SystemFinder from 'common/objects/finders/system-finder.mjs';

import './start-page.scss';

async function StartPage(props) {
    const { database, route, env } = props;
    const { t } = env.locale;
    const [ show ] = useProgress();
    const db = database.use({ by: this });

    const handleAnimationEnd = useListener((evt) => {
        route.replace('settings-page', { editing: true });
    });

    render();
    const currentUserID = await db.start();
    const system = await SystemFinder.findSystem(db);
    if (!_.isEmpty(system)) {
        await route.replace('project-list-page');
        return null;
    }
    render();

    function render() {
        if (!system) {
            show(null);
        } else {
            show(
                <div className="start-page" onAnimationEnd={handleAnimationEnd}>
                    <h2>{t('welcome')}</h2>
                </div>
            );
        }
    }
}

const component = Relaks.memo(StartPage);

export {
    component as default,
    component as StartPage,
};
