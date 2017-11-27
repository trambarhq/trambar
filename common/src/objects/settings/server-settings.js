exports.default = {
};

if (process.env.NODE_ENV !== 'production') {
    exports.typedef = {
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
            roles: Array(Number),
        },
    }
}
