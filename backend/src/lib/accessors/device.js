import _ from 'lodash';
import Promise from 'bluebird';
import Request from 'request';
import CSVParse from 'csv-parse';
import ToUTF8 from 'to-utf-8'
import HTTPError from 'errors/http-error';
import Data from 'accessors/data';
import StringSimilarity from 'string-similarity';

const Device = _.create(Data, {
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
        return Data.import.call(this, db, schema, objects, originals, credentials, options).each((deviceReceived) => {
            if (!deviceReceived.deleted && !deviceReceived.id) {
                // look for an existing record with the same UUID
                if (deviceReceived.user_id && deviceReceived.uuid) {
                    var criteria = {
                        user_id: deviceReceived.user_id,
                        uuid: deviceReceived.uuid,
                        deleted: false
                    };
                    return this.findOne(db, schema, criteria, 'id').then((row) => {
                        if (row) {
                            deviceReceived.id = row.id;
                        }
                        if (deviceReceived.type && deviceReceived.details) {
                            return fixDeviceDetails(deviceReceived);
                        }
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

    /**
     * Throw an exception if modifications aren't permitted
     *
     * @param  {Object} deviceReceived
     * @param  {Object} deviceBefore
     * @param  {Object} credentials
     */
    checkWritePermission: function(deviceReceived, deviceBefore, credentials) {
        if (credentials.unrestricted) {
            return;
        }
        if (deviceReceived.user_id && deviceReceived.user_id !== credentials.user.id) {
            throw new HTTPError(403);
        }
    },
});

/**
 * Attach marketing name to device details if found and fix manufacturer name
 *
 * @param  {Device} device
 *
 * @return {Promise}
 */
function fixDeviceDetails(device) {
    var type = device.type;
    var manufacturer = device.details.manufacturer;
    var model = device.details.name;
    return getDeviceDisplayName(type, manufacturer, model).then((displayName) => {
        device.details.display_name = displayName;
        device.details.manufacturer = getManufactureName(manufacturer);
    });
}

/**
 * Return proper name of manufacturer (if different from what the phone reports)
 *
 * @param  {String} manufacturer
 *
 * @return {String}
 */
function getManufactureName(manufacturer) {
    switch (manufacturer) {
        case 'MicrosoftMDG':
            return 'Microsoft';
        default:
            return manufacturer;
    }
}

/**
 * Return marketing name of a device
 *
 * @param  {String} type
 * @param  {String} manufacturer
 * @param  {String} model
 *
 * @return {Promise<String|undefined>}
 */
function getDeviceDisplayName(type, manufacturer, model) {
    if (type === 'ios') {
        return getAppleDeviceDisplayName(model);
    } else if (type === 'android') {
        return getAndroidDeviceDisplayName(manufacturer, model);
    } else if (type === 'windows') {
        return getWindowsDeviceDisplayName(model);
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
    var name = _.findKey(appleModelNumbers, (regExp) => {
        return regExp.test(model);
    });
    return Promise.resolve(name);
}

/**
 * Return marketing name of a Windows device
 *
 * @param  {String} model
 *
 * @return {Promise<String|undefined>}
 */
function getWindowsDeviceDisplayName(model) {
    var name = _.findKey(wpModelNumbers, (regExp) => {
        return regExp.test(model);
    });
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

if (process.env.POSTGRES_USER !== 'admin_role') {
    setTimeout(updateAndroidDeviceDatabase, 1000);
    setInterval(updateAndroidDeviceDatabase, 7 * 24 * 60 * 60 * 1000);
}

var appleModelNumbers = {
    'iPhone': /iPhone1,1/,
    'iPhone 3G': /iPhone1,2/,
    'iPhone 3GS': /iPhone2,1/,
    'iPhone 4': /iPhone3,[123]/,
    'iPhone 4S': /iPhone4,1/,
    'iPhone 5': /iPhone5,[12]/,
    'iPhone 5C': /iPhone5,[34]/,
    'iPhone 5S': /iPhone6,[12]/,
    'iPhone 6': /iPhone7,2/,
    'iPhone 6 Plus': /iPhone7,1/,
    'iPhone 6S': /iPhone8,1/,
    'iPhone 6S Plus': /iPhone8,2/,
    'iPhone 6SE': /iPhone8,4/,
    'iPhone 7': /iPhone9,[13]/,
    'iPhone 7 Plus': /iPhone9,[24]/,
    'iPhone 8': /iPhone10,[14]/,
    'iPhone 8 Plus': /iPhone10,[25]/,
    'iPhone X': /iPhone10,[36]/,

    'iPad': /iPad1,1/,
    'iPad 2': /iPad2,[1234]/,
    'iPad mini': /iPad2,[567]/,
    'iPad (3rd generation)': /iPad3,[123]/,
    'iPad (4th generation)': /iPad3,[456]/,
    'iPad Air': /iPad4,[123]/,
    'iPad mini 2': /iPad4,[456]/,
    'iPad mini 3': /iPad4,[789]/,
    'iPad mini 4': /iPad5,[12]/,
    'iPad Air 2': /iPad5,[34]/,
    'iPad Pro': /iPad6,[3478]/,
    'iPad (5th generation)': /iPad6,1[12]/,
    'iPad Pro (2nd generation)': /iPad7,[1234]/,
    'iPad (6th generation)': /iPad7,[56]/,
};

var wpModelNumbers = {
    'Lumia 532': /RM\-(1032|1034|1115)/,
    'Lumia 535': /RM\-(1089|1090|1091|1092)/,
    'Lumia 550': /RM\-(1127|1128|1129)/,
    'Lumia 630': /RM\-(976|977|978|979)/,
    'Lumia 635': /RM\-(975)/,
    'Lumia 636': /RM\-(1027)/,
    'Lumia 638': /RM\-(1010)/,
    'Lumia 640': /RM\-(1072|1073|1074|1075|1076|1077|1113)/,
    'Lumia 640XL': /RM\-(1062|1063|1064|1065|1066|1067|1096)/,
    'Lumia 650': /RM\-(1150|1152|1153|1154)/,
    'Lumia 730': /RM\-(1040)/,
    'Lumia 735': /RM\-(1039)/,
    'Lumia 830': /RM\-(983|984|985|1049)/,
    'Lumia 1520': /RM\-(937|939|938|940)/,
    'Lumia 950': /RM\-(1104|1105|1118)/,
    'Lumia 950XL': /RM\-(1085|1116)/,
    'Lumia Icon': /RM\-(927)/,
};

export {
    Device as default,
    Device,
};
