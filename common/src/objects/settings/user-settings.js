const DefaultUserSettings = {
    notification: {
        like: true,
        comment: true,
        task_completion: true,
        vote: true,
        bookmark: true,
        mention: true,
        coauthor: true,
    },
    web_alert: {
        like: true,
        comment: true,
        task_completion: true,
        vote: true,
        bookmark: true,
        mention: true,
        coauthor: true,
    },
    mobile_alert: {
        like: true,
        comment: true,
        task_completion: true,
        vote: true,
        bookmark: true,
        mention: true,
        coauthor: true,
    },
};

let UserSettingsTypeDef;
if (process.env.NODE_ENV !== 'production') {
    UserSettingsTypeDef = {
        notification: {
            like: Boolean,
            comment: Boolean,
            task_completion: Boolean,
            vote: Boolean,
            bookmark: Boolean,
            task_list: Boolean,
            note: Boolean,
            assignment: Boolean,
            issue: Boolean,
            push: [ String, Boolean ],
            merge: [ String, Boolean ],
            survey: Boolean,
            join_request: Boolean,
            coauthor: Boolean,
        },
        web_alert: {
            like: Boolean,
            comment: Boolean,
            task_completion: Boolean,
            vote: Boolean,
            bookmark: Boolean,
            task_list: Boolean,
            note: Boolean,
            assignment: Boolean,
            issue: Boolean,
            push: Boolean,
            merge: Boolean,
            survey: Boolean,
            join_request: Boolean,
            coauthor: Boolean,
        },
        mobile_alert: {
            like: Boolean,
            comment: Boolean,
            task_completion: Boolean,
            vote: Boolean,
            bookmark: Boolean,
            task_list: Boolean,
            note: Boolean,
            assignment: Boolean,
            issue: Boolean,
            push: Boolean,
            merge: Boolean,
            survey: Boolean,
            join_request: Boolean,
            coauthor: Boolean,
            web_session: Boolean,
        },
    };
}

export {
    DefaultUserSettings,
    UserSettingsTypeDef,
};
