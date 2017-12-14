var _ = require('lodash');
var Promise = require('bluebird');

var Role = require('accessors/role');

module.exports = {
    type: 'by-role',
    columns: [ 'role_ids' ],
    monitoring: [ 'role' ],
    roleCache: [],

    /**
     * Load data needed to rate the given stories
     *
     * @param  {Database} db
     * @param  {Schema} schema
     * @param  {Array<Story>} stories
     * @param  {Listing} listing
     *
     * @return {Promise<Object>}
     */
    prepareContext: function(db, schema, stories, listing) {
        var missing = [];
        var roles = [];
        var roleIds = _.filter(_.uniq(_.flatten(_.map(stories, 'role_ids'))));
        _.each(roleIds, (roleId) => {
            var role = this.findCachedRole(roleId);
            if (role) {
                roles.push(role);
            } else {
                missing.push(roleId);
            }
        });
        if (_.isEmpty(missing)) {
            return Promise.resolve({ roles });
        } else {
            return Promise.each(missing, (roleId) => {
                return this.loadRole(db, roleId).then((role) => {
                    if (role) {
                        roles.push(role);
                    }
                });
            }).return({ roles });
        }
    },

    /**
     * Give a numeric score to a story
     *
     * @param  {Object} context
     * @param  {Story} story
     *
     * @return {Number}
     */
    calculateRating: function(context, story) {
        var roles = _.filter(context.roles, (role) => {
            return _.includes(story.role_ids, role.id);
        });
        var ratings = _.map(roles, (role) => {
            return _.get(role, 'settings.rating', 0);
        }, 0);
        return _.max(ratings);
    },

    /**
     * Handle database change events
     *
     * @param  {Object} evt
     */
    handleEvent: function(evt) {
        if (evt.table === 'role') {
            if (evt.diff.details) {
                this.clearCachedRole(evt.id);
            }
        }
    },

    /**
     * Load role from database, saving it to cache
     *
     * @param  {Database} db
     * @param  {Number} roleId
     *
     * @return {Object|null}
     */
    loadRole: function(db, roleId) {
        var criteria = {
            id: roleId,
            deleted: false,
        };
        return Role.findOne(db, 'global', criteria, 'id, settings').then((row) => {
            if (row) {
                this.cacheRole(row);
            }
            return row;
        });
    },

    /**
     * Save role to cache
     *
     * @param  {Object} role
     */
    cacheRole: function(role) {
        this.roleCache.unshift(role);
        if (this.roleCache.length > 100) {
            this.roleCache.splice(100);
        }
    },

    /**
     * Find cached role
     *
     * @param  {Number} roleId
     *
     * @return {Object|null}
     */
    findCachedRole: function(roleId) {
        var index = _.findIndex(this.roleCache, { id: roleId });
        if (index === -1) {
            return null;
        }
        var role = this.roleCache[index];
        this.roleCache.splice(index, 1);
        this.roleCache.unshift(role);
        return role;
    },

    /**
     * Remove an entry from cache
     *
     * @param  {Number} roleId
     */
    clearCachedRole: function(roleId) {
        var index = _.findIndex(this.roleCache, { id: roleId });
        if (index === -1) {
            return;
        }
        this.roleCache.splice(index, 1);
    },
};
