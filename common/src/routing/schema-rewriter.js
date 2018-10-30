const SchemaRewriter = {
    from: (urlParts, context) => {
        let regExp = /^(\/([\w\-]+))(\/|$)/;
        let m = regExp.exec(urlParts.path);
        if (m) {
            context.schema = m[2];
            urlParts.path = urlParts.path.substr(m[1].length);
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
