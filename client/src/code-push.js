var _ = require('lodash');
var Promise = require('promise');
var CordovaFile = require('transport/cordova-file');
var BlobReader = require('transport/blob-reader');

modules.exports = {
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

loadDeploymentName.then((deployment) => {
    var platform = cordova.platformId;
    var deploymentKey = _.get(deploymentKeys, [ platform, deployment ]);
    if (deploymentKey) {
        codePush.sync(null, { deploymentKey });
    }
});

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
    return Promise.try(() => {
        var configPath = getConfigPath();
        var configFile = new Cordova(configPath);
        return BlobReader.loadText(configFile).then((text) => {
            text = _.trim(text);
            if (!_.include(deploymentNames, text)) {
                throw new Error(`Unknown deployment type: ${text}`);
            }
            return text;
        });
    }).catch((err) => {
        return defaultDeploymentName;
    });
}

/**
 * Write the desired deployment name to a file stored on device
 *
 * @return {Promise<String>}
 */
function saveDeploymentName(type) {
    return Promise.try(() => {
        var configPath = getConfigPath();
        var configFile = new Cordova(configPath);
        return configFile.getFileEntry().then((fileEntry) => {
            fileEntry.createWriter((fileWriter) => {
                return new Promise((resolve, reject) => {
                    fileWriter.onwriteend = function() {
                        resolve();
                    };
                    fileWriter.onerror = function(err) {
                        reject(err);
                    };
                    var blob = new Blob([ type ], { type: 'text/plain' })
                    fileWriter.write(blob);
                });
            });
        });
    })
}

function getConfigPath() {
    return `${cordova.file.dataDirectory}/codepush`;
}
