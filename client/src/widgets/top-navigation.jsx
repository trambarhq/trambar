import _ from 'lodash';
import React, { useState, useMemo, useRef, useEffect } from 'react';

// widgets
import { Link } from './link.jsx';
import { CollapsibleContainer } from 'common/widgets/collapsible-container.jsx';
import { CalendarBar } from './calendar-bar.jsx';
import { RoleFilterBar } from './role-filter-bar.jsx';
import { SearchBar } from './search-bar.jsx';
import { ErrorBoundary } from 'common/widgets/error-boundary.jsx';

import './top-navigation.scss';

/**
 * Expandable navigation bar at the top of the user interface.
 */
function TopNavigation(props) {
  const { database, route, env, payloads, settings, makingRequests } = props;
  const showing = settings?.navigation?.top ?? true;
  const [ height, setHeight ] = useState();
  const containerRef = useRef();
  const selectedControl = useMemo(() => {
    return _.find(controls, (control) => {
      const keys = _.keys(control.params);
      const params = _.pick(route.params, keys);
      return !_.isEmpty(params);
    });
  }, [ route ]);

  useEffect(() => {
    const contentHeight = containerRef.current.offsetHeight;
    if (!showing) {
      setHeight(contentHeight);
      setTimeout(() => {
        setHeight(0);
      }, 0);
    } else {
      setHeight(contentHeight);
      setTimeout(() => {
        setHeight('auto');
      }, 1000);
    }
  }, [ showing ]);

  return (
    <header className="top-navigation" style={{ height }}>
      <div ref={containerRef} className="container">
        {renderButtonBar()}
        {renderCollapsibleControl()}
      </div>
    </header>
  );

  function renderButtonBar() {
    const connectionProps = {
      uploading: payloads.uploading,
      searching: makingRequests,
      env,
    };
    return (
      <div>
        {_.map(controls, renderButton)}
        <ConnectionIndicator {...connectionProps}/>
      </div>
    );
  }

  function renderButton(control, i) {
    const { name, icon } = control;
    const controlSettings = settings?.name;
    const className = `${name}-btn`;
    const active = (selectedControl?.name === name);
    let url;
    if (controlSettings) {
      let params = { ...controlSettings.route };
      if (!active) {
        // add empty parameters to trigger the control's activation
        params = { ...params, ...control.params };
      }
      url = route.find(route.name, params);
    }
    const props = { icon, className, active, url };
    return <Button key={i} {...props} />
  }

  function renderCollapsibleControl() {
    let contents;
    if (selectedControl) {
      const { name, component: Control } = selectedControl;
      const controlSettings = settings?.name ?? {};
      let props = {
        settings: controlSettings,
        database,
        route,
        env,
      };
      contents = <Control {...props} />;
    }
    return (
      <CollapsibleContainer open={!!selectedControl}>
        <ErrorBoundary env={env}>{contents}</ErrorBoundary>
      </CollapsibleContainer>
    );
  }
}

const controls = [
  {
    name: 'calendar',
    icon: 'calendar',
    params: { date: '' },
    component: CalendarBar,
  },
  {
    name: 'filter',
    icon: 'filter',
    params: { roleIDs: [] },
    component: RoleFilterBar,
  },
  {
    name: 'search',
    icon: 'search',
    params: { search: '' },
    component: SearchBar,
  },
];

function Button(props) {
  const { url, icon, className, active } = props;
  const classNames = [ 'button' ];
  if (className) {
    classNames.push(className);
  }
  if (active) {
    classNames.push('active');
  }
  if (!url) {
    classNames.push('disabled');
  }
  return (
    <Link className={classNames.join(' ')} url={url}>
      <i className={`fa fa-${icon}`} />
    </Link>
  );
}

function ConnectionIndicator(props) {
  const { env, uploading, searching } = props;
  const { t } = env.locale;
  if (uploading) {
    const size = _.fileSize(uploading.bytes);
    const count = uploading.files;
    const title = t('upload-progress-uploading-$count-files-$size-remaining', count, size);
    return (
      <span className="connection" title={title}>
        <i className="fa fa-cloud-upload"/>
      </span>
    );
  } else if (searching) {
    return (
      <span className="connection">
        <i className="fa fa-refresh"/>
      </span>
    );
  } else if (!env.online) {
    return (
      <span className="connection">
        <i className="fa fa-wifi" />
        <i className="fa fa-ban" />
      </span>
    );
  } else {
    return null;
  }
}

export {
  TopNavigation as default,
  TopNavigation,
};
