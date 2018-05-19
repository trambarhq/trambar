var _ = require('lodash');
var Promise = require('bluebird');
var React = require('react'), PropTypes = React.PropTypes;
var Moment = require('moment');
var FileError = require('errors/file-error');

// mixins
var UpdateCheck = require('mixins/update-check');

// widgets
var Diagnostics = require('widgets/diagnostics');
var DiagnosticsSection = require('widgets/diagnostics-section');

module.exports = React.createClass({
    displayName: 'CodePush',
    mixins: [ UpdateCheck ],
    propTypes: {
        inForeground: PropTypes.bool,
        keys: PropTypes.object.isRequired,
    },

    statics: {
        instance: null,
    },

    /**
     * Return initial state of component
     *
     * @return {Object}
     */
    getInitialState: function() {
        return {
            lastSyncStatus: null,
            lastSyncTime: null,
            currentPackage: null,
            pendingPackage: null,
        };
    },

    /**
     * Return available deployment names
     *
     * @return {Array<String>}
     */
    getDeploymentNames: function() {
        var keys = _.flatten(_.map(this.props.keys, _.keys));
        return _.uniq(keys);
    },

    /**
     * Get the deployment name from a file stored on device
     *
     * @return {Promise<String>}
     */
    loadDeploymentName: function() {
        var names = this.getDeploymentNames();
        return readTextFile('codepush').then((name) => {
            if (!_.includes(names, name)) {
                throw new Error(`Unrecognized deployment name: ${name}`);
            }
            return name;
        }).catch((err) => {
            return _.first(names);
        });
    },

    /**
     * Write the desired deployment name to a file stored on device
     *
     * @return {Promise}
     */
    saveDeploymentName: function(type) {
        return writeTextFile('codepush', type).then(() => {
            this.checkForUpdate();
            return null;
        });
    },

    /**
     * Retrieves metadata about currently installed package
     *
     * @return {Promise<Object>}
     */
    getCurrentPackage: function() {
        return new Promise((resolve, reject) => {
            if (window.codePush) {
                codePush.getCurrentPackage((pkg) => {
                    resolve(pkg);
                }, (err) => {
                    resolve(null);
                });
            } else {
                resolve(null);
            }
        });
    },

    /**
     * Retrieves metadata about pending package
     *
     * @return {Promise<Object>}
     */
    getPendingPackage: function() {
        return new Promise((resolve, reject) => {
            if (window.codePush) {
                codePush.getPendingPackage((pkg) => {
                    resolve(pkg)
                }, (err) => {
                    resolve(null);
                });
            } else {
                resolve(null);
            }
        });
    },

    /**
     * Run code synchronization
     */
    checkForUpdate: function() {
        this.loadDeploymentName().then((deployment) => {
            if (process.env.NODE_ENV !== 'production') {
                return 'NOT_PRODUCTION';
            }
            if (!window.cordova) {
                return 'NOT_CORDOVA';
            }
            var platform = cordova.platformId;
            var deploymentKey = _.get(this.props.keys, [ platform, deployment ]);
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
            this.setState({
                lastSyncStatus: result,
                lastSyncTime: Moment().toISOString(),
            });
            if (result === 'UPDATE_INSTALLED') {
                this.getPendingPackage().then((pkg) => {
                    this.setState({ pendingPackage: pkg });
                });
            }
            return null;
        });
    },

    /**
     * Check for update on wake
     *
     * @param  {Object} nextProps
     */
    componentWillReceiveProps: function(nextProps) {
        if (!this.props.inForeground && nextProps.inForeground) {
            var hoursAgo = Moment().subtract(4, 'hour').toISOString();
            if (hoursAgo >= this.state.codePushSyncTime) {
                if (this.state.codePushSyncResult !== 'UPDATE_INSTALLED') {
                    this.checkForUpdate();
                }
            }
        }
    },

    /**
     * Check for update after mount
     */
    componentDidMount: function() {
        this.checkForUpdate();
        this.constructor.instance = this;
        this.getCurrentPackage().then((pkg) => {
            this.setState({ currentPackage: pkg });
        });
    },

    /**
     * Remove singleton on unmount
     */
    componentWillUnmount: function() {
        this.constructor.instance = null;
    },

    /**
     * Render diagnostics
     *
     * @return {ReactElement}
     */
    render: function() {
        return (
            <Diagnostics type="code-push">
                <DiagnosticsSection label="Update check">
                    <div>Last check: {this.state.lastSyncTime}</div>
                    <div>Result: {this.state.lastSyncStatus}</div>
                </DiagnosticsSection>
                <CodePushPackageDiagnostics label="Current package" package={this.state.currentPackage} />
                <CodePushPackageDiagnostics label="Pending package" package={this.state.pendingPackage} />
            </Diagnostics>
        );
    },
});

function CodePushPackageDiagnostics(props) {
    if (!props.package) {
        return null;
    }
    var pkg = props.package;
    return (
        <DiagnosticsSection label={props.label}>
            <div>Label: {pkg.label}</div>
            <div>Description: {pkg.description}</div>
            <div>First run: {pkg.isFristRun ? 'yes' : 'no'}</div>
            <div>Mandatory: {pkg.isMandatory ? 'yes' : 'no'}</div>
            <div>Package hash: {_.truncate(pkg.packageHash, { length: 15 })}</div>
            <div>Package size: {pkg.packageSize}</div>
        </DiagnosticsSection>
    );
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
