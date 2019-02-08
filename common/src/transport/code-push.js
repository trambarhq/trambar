import _ from 'lodash';
import Moment from 'moment';
import FileError from 'errors/file-error';
import EventEmitter, { GenericEvent } from 'relaks-event-emitter';

const defaultOptions = {
};

class CodePush extends EventEmitter {
    constructor(options) {
        super();
        this.options = _.defaults({}, options, defaultOptions);
        this.lastSyncStatus = '';
        this.lastSyncTime = '';
        this.currentPackage = null;
        this.pendingPackage = null;
    }

    /**
     * Check for update if the given amount of time, specified in seconds,
     * has passed since the last check.
     *
     * @param  {Number} interval
     */
    check(interval) {
        if (interval) {
            let limit = Moment().subtract(interval, 'second').toISOString();
            if (this.lastSyncTime > limit) {
                return;
            }
        }
        this.checkForUpdate();
    }

    /**
     * Return available deployment names
     *
     * @return {Array<String>}
     */
    getDeploymentNames() {
        let keys = _.flatten(_.map(this.options.keys, _.keys));
        return _.uniq(keys);
    }

    /**
     * Get the deployment name from a file stored on device
     *
     * @return {Promise<String>}
     */
    loadDeploymentName() {
        let names = this.getDeploymentNames();
        return readTextFile('codepush').then((name) => {
            if (!_.includes(names, name)) {
                throw new Error(`Unrecognized deployment name: ${name}`);
            }
            return name;
        }).catch((err) => {
            return _.first(names);
        });
    }

    /**
     * Write the desired deployment name to a file stored on device
     *
     * @return {Promise}
     */
    saveDeploymentName(type) {
        return writeTextFile('codepush', type).then(() => {
            this.checkForUpdate();
            return null;
        });
    }

    /**
     * Retrieves metadata about currently installed package
     *
     * @return {Promise<Object>}
     */
    getCurrentPackage() {
        return new Promise((resolve, reject) => {
            if (typeof(codePush) === 'object') {
                codePush.getCurrentPackage((pkg) => {
                    resolve(pkg);
                }, (err) => {
                    resolve(null);
                });
            } else {
                resolve(null);
            }
        });
    }

    /**
     * Retrieves metadata about pending package
     *
     * @return {Promise<Object>}
     */
    getPendingPackage() {
        return new Promise((resolve, reject) => {
            if (typeof(codePush) === 'object') {
                codePush.getPendingPackage((pkg) => {
                    resolve(pkg)
                }, (err) => {
                    resolve(null);
                });
            } else {
                resolve(null);
            }
        });
    }

    /**
     * Check for update
     *
     * @return {Promise}
     */
    checkForUpdate() {
        return this.loadDeploymentName().then((deployment) => {
            let platform = cordova.platformId;
            let deploymentKey = _.get(this.options.keys, [ platform, deployment ]);

            return this.synchronize(deploymentKey).then((result) => {
                this.lastSyncStatus = result;
                this.lastSyncTime = Moment().toISOString();
                if (result === 'UPDATE_INSTALLED') {
                    return this.getPendingPackage().then((pkg) => {
                        this.pendingPackage = pkg;
                    });
                }
            });
        });
    }

    /**
     * Run code synchronization
     *
     * @param  {String} deploymentKey
     *
     * @return {Promise<String>}
     */
    async synchronize(deploymentKey) {
        if (typeof(codePush) !== 'object') {
            return 'NO_PLUGIN';
        }
        if (!deploymentKey) {
            return 'NO_DEPLOYMENT_KEY';
        }
        return new Promise((resolve, reject) => {
            let callback = (status) => {
                switch (status) {
                    case SyncStatus.UPDATE_INSTALLED:
                        resolve('UPDATE_INSTALLED');
                        break;
                    case SyncStatus.UP_TO_DATE:
                        resolve('UP_TO_DATE');
                        break;
                    case SyncStatus.ERROR:
                        resolve('ERROR');
                        break;
                }
            };
            codePush.sync(callback, { deploymentKey });
        });
    }
}

function readTextFile(filename) {
    return new Promise((resolve, reject) => {
        requestFileSystem(LocalFileSystem.PERSISTENT, 0, (fs) => {
            fs.root.getFile(filename, { create: false, exclusive: false }, (fileEntry) => {
                fileEntry.file((file) => {
                    let reader = new FileReader;
                    reader.onload = (evt) => {
                        resolve(reader.result);
                    };
                    reader.onerror = (evt) => {
                        reject(new FileError(3));
                    };
                    reader.readAsText(file);
                }, (err) => {
                    reject(new FileError(err));
                });
            }, (err) => {
                reject(new FileError(err));
            });
        }, (err) => {
            reject(new FileError(err));
        });
    });
}

function writeTextFile(filename, text) {
    return new Promise((resolve, reject) => {
        let blob = new Blob([ text ], { type: 'text/plain' })
        requestFileSystem(LocalFileSystem.PERSISTENT, 0, (fs) => {
            fs.root.getFile('codepush', { create: true, exclusive: false }, (fileEntry) => {
                fileEntry.createWriter((fileWriter) => {
                    fileWriter.onwriteend = function() {
                        resolve();
                    };
                    fileWriter.onerror = function(err) {
                        reject(err);
                    };
                    fileWriter.write(blob);
                });
            }, (err) => {
                reject(new FileError(err));
            });
        }, (err) => {
            reject(new FileError(err));
        });
    });
}

class CodePushEvent extends GenericEvent {
}

export {
    CodePush as default,
    CodePush,
    CodePushEvent,
};
