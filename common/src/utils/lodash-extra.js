var _ = require('lodash');

var emptyObject = {};

_.mixin({
    /**
     * Clone objects along a path
     *
     * @param  {Object} srcObj
     * @param  {String|Array<String>} path
     * @param  {Object} defaultValue
     *
     * @return {Object}
     */
    decouple: function(srcObj, path, defaultValue) {
        if (typeof(path) === 'string') {
            path = _.split(path, '.');
        } else if (!(path instanceof Array)) {
            path = [ path ];
        }
        if (!defaultValue) {
            defaultValue = emptyObject;
        }
        var dstObj = _.clone(srcObj);
        if (!(dstObj instanceof Object)) {
            dstObj = {};
        }
        var dstParent = dstObj;
        var srcParent = srcObj;
        for (var i = 0; i < path.length; i++) {
            var key = path[i];
            var srcChild = srcParent ? srcParent[key] : undefined;
            var dstChild = _.clone(srcChild);
            if (i === path.length - 1) {
                // make sure the node at the end of the path matches the type
                // of the default value
                if (!(dstChild instanceof defaultValue.constructor)) {
                    dstChild = defaultValue;
                }
            } else {
                if (!(dstChild instanceof Object)) {
                    dstChild = {};
                }
            }
            dstParent[key] = dstChild;
            dstParent = dstChild;
            srcParent = srcChild;
        }
        return dstObj;
    },

    /**
     * Clone objects along path to parent, then set property
     *
     * @param  {Object} srcObj
     * @param  {String|Array<String>} path
     * @param  {*} value
     *
     * @return {Object}
     */
    decoupleSet: function(srcObj, path, value) {
        if (typeof(path) === 'string') {
            path = _.split(path, '.');
        } else if (!(path instanceof Array)) {
            path = [ path ];
        }
        if (path.length < 0) {
            throw new Error('Empty path');
        }
        var parentPath = _.slice(path, 0, -1);
        var dstObj = _.decouple(srcObj, parentPath, {});
        _.set(dstObj, path, value);
        return dstObj;
    },

    /**
     * Clone objects along path to parent, then unset property
     *
     * @param  {Object} srcObj
     * @param  {String|Array<String>} path
     *
     * @return {Object}
     */
    decoupleUnset: function(srcObj, path) {
        if (typeof(path) === 'string') {
            path = _.split(path, '.');
        } else if (!(path instanceof Array)) {
            path = [ path ];
        }
        if (path.length < 0) {
            throw new Error('Empty path');
        }
        var parentPath = _.slice(path, 0, -1);
        var dstObj = _.decouple(srcObj, parentPath, {});
        _.unset(dstObj, path);
        return dstObj;
    },

    /**
     * Clone objects along path, then push value into targetted array
     *
     * @param  {Object} srcObj
     * @param  {String|Array<String>} path
     * @param  {*} ...value
     *
     * @return {Object}
     */
    decouplePush: function(srcObj, path, ...values) {
        var dstObj = _.decouple(srcObj, path, []);
        var array = _.get(dstObj, path);
        Array.prototype.push.apply(array, values);
        return dstObj;
    },

    /**
     * Return properties in objA that are different in objB
     *
     * @param  {Object} objA
     * @param  {Object} objB
     *
     * @return {Object}
     */
    shallowDiff: function(objA, objB) {
        return _.pickBy(objA, (value, name) => {
            return objB[name] !== value;
        });
    },

    /**
     * Obscure properties in an object
     *
     * @param  {Object} object
     * @param  {Array<String>} paths
     *
     * @return {Object}
     */
    obscure: function(object, paths) {
        var clone = _.cloneDeep(object);
        _.each(paths, (path) => {
            var value = _.get(clone, path);
            _.set(clone, path, obscureValue(value));
        });
        return clone;
    },

    /**
     * Parse an integer, the string isn't the exact representation
     *
     * @param  {String} s
     *
     * @return {Number}
     */
    strictParseInt: function(s) {
        var n = _.parseInt(s);
        if (n.toString() !== s) {
            throw new Error(`Not an integer: ${s}`);
        }
        return n;
    },

    /**
     * Return file size in human readable form
     *
     * @param  {Number} bytes
     *
     * @return {String}
     */
    fileSize(bytes) {
        if (bytes < 1024) {
            return bytes + 'B';
        }
        var kilobytes = bytes / 1024;
        if (kilobytes < 1024) {
            return _.round(kilobytes) + 'KB';
        }
        var megabytes = kilobytes / 1024;
        if (megabytes < 1024) {
            return _.round(megabytes, 1) + 'MB';
        }
        var gigabytes = megabytes / 1024;
        return _.round(gigabytes, 2) + 'GB';
    },
});

function obscureValue(value) {
    switch (typeof(value)) {
        case 'number': return 0;
        case 'string': return _.repeat('x', value.length);
        case 'boolean': return false;
        case 'object':
            if (value instanceof Array) {
                return _.map(value, obscureValue);
            } else {
                return _.mapValues(value, obscureValue);
            }
    }
}
