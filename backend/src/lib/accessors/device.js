var _ = require('lodash');
var Promise = require('bluebird');
var Request = require('request');
var CSVParse = require('csv-parse');
var ToUTF8 = require('to-utf-8')
var HTTPError = require('errors/http-error');
var Data = require('accessors/data');
var StringSimilarity = require('string-similarity');

module.exports = _.create(Data, {
    schema: 'global',
    table: 'device',
    columns: {
        id: Number,
        gn: Number,
        deleted: Boolean,
        ctime: String,
        mtime: String,
        type: String,
        details: Object,
        uuid: String,
        user_id: Number,
        session_handle: String,
    },
    criteria: {
        id: Number,
        deleted: Boolean,
        type: String,
        uuid: String,
        user_id: Number,
        session_handle: String,
    },

    /**
     * Create table in schema
     *
     * @param  {Database} db
     * @param  {String} schema
     *
     * @return {Promise<Result>}
     */
    create: function(db, schema) {
        var table = this.getTableName(schema);
        var sql = `
            CREATE TABLE ${table} (
                id serial,
                gn int NOT NULL DEFAULT 1,
                deleted boolean NOT NULL DEFAULT false,
                ctime timestamp NOT NULL DEFAULT NOW(),
                mtime timestamp NOT NULL DEFAULT NOW(),
                details jsonb NOT NULL DEFAULT '{}',
                type varchar(32) NOT NULL,
                uuid varchar(128) NOT NULL,
                user_id int NOT NULL,
                session_handle varchar(16) NOT NULL,
                PRIMARY KEY (id)
            );
            CREATE INDEX ON ${table} (user_id) WHERE deleted = false;
            CREATE INDEX ON ${table} (session_handle) WHERE deleted = false;
        `;
        return db.execute(sql);
    },

    /**
     * Grant privileges to table to appropriate Postgres users
     *
     * @param  {Database} db
     * @param  {String} schema
     *
     * @return {Promise<Boolean>}
     */
    grant: function(db, schema) {
        var table = this.getTableName(schema);
        var sql = `
            GRANT SELECT, UPDATE ON ${table} TO auth_role;
            GRANT INSERT, SELECT, UPDATE ON ${table} TO client_role;
            GRANT INSERT, SELECT, UPDATE ON ${table} TO admin_role;
        `;
        return db.execute(sql).return(true);
    },

    /**
     * Attach triggers to the table.
     *
     * @param  {Database} db
     * @param  {String} schema
     *
     * @return {Promise<Boolean>}
     */
    watch: function(db, schema) {
        return this.createChangeTrigger(db, schema).then(() => {
            var propNames = [ 'deleted', 'type', 'user_id', 'session_handle' ];
            return this.createNotificationTriggers(db, schema, propNames);
        });
    },

    /**
     * Export database row to client-side code, omitting sensitive or
     * unnecessary information
     *
     * @param  {Database} db
     * @param  {String} schema
     * @param  {Array<Object>} rows
     * @param  {Object} credentials
     * @param  {Object} options
     *
     * @return {Promise<Object>}
     */
    export: function(db, schema, rows, credentials, options) {
        return Data.export.call(this, db, schema, rows, credentials, options).then((objects) => {
            _.each(objects, (object, index) => {
                var row = rows[index];
                object.user_id = row.user_id;
                object.type = row.type;
                object.session_handle = row.session_handle;

                if (row.user_id !== credentials.user.id) {
                    throw new HTTPError(403);
                }
            });
            return objects;
        });
    },

    /**
     * Import objects sent by client-side code, applying access control
     *
     * @param  {Database} db
     * @param  {String} schema
     * @param  {Array<Object>} objects
     * @param  {Array<Object>} originals
     * @param  {Object} credentials
     * @param  {Object} options
     *
     * @return {Promise<Array>}
     */
    import: function(db, schema, objects, originals, credentials, options) {
        return Data.import.call(this, db, schema, objects, originals, credentials, options).each((object) => {
            if (object.user_id && object.user_id !== credentials.user.id) {
                throw new HTTPError(403);
            }
            console.log(object);
            if (!object.deleted && !object.id) {
                // look for an existing record with the same UUID
                if (object.user_id && object.uuid) {
                    var criteria = {
                        user_id: object.user_id,
                        uuid: object.uuid,
                        deleted: false
                    };
                    return this.findOne(db, schema, criteria, 'id').then((row) => {
                        if (row) {
                            object.id = row.id;
                        }
                        return getDeviceDisplayName(object).then((displayName) => {
                            if (displayName) {
                                _.set(object, 'details.display_name', displayName);
                            }
                        });
                    });
                }
            }
        });
    },

    /**
     * See if a database change event is relevant to a given user
     *
     * @param  {Object} event
     * @param  {User} user
     * @param  {Subscription} subscription
     *
     * @return {Boolean}
     */
    isRelevantTo: function(event, user, subscription) {
        if (subscription.area === 'admin') {
            // admin console doesn't use this object currently
            return false;
        }
        if (Data.isRelevantTo.call(this, event, user, subscription)) {
            if (event.current.user_id === user.id) {
                return true;
            }
        }
        return false;
    },
});

/**
 * Return marketing name of a device
 *
 * @param  {Device} device
 *
 * @return {Promise<String|undefined>}
 */
function getDeviceDisplayName(device) {
    var type = _.get(device, 'type');
    var manufacturer = _.get(device, 'details.manufacturer');
    var model = _.get(device, 'details.name');
    if (type === 'ios') {
        return getAppleDeviceDisplayName(model);
    } else if(type === 'android') {
        return getAndroidDeviceDisplayName(manufacturer, model);
    } else {
        return Promise.resolve();
    }
}

/**
 * Return marketing name of an Apple device
 *
 * @param  {String} model
 *
 * @return {Promise<String|undefined>}
 */
function getAppleDeviceDisplayName(model) {
    var name = appleModelNames[model];
    return Promise.resolve(name);
}

/**
 * Return marketing name of an Android device
 *
 * @param  {String} model
 *
 * @return {Promise<String|undefined>}
 */
function getAndroidDeviceDisplayName(manufacturer, model) {
    return getAndroidDeviceDatabase().then((db) => {
        var key1 = _.toLower(manufacturer);
        var key2 = _.toLower(model);
        var name = _.get(db, [ key1, key2 ]);
        if (!name) {
            // name might not match exactly--look for one that's close enough
            var candidates = [];
            _.each(db, (devices, k1) => {
                var sim1 = StringSimilarity.compareTwoStrings(k1, key1);
                if (sim1 >= 0.75) {
                    _.each(devices, (name, k2) => {
                        var sim2  = StringSimilarity.compareTwoStrings(k2, key2);
                        if (sim2 >= 0.75) {
                            candidates.push({ name, score: sim1 + sim2 });
                        }
                    });
                }
            });
            candidates = _.sortBy(candidates, 'score');
            if (!_.isEmpty(candidates)) {
                name = _.last(candidates).name;
            }
        }
        return Promise.resolve(name);
    });
}

var androidDeviceDatabase = {};

/**
 * Return Android device name database
 *
 * @param  {String} model
 *
 * @return {Promise<Object>}
 */
function getAndroidDeviceDatabase() {
    if (androidDeviceDatabase) {
        return Promise.resolve(androidDeviceDatabase);
    }
    return fetchAndroidDeviceDatabase().then((db) => {
        androidDeviceDatabase = db;
        return db;
    }).catch((err) => {
        return {};
    });
}

/**
 * Download Android device name database
 *
 * @return {Promise<Object>}
 */
function fetchAndroidDeviceDatabase() {
    return new Promise((resolve, reject) => {
        var db = {};
        var line = 0;
        var parser = CSVParse({ delimiter: ',' });
        parser.on('readable', () => {
            var record;
            while(record = parser.read()) {
                if (line++ > 0) {
                    var brand = _.toLower(record[0]);
                    var names = _.split(record[1], /\s,\s/);
                    var name = _.replace(names[0], /_/g, ' ');
                    var model = _.toLower(record[3])
                    _.set(db, [ brand, model ], name);
                }
            }
        });
        parser.on('error', (err) => {
            reject(err);
        });
        parser.on('finish', () => {
            resolve(db);
        });
        var input = Request('http://storage.googleapis.com/play_public/supported_devices.csv');
        input.on('err', (err) => {
            reject(err);
        });
        input.pipe(ToUTF8()).pipe(parser);
    });
}

/**
 * Update Android device name database
 */
function updateAndroidDeviceDatabase() {
    fetchAndroidDeviceDatabase().then((db) => {
        androidDeviceDatabase = db;
    }).catch((err) => {
    });
}

function findClosest(hash, key) {
    if (hash) {
        var entry = hash[key];
        if (!entry) {
            var keys = _.keys(hash);
            var closestKey = StringSimilarity.findBestMatch(key, keys);
            entry = hashs[closestKey];
        }
        return entry;
    }
}

setTimeout(updateAndroidDeviceDatabase, 1000);
setInterval(updateAndroidDeviceDatabase, 7 * 24 * 60 * 60 * 1000);

var appleModelNames = {
    'iPhone1,1': 'iPhone',

    'iPhone1,2': 'iPhone 3G',
    'iPhone2,1': 'iPhone 3GS',

    'iPhone3,1': 'iPhone 4',
    'iPhone3,2': 'iPhone 4',
    'iPhone3,3': 'iPhone 4',
    'iPhone4,1': 'iPhone 4S',

    'iPhone5,1': 'iPhone 5',
    'iPhone5,2': 'iPhone 5',
    'iPhone5,3': 'iPhone 5C',
    'iPhone5,4': 'iPhone 5C',
    'iPhone6,1': 'iPhone 5S',
    'iPhone6,2': 'iPhone 5S',

    'iPhone7,1': 'iPhone 6 Plus',
    'iPhone7,2': 'iPhone 6',
    'iPhone8,1': 'iPhone 6S',
    'iPhone8,2': 'iPhone 6S Plus',
    'iPhone8,4': 'iPhone 6SE',

    'iPhone9,1': 'iPhone 7',
    'iPhone9,2': 'iPhone 7 Plus',
    'iPhone9,3': 'iPhone 7',
    'iPhone9,4': 'iPhone 7 Plus',

    'iPhone10,1': 'iPhone 8',
    'iPhone10,2': 'iPhone 8 Plus',
    'iPhone10,3': 'iPhone X',
    'iPhone10,4': 'iPhone 8',
    'iPhone10,5': 'iPhone 8 Plus',
    'iPhone10,6': 'iPhone X',

    'iPad1,1': 'iPad',
    'iPad2,1': 'iPad 2',
    'iPad2,2': 'iPad 2',
    'iPad2,3': 'iPad 2',
    'iPad2,4': 'iPad 2',

    'iPad2,5': 'iPad mini',
    'iPad2,6': 'iPad mini',
    'iPad2,7': 'iPad mini',

    'iPad3,1': 'iPad (3rd generation)',
    'iPad3,2': 'iPad (3rd generation)',
    'iPad3,3': 'iPad (3rd generation)',

    'iPad3,4': 'iPad (4th generation)',
    'iPad3,5': 'iPad (4th generation)',
    'iPad3,6': 'iPad (4th generation)',

    'iPad4,1': 'iPad Air',
    'iPad4,2': 'iPad Air',
    'iPad4,3': 'iPad Air',

    'iPad4,4': 'iPad mini 2',
    'iPad4,5': 'iPad mini 2',
    'iPad4,6': 'iPad mini 2',

    'iPad4,7': 'iPad mini 3',
    'iPad4,8': 'iPad mini 3',
    'iPad4,9': 'iPad mini 3',

    'iPad5,1': 'iPad mini 4',
    'iPad5,2': 'iPad mini 4',

    'iPad5,3': 'iPad Air 2',
    'iPad5,4': 'iPad Air 2',

    'iPad6,3': 'iPad Pro',
    'iPad6,4': 'iPad Pro',
    'iPad6,7': 'iPad Pro',
    'iPad6,8': 'iPad Pro',

    'iPad6,11': 'iPad (5th generation)',
    'iPad6,12': 'iPad (5th generation)',

    'iPad7,1': 'iPad Pro (2nd generation)',
    'iPad7,2': 'iPad Pro (2nd generation)',
    'iPad7,3': 'iPad Pro (2nd generation)',
    'iPad7,4': 'iPad Pro (2nd generation)',

    'iPad7,5': 'iPad (6th generation)',
    'iPad7,6': 'iPad (6th generation)',
};
