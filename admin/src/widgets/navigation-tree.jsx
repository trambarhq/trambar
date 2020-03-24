import React, { useState, useRef, useEffect } from 'react';
import { useProgress } from 'relaks';
import { findProject } from 'common/objects/finders/project-finder.js';
import { getProjectName } from 'common/objects/utils/project-utils.js';
import { findRepo } from 'common/objects/finders/repo-finder.js';
import { getRepoName } from 'common/objects/utils/repo-utils.js';
import { findRole } from 'common/objects/finders/role-finder.js';
import { getRoleName } from 'common/objects/utils/role-utils.js';
import { findServer } from 'common/objects/finders/server-finder.js';
import { getServerName } from 'common/objects/utils/server-utils.js';
import { findSpreadsheet } from 'common/objects/finders/spreadsheet-finder.js';
import { getSpreadsheetName } from 'common/objects/utils/spreadsheet-utils.js';
import { findRest } from 'common/objects/finders/rest-finder.js';
import { getRestName } from 'common/objects/utils/rest-utils.js';
import { findUser } from 'common/objects/finders/user-finder.js';
import { getUserName } from 'common/objects/utils/user-utils.js';
import { findWiki } from 'common/objects/finders/wiki-finder.js';

// widgets
import { CollapsibleContainer } from 'common/widgets/collapsible-container.jsx';

import './navigation-tree.scss';

/**
 * Navigation tree that sits in the side nav
 */
export async function NavigationTree(props) {
  const { database, route, env, disabled } = props;
  const { t, p } = env.locale;
  const container = useRef();
  const arrow = useRef();
  const [ arrowState, setArrowState ] = useState({
    position: -1,
    count: 0,
    action: '',
  });
  const [ show ] = useProgress();

  useEffect(() => {
    const interval = repositionArrow();
    return () => {
      clearInterval(interval);
    };
  }, [ route, env ])

  render();
  const { projectID, userID, roleID, repoID } = route.params;
  const { serverID, spreadsheetID, wikiID, restID } = route.params;
  let project, user, role, repo, server, spreadsheet, wiki, rest;
  if (database.authorized) {
    const currentUserID = await database.start();
    if (typeof(projectID) === 'number') {
      project =  await findProject(database, projectID);
    }
    if (typeof(userID) === 'number') {
      user = await findUser(database, userID);
    }
    if (typeof(roleID) === 'number') {
      role = await findRole(database, roleID);
    };
    if (typeof(repoID) === 'number') {
      repo = await findRepo(database, repoID);
    }
    if (typeof(serverID) === 'number') {
      server = await findServer(database, serverID);
    }
    if (typeof(spreadsheetID) === 'number' && project) {
      spreadsheet = await findSpreadsheet(database, project.name, spreadsheetID);
    }
    if (typeof(wikiID) === 'number' && project) {
      wiki = await findWiki(database, project.name, wikiID);
    }
    if (typeof(restID) === 'number' && project) {
      rest = await findRest(database, project.name, restID);
    }
  }
  render();
  repositionArrow();

  function render() {
    const classNames = [ 'navigation-tree' ];
    if (disabled) {
      classNames.push('disabled');
    }
    const rootNodes = getRootNodes();
    show(
      <div ref={container} className={classNames.join(' ')}>
        {rootNodes.map(renderNode)}
        {renderArrow()}
      </div>
    );
  }

  function renderNode(node, key) {
    let url;
    if (!disabled && node.page) {
      const { editing, ...params } = route.params;
      url = route.find(node.page, params);
    }
    return (
      <div key={key} className={`level${node.level}`}>
        <a href={url}>{node.label}</a>
        {renderChildNodes(node)}
      </div>
    );
  }

  function renderChildNodes(node) {
    const children = node.children?.filter(Boolean) || [];
    const open = (children.length > 0);
    return (
      <CollapsibleContainer open={open}>
        {children.map(renderNode)}
      </CollapsibleContainer>
    );
  }

  function renderArrow() {
    const { position, count, action } = arrowState;
    const numbers = [ 'zero', 'one', 'two', 'three', 'four', 'five' ];
    const arrowProps = {
      ref: arrow,
      className: `arrow ${numbers[count]} ${action}`,
      style: { top: position },
    };
    return (
      <div {...arrowProps}>
        <i className="fas fa-play first" />
        <i className="fas fa-play second" />
        <i className="fas fa-play third" />
        <i className="fas fa-play fourth" />
        <i className="fas fa-play fifth" />
      </div>
    );
  }

  function getRootNodes() {
    return [
      getProjectListNode(1),
      getUserListNode(1),
      getRoleListNode(1),
      getServerListNode(1),
      getSettingsNode(1),
    ];
  }

  function getProjectListNode(level) {
    const label = t('nav-projects');
    const page = 'project-list-page';
    const children = [
      getProjectNode(level + 1),
    ];
    return { label, page, children, level };
  }

  function getProjectNode(level) {
    const page = 'project-summary-page';
    let label, children;
    if (project) {
      label = getProjectName(project, env) || '-';
      children = [
        getMemberListNode(level + 1),
        getRepoListNode(level + 1),
        getWebsiteNode(level + 1),
      ];
    } else if (projectID === 'new') {
      label = <i>{t('nav-project-new')}</i>;
    } else {
      return null;
    }
    return { label, page, children, level };
  }

  function getMemberListNode(level) {
    const label = t('nav-members');
    const page = 'member-list-page';
    let children = [
      getMemberNode(level + 1),
    ];
    return { label, page, children, level };
  }

  function getMemberNode(level) {
    const page = 'member-summary-page';
    let label
    if (user) {
      label = getUserName(user, env) ||  '-';
    } else if (userID === 'new') {
      label = <i>{t('nav-member-new')}</i>;
    } else {
      return null;
    }
    return { label, page, level };
  }

  function getRepoListNode(level) {
    const page = 'repo-list-page';
    const label = t('nav-repositories');
    const children = [
      getRepoNode(level + 1),
    ];
    return { label, page, children, level };
  }

  function getRepoNode(level) {
    const page = 'repo-summary-page';
    let label;
    if (repo) {
      label = getRepoName(repo, env) || '-';
    } else {
      return null;
    }
    return { label, page, level };
  }

  function getWebsiteNode(level) {
    const page = 'website-summary-page';
    const label = t('nav-website');
    const children = [
      getWikiListNode(level + 1),
      getExcelListNode(level + 1),
      getRestListNode(level + 1),
    ];
    return { label, page, children, level };
  }

  function getWikiListNode(level) {
    const page = 'wiki-list-page';
    const label = t('nav-wiki');
    const children = [
      getWikiNode(level + 1),
    ];
    return { label, page, children, level };
  }

  function getWikiNode(level) {
    const page = 'wiki-summary-page';
    let label;
    if (wiki) {
      label = wiki.details?.title || '-';
    } else {
      return null;
    }
    return { label, page, level };
  }

  function getExcelListNode(level) {
    const page = 'spreadsheet-list-page';
    const label = t('nav-spreadsheets');
    const children = [
      getExcelNode(level + 1),
    ];
    return { label, page, children, level };
  }

  function getExcelNode(level) {
    const page = 'spreadsheet-summary-page';
    let label;
    if (spreadsheet) {
      label = getSpreadsheetName(spreadsheet, env) || '-';
    } else if (spreadsheetID === 'new') {
      label = <i>{t('nav-spreadsheet-new')}</i>;
    } else {
      return null;
    }
    return { label, page, level };
  }

  function getRestListNode(level) {
    const page = 'rest-list-page';
    const label = t('nav-rest-sources');
    const children = [
      getRestNode(level + 1),
    ];
    return { label, page, children, level };
  }

  function getRestNode(level) {
    const page = 'rest-summary-page';
    let label;
    if (rest) {
      label = getRestName(rest, env) || '-';
    } else if (restID === 'new') {
      label = <i>{t('nav-rest-source-new')}</i>;
    } else {
      return null;
    }
    return { label, page, level };
  }

  function getUserListNode(level) {
    const page = 'user-list-page';
    const label = t('nav-users');
    const children = [
      getUserNode(level + 1),
    ];
    return { label, page, children, level };
  }

  function getUserNode(level) {
    const page = 'user-summary-page';
    let label;
    if (user && !project) {
      label = getUserName(user, env) ||  '-';
    } else if (userID === 'new' && !project) {
      label = <i>{t('nav-user-new')}</i>;
    } else {
      return null;
    }
    return { label, page, level };
  }

  function getRoleListNode(level) {
    const page = 'role-list-page';
    const label = t('nav-roles');
    const children = [
      getRoleNode(level + 1),
    ];
    return { label, page, children, level };
  }

  function getRoleNode(level) {
    const page = 'role-summary-page';
    let label;
    if (role) {
      label = getRoleName(role, env) || '-';
    } else if (roleID === 'new') {
      label = <i>{t('nav-role-new')}</i>;
    } else {
      return null;
    }
    return { label, page, level };
  }

  function getServerListNode(level) {
    const page = 'server-list-page';
    const label = t('nav-servers');
    const children = [
      getServerNode(level + 1),
    ];
    return { label, page, children, level };
  }

  function getServerNode(level) {
    const page = 'server-summary-page';
    let label;
    if (server) {
      label = getServerName(server, env);
    } else if (serverID === 'new') {
      label = <i>{t('nav-server-new')}</i>;
    } else {
      return null;
    }
    return { label, page, level };
  }

  function getSettingsNode(level) {
    const page = 'settings-page';
    const label = t('nav-settings');
    return { label, page, level };
  }

  function repositionArrow() {
    let tries = 0;
    let { position, count, action } = arrowState;
    const interval = setInterval(() => {
      // calculate the position of the arrow
      // happens in an interval function since the link will
      // move during transition
      const activeLink = findLink(container.current, route.url);
      const newCount = getLinkLevel(activeLink);
      const newPos = calculateArrowPosition(arrow.current, container.current, activeLink);
      if ((position !== newPos || count !== newCount) && tries < 20) {
        if (count > arrowState.count) {
          action = 'extending';
        } else if (count < arrowState.count) {
          action = 'retracting';
        }
        position = newPos;
        count = newCount;
        setArrowState({ position, count, action });
        tries++;
      } else {
        clearInterval(interval);
      }
    }, 50);
    return interval;
  }
}

function getLinkLevel(link) {
  for (let n = link; n; n = n.parentNode) {
    let m;
    if (m = /level(\d)/.exec(n.className)) {
      return parseInt(m[1]);
      break;
    }
  }
  return 0;
}

function findLink(container, url) {
  if (!container) {
    return null;
  }
  const qi = url.indexOf('?');
  if (qi !== -1) {
    url = url.substr(0, qi);
  }
  const links = container.getElementsByTagName('A');
  for (let link of links) {
    if (link.getAttribute('href') === url) {
      return link;
    }
  }
}

function calculateArrowPosition(arrow, container, link) {
  let position = 0;
  if (arrow && container && link) {
    const arrowRect = arrow.getBoundingClientRect();
    const linkRect = link.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    const offset = linkRect.top - containerRect.top;
    const center = (linkRect.height - arrowRect.height) / 2;
    position = Math.floor(center + offset) + 1;
  }
  return position;
}
