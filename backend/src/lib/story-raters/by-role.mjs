import _ from 'lodash';

import Role from '../accessors/role.mjs';

class ByRole {
    constructor() {
        this.type = 'by-role';
        this.calculation = 'immediate';
        this.columns = [ 'role_ids' ];
        this.monitoring = [ 'role' ];
        this.roleCache = [];
    }

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
    async prepareContext(db, schema, stories, listing) {
        let roles = [];
        let roleIds = _.filter(_.uniq(_.flatten(_.map(stories, 'role_ids'))));
        for (let roleId of roleIds) {
            let role = this.findCachedRole(roleId);
            if (!role) {
                role = await this.loadRole(db, roleId);
            }
            if (role) {
                roles.push(role);
            }
        }
        return { roles };
    }

    /**
     * Give a numeric score to a story
     *
     * @param  {Object} context
     * @param  {Story} story
     *
     * @return {Number}
     */
    calculateRating(context, story) {
        let roles = _.filter(context.roles, (role) => {
            return _.includes(story.role_ids, role.id);
        });
        let ratings = _.map(roles, (role) => {
            return _.get(role, 'settings.rating', 0);
        }, 0);
        return _.sum(ratings);
    }

    /**
     * Handle database change events
     *
     * @param  {Object} evt
     */
    handleEvent(evt) {
        if (evt.table === 'role') {
            if (evt.diff.details) {
                this.clearCachedRole(evt.id);
            }
        }
    }

    /**
     * Load role from database, saving it to cache
     *
     * @param  {Database} db
     * @param  {Number} roleId
     *
     * @return {Object|null}
     */
    async loadRole(db, roleId) {
        let criteria = {
            id: roleId,
            deleted: false,
        };
        let row = await Role.findOne(db, 'global', criteria, 'id, settings');
        if (row) {
            this.cacheRole(row);
        }
        return row;
    }

    /**
     * Save role to cache
     *
     * @param  {Object} role
     */
    cacheRole(role) {
        this.roleCache.unshift(role);
        if (this.roleCache.length > 100) {
            this.roleCache.splice(100);
        }
    }

    /**
     * Find cached role
     *
     * @param  {Number} roleId
     *
     * @return {Object|null}
     */
    findCachedRole(roleId) {
        let index = _.findIndex(this.roleCache, { id: roleId });
        if (index === -1) {
            return null;
        }
        let role = this.roleCache[index];
        this.roleCache.splice(index, 1);
        this.roleCache.unshift(role);
        return role;
    }

    /**
     * Remove an entry from cache
     *
     * @param  {Number} roleId
     */
    clearCachedRole(roleId) {
        let index = _.findIndex(this.roleCache, { id: roleId });
        if (index === -1) {
            return;
        }
        this.roleCache.splice(index, 1);
    }
}

const instance = new ByRole;

export {
    instance as default,
    ByRole,
};
