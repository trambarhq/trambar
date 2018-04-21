var _ = require('lodash');
var Promise = require('bluebird');
var FileError = require('errors/file-error');

module.exports = {
    sync,
    getDeploymentNames,
    loadDeploymentName,
    saveDeploymentName,
};

var deploymentNames = [ 'Production', 'Staging', 'Development' ];
var deploymentKeys = {
    android: {
        Production: 'mwgABsCDDa9F2RhCP_cQ7QUF21c316dff513-0bda-4eff-8585-a112bd2d2a35',
        Staging: '13mEh6dsZ6mqzr1PTxnfa8K1cKhH16dff513-0bda-4eff-8585-a112bd2d2a35',
        Development: '54cd-TPVAON2tP2W-XPfBKaWD7C416dff513-0bda-4eff-8585-a112bd2d2a35',
    },
    ios: {
        Production: '3nM-0mvNP3mRtbPzbuvhiJT-VdbV16dff513-0bda-4eff-8585-a112bd2d2a35',
        Staging: 'IIQiAOWvfVp70mEsaXtVNYerR8pj16dff513-0bda-4eff-8585-a112bd2d2a35',
        Development: 'vetTdgV7cfxo3Sj8-sdV8MvEUzHm16dff513-0bda-4eff-8585-a112bd2d2a35',
    },
};
var defaultDeploymentName = 'Production';

/**
 * Run code synchronization
 *
 * @return {Promise<Boolean>}
 */
function sync() {
    return loadDeploymentName().then((deployment) => {
        if (!window.cordova) {
            return 'NOT_CORDOVA';
        }
        var platform = cordova.platformId;
        var deploymentKey = _.get(deploymentKeys, [ platform, deployment ]);
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
    });
}

/**
 * Return available deployment names
 *
 * @return {Array<String>}
 */
function getDeploymentNames() {
    return deploymentNames;
}

/**
 * Get the deployment name from a file stored on device
 *
 * @return {Promise<String>}
 */
function loadDeploymentName() {
    return readTextFile('codepush').then((name) => {
        if (!_.includes(deploymentNames, name)) {
            throw new Error(`Unrecognized deployment name: ${name}`);
        }
        return name;
    }).catch((err) => {
        return defaultDeploymentName;
    });
}

/**
 * Write the desired deployment name to a file stored on device
 *
 * @return {Promise}
 */
function saveDeploymentName(type) {
    return writeTextFile('codepush', type);
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
