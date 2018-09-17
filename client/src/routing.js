const routes = {
    'bookmarks-page': {
        path: '/bookmarks/',
        load: (params, context) => {
            params.ui = {
                navigation: { section: 'bookmarks' }
            };
            return import('pages/bookmarks-page' /* webpackChunkName: "page-bookmarks" */).then((module) => {
                params.module = module;
            });
        }
    },
    'news-page': {
        path: '/news/',
        query: {
            roles: '${roleIDs}',
            search: '${search}',
            date: '${date}',
        },
        hash: [
            's${anchoredStoryID}',
            'S${highlightedStoryID}',
            'r${anchoredReactionID}',
            'R{$highlightedReactionID}',
        ],
        params: {
            roleIDs: NumberArray,
            search: String,
            date: String,
            story: Number,
            reaction: Number,
        },
        load: (params, context) => {
            let { schema } = context;
            let route = { schema };
            let statistics = { schema,  type: 'daily-activities', public: 'guest' };
            return {
                calendar: { route, statistics },
                filter: { route },
                search: { route, statistics },
                navigation: { route, section: 'news' }
            };
            return import('pages/news-page' /* webpackChunkName: "page-news" */).then((module) => {
                params.module = module;
            });
        }
    },
    'notifications-page': {
        path: '/notifications/',
        query: {
            date: '${date}',
        },
        params: {
            schema: String,
            date: String,
        },
        load: (params, context) => {
            let { schema } = context;
            let route = { schema };
            let statistics = { schema, type: 'daily-notifications', user_id: 'current' };
            params.ui = {
                calendar: { route, statistics },
                navigation: { route, section: 'notifications' }
            };
            return import('pages/notifications-page' /* webpackChunkName: "page-notifications" */).then((module) => {
                params.module = module;
            });
        }
    },
    'people-page': {
        path: '/people/',
        query: {
            roles: '${roles}',
            search: '${search}',
            date: '${date}',
        },
        params: {
            schema: String,
            roles: NumberArray,
            search: String,
            date: String,
        },
        load: (params, context) => {
            let { schema } = params;
            let route = { schema };
            let statistics = { schema, type: 'daily-activities' };
            // go back to full list
            params.ui = {
                calendar: { route, statistics },
                filter: { route },
                search: { route, statistics },
                navigation: { route, section: 'people' }
            }
            return import('pages/people-page' /* webpackChunkName: "page-people" */).then((module) => {
                params.module = module;
            });
        }
    },
    'person-page': {
        path: '/people/${user}/',
        query: {
            search: '${search}',
            date: '${date}',
        }
        hash: [ 'S${story}', 'R${reaction}' ],
        params: {
            schema: String,
            search: String,
            date: String,
            user: Number,
            story: Number,
            reaction: Number,
        },
        load: (params, context) => {
            let { schema, user } = params;
            let route = { schema, user };
            let statistics = { schema, type: 'daily-activities', user_id: user };
            params.ui = {
                calendar: { route, statistics },
                search: { route, statistics },
                navigation: {
                    // go back to full list
                    route: { schema },
                    section: 'people'
                }
            };
            return import('pages/people-page' /* webpackChunkName: "page-people" */).then((module) => {
                params.module = module;
            });
        }
    },
    'settings-page': {
        path: '/settings/',
        params: {
            schema: String,
        },
        load: (params, context) => {
            let { schema } = params;
            let route = { schema };
            params.ui = {
                navigation: { route, section: 'settings '},
            };
            return import('pages/settings-page' /* webpackChunkName: "page-settings" */).then((module) => {
                params.module = module;
            });
        }
    },
    'start-page': {
        path: '/',
        query: {
            add: '${add}',
            ac: '${activationCode}',
            p: '${schema}',
        },
        params: {
            schema: String,
            activationCode: String,
            add: Boolean,
        },
        load: (params, context) => {
            params.ui = {
                navigation: { top: false, bottom: false }
            };
            return import('pages/start-page' /* webpackChunkName: "page-start" */).then((module) => {
                params.module = module;
            });
        },
        public: true,
        signIn: true,
    },
    'error-page': {
        load: (params, context) => {
            return import('pages/error-page' /* webpackChunkName: "page-error" */).then((module) => {
                params.module = module;
            });
        },
    }
}
