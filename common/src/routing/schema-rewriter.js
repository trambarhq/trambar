const SchemaRewriter = {
    from: (urlParts, context) => {
        let regExp = new RegExp('^/([^/]+)');
        let m = regExp.exec(urlParts.path);
        if (m) {
            context.schema = m[1];
            urlParts.path = urlParts.path.substr(m[0].length);
        }
    },
    to: (urlParts, context) => {
        let schema = context.schema;
        if (schema) {
            urlParts.path = `/${schema}` + urlParts.path;
        }
    }
};

export {
    SchemaRewriter as default,
};
