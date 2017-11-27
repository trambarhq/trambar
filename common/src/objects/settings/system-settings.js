exports.default = {
};

if (process.env.NODE_ENV !== 'production') {
    exports.typedef = {
        input_languages: Array(String),
        address: String,
        push_relay: String,
    }
}
