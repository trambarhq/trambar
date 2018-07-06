var _ = require('lodash');

module.exports = {
    unpack,
};

/**
 * Parse and expand a notification received from websocket or push
 *
 * @param  {Object} payload
 *
 * @return {Object|null}
 */
function unpack(payload) {
    if (payload.changes) {
        return {
            type: 'change',
            changes: unpackChanges(payload),
        };
    } else if (payload.alert) {
        return {
            type: 'alert',
            alert: unpackAlert(payload),
        };
    } else if (payload.revalidation) {
        return {
            type: 'revalidation',
            revalidation: unpackInvalidation(payload),
        };
    } else if (payload.socket) {
        return {
            type: 'connection',
            connection: unpackSocket(payload),
        };
    } else if (payload.address && payload.schema && payload.notification_id) {
        return {
            type: 'alert',
            alert: unpackPushAlert(payload),
        };
    } else {
        return null;
    }
}

/**
 * Unpack a change notification to a list of changes
 *
 * @param  {Object} payload
 *
 * @return {Array<Object>}
 */
function unpackChanges(payload) {
    var list = [];
    var address = payload.address;
    _.each(payload.changes, (info, key) => {
        var parts = _.split(key, '.');
        var schema = parts[0];
        var table = parts[1];
        _.each(info.ids, (id, index) => {
            var gn = info.gns[index];
            list.push({ address, schema, table, id, gn });
        });
    });
    return list;
}

/**
 * Attach base address to relative URLs in an alert
 *
 * @param  {Object} payload
 *
 * @return {Object}
 */
function unpackAlert(payload) {
    var address = payload.address;
    var alert = _.clone(payload.alert);
    alert.address = address;
    if (alert.profile_image) {
        alert.profile_image = address + alert.profile_image;
    }
    if (alert.attached_image) {
        alert.attached_image = address + alert.attached_image;
    }
    return alert;
}

/**
 * Add address to a cache revalidation request
 *
 * @param  {Object} payload
 *
 * @return {Object}
 */
function unpackInvalidation(payload) {
    var address = payload.address;
    var revalidation = _.clone(payload.revalidation);
    revalidation.address = address;
    return revalidation;
}

/**
 * Create a connection object from socket id
 *
 * @param  {Object} payload
 *
 * @return {Object}
 */
function unpackSocket(payload) {
    return {
        method: 'websocket',
        relay: null,
        token: payload.socket,
        address: payload.address,
        details: {
            user_agent: navigator.userAgent
        },
    };
}

/**
 * Extract information needed for handling a click on a mobile alert
 *
 * @param  {Object} payload
 *
 * @return {Object}
 */
function unpackPushAlert(payload) {
    return {
        title: '',
        message: '',
        type: payload.type,
        address: payload.address,
        schema: payload.schema,
        notification_id: parseInt(payload.notification_id),
        reaction_id: parseInt(payload.reaction_id),
        story_id: parseInt(payload.story_id),
        user_id: parseInt(payload.user_id),
        foreground: !!payload.foreground,
    };
}
