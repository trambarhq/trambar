let ServerSettingsTypedef;
if (process.env.NODE_ENV !== 'production') {
    ServerSettingsTypedef = {
        api: {
            access_token: String,
            refresh_token: String,
        },
        oauth: {
            base_url: String,
            client_id: String,
            client_secret: String,
        },
        user: {
            type: String,
            mapping: {
                admin: String,
                user: String,
                external_user: String,
            },
            role_ids: Array(Number),
        },
    }
}

export {
    ServerSettingsTypedef,
};
