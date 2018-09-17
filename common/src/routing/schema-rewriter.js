const SchemaRewriter = {
    from: (urlParts, context) => {
        var regExp = new RegExp('^/([^/]*)');
        var m = regExp.exec(urlParts.path);
        if (m) {
            context.schema = m[1];
        }
    },
    to: (urlParts, context) => {
        var schema = context.schema;
        if (schema) {
            urlParts.path = `/${schema}` + urlParts.path;
        }
    }
};

export {
    SchemaRewriter as default,
};
