var NumberOrNew = {
    from: (s) => {
        return (s === 'new') ? s : parseInt(s);
    },
    to: (v) => {
        return v;
    },
};

var routes = {
    'member-list-page': {
        path: '/projects/${projectID}/members/',
        query: {
            edit: '${editing}',
        },
        params: { projectID: Number, editing: Boolean },
        load: (params, context) => {
            return import('pages/member-list-page' /* webpackChunkName: "page-member-list" */).then((module) => {
                params.module = module;
            });
        }
    },
    'member-summary-page': {
        path: '/projects/${projectID}/members/${userID}/',
        query: {
            edit: '${editing}',
        },
        params: { projectID: Number, userID: NumberOrNew, editing: Boolean },
        load: (params, context) => {
            return import('pages/user-summary-page' /* webpackChunkName: "page-user-summary" */).then((module) => {
                params.module = module;
            });
        }
    },
    'project-list-page': {
        path: '/projects/',
        query: {
            edit: '${editing}',
        },
        params: { editing: Boolean },
        load: (params, context) => {
            return import('pages/project-list-page' /* webpackChunkName: "page-project-list" */).then((module) => {
                params.module = module;
            });
        }
    },
    'project-summary-page': {
        path: '/projects/${projectID}/',
        query: {
            edit: '${editing}',
        },
        params: { projectID: NumberOrNew, editing: Boolean },
        load: (params, context) => {
            return import('pages/project-summary-page' /* webpackChunkName: "page-project-summary" */).then((module) => {
                params.module = module;
            });
        }
    },
    'repo-list-page': {
        path: '/projects/${projectID}/repos/',
        query: {
            edit: '${editing}',
        },
        params: { projectID: Number, editing: Boolean },
        load: (params, context) => {
            return import('pages/repo-list-page' /* webpackChunkName: "page-repo-list" */).then((module) => {
                params.module = module;
            });
        }
    },
    'repo-summary-page': {
        path: '/projects/${projectID}/repos/${repoID}/',
        query: {
            edit: '${editing}',
        },
        params: { projectID: Number, repoID: Number, editing: Boolean },
        load: (params, context) => {
            return import('pages/repo-summary-page' /* webpackChunkName: "page-repo-summary" */).then((module) => {
                params.module = module;
            });
        }
    },
    'role-list-page': {
        path: '/roles/',
        query: {
            edit: '${editing}',
        },
        params: { editing: Boolean },
        load: (params, context) => {
            return import('pages/role-list-page' /* webpackChunkName: "page-role-list" */).then((module) => {
                params.module = module;
            });
        }
    },
    'role-summary-page': {
        path: '/roles/${roleID}/',
        query: {
            edit: '${editing}',
        },
        params: { roleID: NumberOrNew, editing: Boolean },
        load: (params, context) => {
            return import('pages/role-summary-page' /* webpackChunkName: "page-role-summary" */).then((module) => {
                params.module = module;
            });
        }
    },
    'server-list-page': {
        path: '/servers/',
        query: {
            edit: '${editing}',
        },
        params: { editing: Boolean },
        load: (params, context) => {
            return import('pages/server-list-page' /* webpackChunkName: "page-server-list" */).then((module) => {
                params.module = module;
            });
        }
    },
    'server-summary-page': {
        path: '/servers/${serverID}/',
        query: {
            edit: '${editing}',
        },
        hash: [ 'T${taskID}' ],
        params: { serverID: NumberOrNew, editing: Boolean, taskID: Number },
        load: (params, context) => {
            return import('pages/server-summary-page' /* webpackChunkName: "page-server-summary" */).then((module) => {
                params.module = module;
            });
        }
    },
    'settings-page': {
        path: '/settings/',
        query: {
            edit: '${editing}',
        },
        params: { editing: Boolean },
        load: (params, context) => {
            return import('pages/settings-page' /* webpackChunkName: "page-settings" */).then((module) => {
                params.module = module;
            });
        }
    },
    'start': {
        path: '/',
        load: (params, context) => {
            return import('pages/start-page' /* webpackChunkName: "page-start" */).then((module) => {
                params.module = module;
            });
        },
    },
    'sign-in-page': {
        load: (params, context) => {
            return import('pages/sign-in-page' /* webpackChunkName: "page-sign-in" */).then((module) => {
                params.module = module;
            });
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
        load: (params, context) => {
            return import('pages/user-list-page' /* webpackChunkName: "page-user-list" */).then((module) => {
                params.module = module;
            });
        }
    },
    'user-summary-page': {
        path: '/users/${userID}/',
        query: {
            edit: '${editing}',
        },
        params: { userID: NumberOrNew, editing: Boolean },
        load: (params, context) => {
            return import('pages/user-summary-page' /* webpackChunkName: "page-user-summary" */).then((module) => {
                params.module = module;
            });
        }
    },
    'error-page': {
        load: (params, context) => {
            return import('pages/error-page' /* webpackChunkName: "page-error" */).then((module) => {
                params.module = module;
            });
        }
    },
};

class Route {
    constructor(routeManager) {
        this.routeManager = routeManager;
        this.name = routeManager.name;
        this.params = routeManager.params;
        this.parameters = routeManager.params;
        this.context = routeManager.context;
        this.url = routeManager.url;
        this.path = routeManager.path;
        this.query = routeManager.query;
        this.hash = routeManager.hash;
        this.callbacks = [];
    }

    change(url, options) {
        return this.routeManager.change(url, options);
    }

    find(name, params) {
        return this.routeManager.find(name, params);
    }

    push(name, params) {
        return this.routeManager.push(name, params);
    }

    replace(name, params) {
        return this.routeManager.replace(name, params);
    }

    reanchor(has) {

    }

    keep(callback) {
        this.callbacks.push(callback);
    }

    free(callback) {
        var index = this.callbacks.indexOf(callback);
        if (index !== -1) {
            this.callbacks.splice(index, 1);
        }
    }
};

module.exports = {
    routes,
};
