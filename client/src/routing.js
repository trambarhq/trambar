class NumberArray {
    static from(s) {
        if (s) {
            return s.split(',').map((s) => {
                return parseInt(s);
            });
        } else {
            return [];
        }
    }

    static to(a) {
        return a.join(',');
    }
}

class HashMultiIDs {
    constructor(map) {
        this.map = map;
    }

    from(hash, params) {
        let reg = /([a-zA-Z])(\d+)/g
        let m;
        while (m = reg.exec(hash)) {
            let hashName = m[1];
            let id = parseInt(m[2])
            let regExp = new RegExp(`${hashName}(\\d+)`);
            let paramName = this.map[hashName];
            if (paramName) {
                params[paramName] = id;
            }
        }
        return true;
    }

    to(params) {
        let parts = [];
        let used = {};
        for (let hashName in this.map) {
            let paramName = this.map[hashName];
            if (!used[paramName]) {
                let id = params[paramName];
                if (id) {
                    parts.push(hashName + id);
                    used[paramName] = true;
                }
            }
        }
        return parts.join('');
    }
}

const routes = {
    'bookmarks-page': {
        path: '/bookmarks/',
        hash: new HashMultiIDs({
            s: 'scrollToStoryID',
            S: 'highlightStoryID',
        }),
        params: {
            scrollToStoryID: Number,
            highlightStoryID: Number,
        },
        load: async (match) => {
            match.params.ui = {
                navigation: { section: 'bookmarks' }
            };
            match.params.key = `${match.path}${match.search}`;
            match.params.module = await import('pages/bookmarks-page' /* webpackChunkName: "page-bookmarks" */);
        }
    },
    'news-page': {
        path: '/news/',
        query: {
            roles: '${roleIDs}',
            search: '${search}',
            date: '${date}',
        },
        hash: new HashMultiIDs({
            s: 'scrollToStoryID',
            S: 'highlightStoryID',
            r: 'scrollToReactionID',
            R: 'highlightReactionID',
        }),
        params: {
            roleIDs: NumberArray,
            search: String,
            date: String,
            scrollToStoryID: Number,
            highlightStoryID: Number,
            scrollToReactionID: Number,
            highlightReactionID: Number,
        },
        load: async (match) => {
            let statistics = { type: 'daily-activities', public: 'guest' };
            match.params.ui = {
                calendar: { statistics },
                filter: {},
                search: { statistics },
                navigation: { section: 'news' }
            };
            match.params.key = `${match.path}${match.search}`;
            match.params.module = await import('pages/news-page' /* webpackChunkName: "page-news" */);
        }
    },
    'notifications-page': {
        path: '/notifications/',
        query: {
            date: '${date}',
        },
        hash: new HashMultiIDs({
            n: 'scrollToNotificationID',
        }),
        params: {
            date: String,
            scrollToNotificationID: Number,
        },
        load: async (match) => {
            let route = {};
            let statistics = { type: 'daily-notifications', user_id: 'current' };
            match.params.ui = {
                calendar: { statistics },
                navigation: { section: 'notifications' }
            };
            match.params.key = `${match.path}${match.search}`;
            match.params.module = await import('pages/notifications-page' /* webpackChunkName: "page-notifications" */);
        }
    },
    'people-page': {
        path: '/people/',
        query: {
            roles: '${roleIDs}',
            search: '${search}',
            date: '${date}',
        },
        hash: new HashMultiIDs({
            u: 'scrollToUserID',
        }),
        params: {
            roleIDs: NumberArray,
            search: String,
            date: String,
            scrollToUserID: Number,
        },
        load: async (match) => {
            let statistics = { type: 'daily-activities' };
            // go back to full list
            match.params.ui = {
                calendar: { statistics },
                filter: {},
                search: { statistics },
                navigation: { section: 'people' }
            }
            match.params.key = `${match.path}${match.search}`;
            match.params.module = await import('pages/people-page' /* webpackChunkName: "page-people" */);
        }
    },
    'person-page': {
        path: '/people/${selectedUserID}/',
        query: {
            search: '${search}',
            date: '${date}',
        },
        hash: new HashMultiIDs({
            s: 'scrollToStoryID',
            S: 'highlightStoryID',
            r: 'scrollToReactionID',
            R: 'highlightReactionID',
        }),
        params: {
            search: String,
            date: String,
            selectedUserID: Number,
            scrollToStoryID: Number,
            highlightStoryID: Number,
            scrollToReactionID: Number,
            highlightReactionID: Number,
        },
        load: async (match) => {
            // include user ID in URLs generated by search and calendar bar
            let { selectedUserID } = match.params;
            let route = { selectedUserID };
            let statistics = { type: 'daily-activities', user_id: selectedUserID };
            match.params.ui = {
                calendar: { route, statistics },
                search: { route, statistics },
                navigation: { section: 'people' }
            };
            match.params.key = `${match.path}${match.search}`;
            match.params.module = await import('pages/people-page' /* webpackChunkName: "page-people" */);
        }
    },
    'settings-page': {
        path: '/settings/',
        load: async (match) => {
            match.params.ui = {
                navigation: { section: 'settings' },
            };
            match.params.key = match.path;
            match.params.module = await import('pages/settings-page' /* webpackChunkName: "page-settings" */);
        }
    },
    'diagnostics-page': {
        path: '/diagnostics/',
        load: async (match) => {
            match.params.ui = {
                navigation: { section: 'settings' },
            };
            match.params.key = match.path;
            match.params.module = await import('pages/diagnostics-page' /* webpackChunkName: "page-diagnostics" */);
        }
    },
    'start-page': {
        path: '/',
        query: {
            ac: '${activationCode}',
            p: '${activationSchema}',
        },
        params: {
            activationCode: String,
            activationSchema: String,
        },
        load: async (match) => {
            match.params.ui = {
                navigation: { top: false, bottom: false }
            };
            match.params.key = match.path;
            match.params.module = await import('pages/start-page' /* webpackChunkName: "page-start" */);
        },
        start: true,
        signIn: true,
    },
    'error-page': {
        path: '*',
        load: async (match) => {
            match.params.key = match.path;
            match.params.module = await import('pages/error-page' /* webpackChunkName: "page-error" */);
        },
    },
};

export {
    routes,
};
