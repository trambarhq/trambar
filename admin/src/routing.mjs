const NumberOrNew = {
  from: (s) => {
    return (s === 'new') ? s : parseInt(s);
  },
  to: (v) => {
    return v;
  },
};

const routes = {
  'member-list-page': {
    path: '/projects/${projectID}/members/',
    query: {
      edit: '${editing}',
    },
    params: { projectID: Number, editing: Boolean },
    load: async (match) => {
      match.params.key = match.name;
      match.params.module = await import('./pages/member-list-page.jsx' /* webpackChunkName: "page-member-list" */);
    }
  },
  'member-summary-page': {
    path: '/projects/${projectID}/members/${userID}/',
    query: {
      edit: '${editing}',
    },
    params: { projectID: Number, userID: NumberOrNew, editing: Boolean },
    load: async (match) => {
      match.params.key = match.name;
      match.params.module = await import('./pages/user-summary-page.jsx' /* webpackChunkName: "page-user-summary" */);
    }
  },
  'project-list-page': {
    path: '/projects/',
    query: {
      edit: '${editing}',
    },
    params: { editing: Boolean },
    load: async (match) => {
      match.params.key = match.name;
      match.params.module = await import('./pages/project-list-page.jsx' /* webpackChunkName: "page-project-list" */);
    }
  },
  'project-summary-page': {
    path: '/projects/${projectID}/',
    query: {
      edit: '${editing}',
    },
    params: { projectID: NumberOrNew, editing: Boolean },
    load: async (match) => {
      match.params.key = match.name;
      match.params.module = await import('./pages/project-summary-page.jsx' /* webpackChunkName: "page-project-summary" */);
    }
  },
  'repo-list-page': {
    path: '/projects/${projectID}/repos/',
    query: {
      edit: '${editing}',
    },
    params: { projectID: Number, editing: Boolean },
    load: async (match) => {
      match.params.key = match.name;
      match.params.module = await import('./pages/repo-list-page.jsx' /* webpackChunkName: "page-repo-list" */);
    }
  },
  'repo-summary-page': {
    path: '/projects/${projectID}/repos/${repoID}/',
    query: {
      edit: '${editing}',
    },
    params: { projectID: Number, repoID: Number, editing: Boolean },
    load: async (match) => {
      match.params.key = match.name;
      match.params.module = await import('./pages/repo-summary-page.jsx' /* webpackChunkName: "page-repo-summary" */);
    }
  },
  'website-summary-page': {
    path: '/projects/${projectID}/website/',
    query: {
      edit: '${editing}',
    },
    params: { projectID: Number, editing: Boolean },
    load: async (match) => {
      match.params.key = match.name;
      match.params.module = await import('./pages/website-summary-page.jsx' /* webpackChunkName: "page-website-summary" */);
    }
  },
  'wiki-list-page': {
    path: '/projects/${projectID}/website/wikis/',
    query: {
      edit: '${editing}',
    },
    params: { projectID: Number, editing: Boolean },
    load: async (match) => {
      match.params.key = match.name;
      match.params.module = await import('./pages/wiki-list-page.jsx' /* webpackChunkName: "page-wiki-list" */);
    }
  },
  'wiki-summary-page': {
    path: '/projects/${projectID}/website/wikis/${wikiID}/',
    query: {
      edit: '${editing}',
    },
    params: { projectID: Number, wikiID: Number, editing: Boolean },
    load: async (match) => {
      match.params.key = match.name;
      match.params.module = await import('./pages/wiki-summary-page.jsx' /* webpackChunkName: "page-wiki-summary" */);
    }
  },
  'spreadsheet-list-page': {
    path: '/projects/${projectID}/website/spreadsheets/',
    query: {
      edit: '${editing}',
    },
    params: { projectID: Number, editing: Boolean },
    load: async (match) => {
      match.params.key = match.name;
      match.params.module = await import('./pages/spreadsheet-list-page.jsx' /* webpackChunkName: "page-spreadsheet-list" */);
    }
  },
  'spreadsheet-summary-page': {
    path: '/projects/${projectID}/website/spreadsheets/${spreadsheetID}/',
    query: {
      edit: '${editing}',
    },
    params: { projectID: Number, spreadsheetID: NumberOrNew, editing: Boolean },
    load: async (match) => {
      match.params.key = match.name;
      match.params.module = await import('./pages/spreadsheet-summary-page.jsx' /* webpackChunkName: "page-spreadsheet-summary" */);
    }
  },
  'rest-list-page': {
    path: '/projects/${projectID}/website/rest/',
    query: {
      edit: '${editing}',
    },
    params: { projectID: Number, editing: Boolean },
    load: async (match) => {
      match.params.key = match.name;
      match.params.module = await import('./pages/rest-list-page.jsx' /* webpackChunkName: "page-rest-list" */);
    }
  },
  'rest-summary-page': {
    path: '/projects/${projectID}/website/rest/${restID}/',
    query: {
      edit: '${editing}',
    },
    params: { projectID: Number, restID: NumberOrNew, editing: Boolean },
    load: async (match) => {
      match.params.key = match.name;
      match.params.module = await import('./pages/rest-summary-page.jsx' /* webpackChunkName: "page-rest-summary" */);
    }
  },
  'role-list-page': {
    path: '/roles/',
    query: {
      edit: '${editing}',
    },
    params: { editing: Boolean },
    load: async (match) => {
      match.params.key = match.name;
      match.params.module = await import('./pages/role-list-page.jsx' /* webpackChunkName: "page-role-list" */);
    }
  },
  'role-summary-page': {
    path: '/roles/${roleID}/',
    query: {
      edit: '${editing}',
    },
    params: { roleID: NumberOrNew, editing: Boolean },
    load: async (match) => {
      match.params.key = match.name;
      match.params.module = await import('./pages/role-summary-page.jsx' /* webpackChunkName: "page-role-summary" */);
    }
  },
  'server-list-page': {
    path: '/servers/',
    query: {
      edit: '${editing}',
    },
    params: { editing: Boolean },
    load: async (match) => {
      match.params.key = match.name;
      match.params.module = await import('./pages/server-list-page.jsx' /* webpackChunkName: "page-server-list" */);
    }
  },
  'server-summary-page': {
    path: '/servers/${serverID}/',
    query: {
      edit: '${editing}',
    },
    hash: 'T${scrollToTaskID}',
    params: { serverID: NumberOrNew, editing: Boolean, scrollToTaskID: Number },
    load: async (match) => {
      match.params.key = match.name;
      match.params.module = await import('./pages/server-summary-page.jsx' /* webpackChunkName: "page-server-summary" */);
    }
  },
  'settings-page': {
    path: '/settings/',
    query: {
      edit: '${editing}',
    },
    params: { editing: Boolean },
    load: async (match) => {
      match.params.key = match.name;
      match.params.module = await import('./pages/settings-page.jsx' /* webpackChunkName: "page-settings" */);
    }
  },
  'start-page': {
    path: '/',
    load: async (match) => {
      match.params.key = match.name;
      match.params.module = await import('./pages/start-page.jsx' /* webpackChunkName: "page-start" */);
    },
    start: true,
  },
  'sign-in-page': {
    load: async (match) => {
      match.params.key = match.name;
      match.params.module = await import('./pages/sign-in-page.jsx' /* webpackChunkName: "page-sign-in" */);
    },
    public: true,
    signIn: true,
  },
  'user-list-page': {
    path: '/users/',
    query: {
      edit: '${editing}',
    },
    params: { editing: Boolean },
    load: async (match) => {
      match.params.key = match.name;
      match.params.module = await import('./pages/user-list-page.jsx' /* webpackChunkName: "page-user-list" */);
    }
  },
  'user-summary-page': {
    path: '/users/${userID}/',
    query: {
      edit: '${editing}',
    },
    params: { userID: NumberOrNew, editing: Boolean },
    load: async (match) => {
      match.params.key = match.name;
      match.params.module = await import('./pages/user-summary-page.jsx' /* webpackChunkName: "page-user-summary" */);
    }
  },
  'error-page': {
    path: '*',
    load: async (match) => {
      match.params.key = match.name;
      match.params.module = await import('./pages/error-page.jsx' /* webpackChunkName: "page-error" */);
    }
  },
};

export {
  routes,
};
