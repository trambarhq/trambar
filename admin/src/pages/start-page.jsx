import _ from 'lodash';
import React from 'react';
import { useProgress, useListener } from 'relaks';
import { findSystem } from 'common/objects/finders/system-finder.js';

import './start-page.scss';

export default async function StartPage(props) {
  const { database, route, env } = props;
  const { t } = env.locale;
  const [ show ] = useProgress();

  const handleAnimationEnd = useListener((evt) => {
    route.replace('settings-page', { editing: true });
  });

  render();
  const currentUserID = await database.start();
  const system = await findSystem(database);
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
