var _ = require('lodash');

module.exports = {
    find,
    create,
    extend,
    pick,
};

/**
 * Find a link in the given object's external array
 *
 * @param  {ExternalData} object
 * @param  {Object} criteria
 *
 * @return {Object|undefined}
 */
function find(object, criteria) {
    return _.find(object.external, (link) => {
        return _.every(criteria, (value, name) => {
            switch (name) {
                case 'server_id':
                    return link.server_id === value;
                case 'server':
                    return link.server_id === value.id;
                case 'type':
                    return link.type === value;
                case 'relation':
                    return link.hasOwnProperty(value);
                case 'related_to':
                    var rel = link[value.relation];
                    if (rel) {
                        var otherCriteria = {
                            server_id: link.server_id
                        };
                        otherCriteria[value.relation] = rel;
                        var otherLink = find(value.object, otherCriteria);
                        return !!otherLink;
                    }
                default:
                    var rel = link[name];
                    var ids1 = getIds(value) ;
                    var ids2 = getIds(rel);
                    return !_.isEmpty(_.intersection(ids1, ids2));
            }
        });
    });
}

/**
 * Return ids stored in relation object
 *
 * @param  {Object} rel
 *
 * @return {Array<Number>|undefined}
 */
function getIds(rel) {
    if (rel instanceof Object) {
        if (rel.ids instanceof Array) {
            return rel.ids;
        } else if (rel.id) {
            return [ rel.id ];
        }
    }
}

/**
 * Create a link to a server and an object there
 *
 * @param  {Server} server
 * @param  {Object} props
 *
 * @return {Object}
 */
function create(server, props) {
    var link = _.assign({
        type: server.type,
        server_id: server.id
    }, props);
    return link;
}

/**
 * Create a link based on another link
 *
 * @param  {Object} parentLink
 * @param  {Object} props
 *
 * @return {Object}
 */
function extend(parentLink, props) {
    var link = _.assign({}, parentLink, props);
    return link;
}

/**
 * Pick a particular link from a record that links to multiple external objects
 *
 * @param  {Object} link
 * @param  {String} relation
 *
 * @return {Object|null}
 */
function pick(link, relation) {
    if (link && link[relation]) {
        var partial = {
            type: link.type,
            server_id: link.server_id,
        };
        partial[relation] = link[relation];
        return partial;
    }
}
