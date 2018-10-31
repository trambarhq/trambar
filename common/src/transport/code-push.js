import _ from 'lodash';
import Promise from 'bluebird';
import Moment from 'moment';
import FileError from 'errors/file-error';
import EventEmitter, { GenericEvent } from 'relaks-event-emitter';

const defaultOptions = {
};

class CodePush {
    constructor(options) {
        this.options = _.defaults({}, options, defaultOptions);
        this.lastSyncStatus = null;
        this.lastSyncTime = null;
        this.currentPackage = null;
        this.pendingPackage = null;
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
        var names = this.getDeploymentNames();
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
     * Run code synchronization
     */
    checkForUpdate() {
        this.loadDeploymentName().then((deployment) => {
            if (process.env.NODE_ENV !== 'production') {
                return 'NOT_PRODUCTION';
            }
            if (typeof(cordova) !== 'object') {
                return 'NOT_CORDOVA';
            }
            var platform = cordova.platformId;
            var deploymentKey = _.get(this.options.keys, [ platform, deployment ]);
            if (deploymentKey) {
                return new Promise((resolve, reject) => {
                    var callback = (status) => {
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
            } else {
                return 'NO_DEPLOYMENT_KEY';
            }
        }).then((result) => {
            this.lastSyncStatus = result;
            this.lastSyncTime = Moment().toISOString();
            if (result === 'UPDATE_INSTALLED') {
                this.getPendingPackage().then((pkg) => {
                    this.pendingPackage = pkg;
                });
            }
        });
    }
}

function readTextFile(filename) {
    return new Promise((resolve, reject) => {
        requestFileSystem(LocalFileSystem.PERSISTENT, 0, (fs) => {
            fs.root.getFile(filename, { create: false, exclusive: false }, (fileEntry) => {
                fileEntry.file((file) => {
                    var reader = new FileReader;
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
        var blob = new Blob([ text ], { type: 'text/plain' })
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
