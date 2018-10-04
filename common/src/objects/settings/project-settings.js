import _ from 'lodash';

let ProjectSettingsTypedef;
if (process.env.NODE_ENV !== 'production') {
    ProjectSettingsTypedef = {
        membership: {
            allow_user_request: Boolean,
            approve_user_request: Boolean,
            allow_guest_request: Boolean,
            approve_guest_request: Boolean,
        },
        access_control: {
            grant_view_access: Boolean,
            grant_comment_access: Boolean,
        },
    }
}

export {
    ProjectSettingsTypedef,
};
