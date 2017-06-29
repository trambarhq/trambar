var _ = require('lodash');
var Promise = require('bluebird');
var React = require('react'), PropTypes = React.PropTypes;
var HttpRequest = require('transport/http-request');
var BlobStream = require('transport/blob-stream');
var Async = require('utils/async-do-while');

var Database = require('data/database');
var Route = require('routing/route');

module.exports = React.createClass({
    displayName: 'UploadManager',
    propTypes: {
        database: PropTypes.instanceOf(Database),
        route: PropTypes.instanceOf(Route),

        onChange: PropTypes.func,
    },

    getInitialState: function() {
        return {
            queue: [],
            files: {},
        };
    },

    /**
     * Reattach blob that disappeared after saving, returning false if
     * downloading of files from server is required
     *
     * @param  {Object} object
     *
     * @return {Boolean}
     */
    attachResources: function(object) {
        var resources = _.get(object, 'details.resources');
        var downloadingRequired = false;
        _.each(resources, (res) => {
            switch (res.type) {
                case 'image':
                    if (!this.attachLocalFile(res, 'file', 'url')) {
                        downloadingRequired = true;
                    }
                    break;
                case 'video':
                case 'website':
                    if (!this.attachLocalFile(res, 'poster_file', 'poster_url')) {
                        downloadingRequired = true;
                    }
                    break;
            }
        });
        return !downloadingRequired;
    },

    /**
     * Download the file that's not available locally
     *
     * @param  {Object} object
     *
     * @return {Promise<Boolean>}
     */
    downloadNextResource: function(object) {
        var resources = _.get(object, 'details.resources');
        var downloadingRequired = false;
        return Promise.reduce(resources, (downloaded, res) => {
            if (downloaded) {
                return true;
            }
            switch (res.type) {
                case 'image':
                    return this.downloadRemoteFile(res, 'file', 'url');
                case 'video':
                case 'website':
                    return this.downloadRemoteFile(res, 'poster_file', 'poster_url');
            }
        }, false);
    },

    /**
     * Queue resources used by an object
     *
     * @param  {Object} object
     *
     * @return {Promise}
     */
    queueResources: function(object) {
        var tasks = [];
        var resources = _.get(object, 'details.resources', []);
        return Promise.each(resources, (res) => {
            if (res.task_id) {
                return;
            }
            var action, params;
            switch (res.type) {
                case 'image':
                    if (!res.url) {
                        if (res.file instanceof Blob) {
                            // a local file
                            action = 'upload image';
                            params = { file: res.file };
                        } else if (res.external_url) {
                            // a file at cloud-storage provider
                            action = 'copy image';
                            params = { url: res.external_url };
                        }
                    }
                    break;
                case 'audio':
                    if (!res.url) {
                        if (res.file instanceof Blob) {
                            action = 'upload and transcode audio';
                            params = {
                                file: res.file,
                            };
                        } else if (res.external_url) {
                            action = 'copy and transcode audio';
                            params = { url: res.external_url };
                        } else if (res.stream) {
                            action = 'copy and transcode audio';
                            params = {
                                stream: res.stream,
                            };
                        }
                    }
                break;
                case 'video':
                    if (!res.url) {
                        if (res.file instanceof Blob) {
                            action = 'upload and transcode video';
                            params = {
                                file: res.file,
                                poster: res.poster_file,
                            };
                        } else if (res.external_url) {
                            action = 'copy and transcode video';
                            params = { url: res.external_url };
                        } else if (res.stream) {
                            action = 'copy and transcode video';
                            params = {
                                stream: res.stream,
                                poster: res.poster_file,
                            };
                        }
                    }
                    break;
                case 'website':
                    if (!res.poster_url) {
                        if (res.url) {
                            action = 'generate website poster';
                            params = { url: res.url };
                        }
                    }
                    break;
            }
            if (action && params) {
                return this.queueTask(action, params).then((taskId) => {
                    // save the task id into the object
                    // we'll use it to update the container object when
                    // the task is done
                    res.task_id = taskId;
                });
            }
        });
    },

    /**
     * Send files queued earlier after, after task id is saved
     *
     * @param  {Object} object
     */
    sendResources: function(object) {
        var resources = _.get(object, 'details.resources');
        _.each(resources, (res) => {
            if (res.task_id) {
                this.startTask(res.task_id);
            }
        });
    },

    /**
     * Send a blobs to server as they're added into a BlobStream
     *
     * @param  {BlobStream} stream
     */
    sendStream: function(stream) {
        var route = this.props.route;
        var server = getServerName(route.parameters);
        var protocol = getProtocol(server);
        var attempts = 1;
        var failureCount = 0;
        var error;
        var done = false;
        Async.while(() => { return !done });
        Async.do(() => {
            // get the next unsent part and send it
            return stream.pull().then((blob) => {
                var url = `${protocol}://${server}/media/stream`;
                if (stream.id) {
                    // append to existing stream
                    url += `/${stream.id}`;
                }
                var payload = new FormData;
                if (blob) {
                    payload.append('file', blob);
                } else {
                    // the server recognize that an empty payload means we've
                    // reached the end of the stream
                    done = true;
                }
                var options = { responseType: 'json' };
                return HttpRequest.fetch('POST', url, payload, options).then((response) => {
                    if (!stream.id) {
                        stream.id = response.id;
                    }
                    if (blob) {
                        stream.finalize(blob);
                    }
                });
            }).catch((err) => {
                if (++failureCount < attempts) {
                    // wait five seconds then try again
                    return Promise.delay(5000);
                } else {
                    error = err;
                    done = true;
                }
            });
        });
        Async.finally(() => {
            if (error) {
                stream.abandon(error);
            }
        });
        Async.end();
    },

    /**
     * Look for a file in the state and attach it to the resource object
     *
     * @param  {Object} res
     * @param  {String} filePropName
     * @param  {String} urlPropName
     *
     * @return {Boolean}
     */
    attachLocalFile: function(res, filePropName, urlPropName) {
        if (res[filePropName] instanceof Blob) {
            return true;
        } else if (res.task_id) {
            // file is still being uploaded--look for it in the queue
            var transfer = _.find(this.state.queue, { id: res.task_id });
            if (transfer && transfer.file) {
                res[filePropName] = transfer.file;
                //console.log('Found local copy of ' + url + ' in upload queue');
                return true;
            } else {
                // upload was interrupted or it's being done on another computer
            }
        } else if (res[urlPropName]) {
            var url = res[urlPropName];
            var file = this.state.files[url];
            if (file) {
                // file was successfully uploaded earlier or we had downloaded it
                res[filePropName] = file;
                //console.log('Found local copy of ' + url);
                return true;
            } else {
                // need to download it
                //console.log('Need to download ' + url);
                return false;
            }
        } else {
            return true;
        }
    },

    /**
     * Download a file and save it in the state
     *
     * @param  {Object} res
     * @param  {String} filePropName
     * @param  {String} urlPropName
     *
     * @return {Promise<Boolean>}
     */
    downloadRemoteFile: function(res, filePropName, urlPropName) {
        return Promise.resolve().then(() => {
            if (res[filePropName] instanceof Blob) {
                return false;
            } else if (res.task_id) {
                return false;
            } else if (res[urlPropName]) {
                var url = res[urlPropName];
                var route = this.props.route;
                var server = getServerName(route.parameters);
                var protocol = getProtocol(server);
                var schema = route.parameters.schema;
                var fullUrl = `${protocol}://${server}` + url;
                var options = { responseType: 'blob' };
                //console.log('Downloading ' + fullUrl);
                return HttpRequest.fetch('GET', fullUrl, null, options).then((blob) => {
                    return new Promise((resolve, reject) => {
                        var files = _.clone(this.state.files);
                        files[url] = blob;
                        this.setState({ files }, () => {
                            resolve(true);
                        });
                    });
                }).catch((err) => {
                    console.error(err);
                    return false;
                });
            }
        });
    },

    /**
     * Create a task object and associate it with an upload
     *
     * @param  {String} action
     * @param  {Object} params
     *
     * @return {Promise<Number>}
     */
    queueTask: function(action, params) {
        var route = this.props.route;
        var server = route.parameters.server;
        var schema = route.parameters.schema;
        var db = this.props.database.use({ server, schema, by: this });
        return db.start().then((userId) => {
            var task = {
                action: action,
                user_id: userId,
            };
            return db.saveOne({ table: 'task' }, task);
        }).then((task) => {
            var transfer = _.assign({
                id: task.id,
                action: task.action,
                token: task.token,
                transferred: 0,
                total: 0,
                promise: null
            }, params);
            var queue = _.concat(this.state.queue, transfer);
            this.setState({ queue }, () => {
                this.triggerChangeEvent();
            });
            return task.id;
        })
    },

    /**
     * Update progress of file transfer
     *
     * @param  {Number} taskId
     * @param  {Object} props
     */
    updateTransfer: function(taskId, props) {
        var index = _.findIndex(this.state.queue, { id: taskId });
        if (index === -1) {
            return;
        }
        var queue = _.slice(this.state.queue);
        var transfer = queue[index] = _.clone(queue[index]);
        _.assign(transfer, props);
        this.setState({ queue }, () => {
            this.triggerChangeEvent();
        });

        if (props.done) {
            // take it out after a minute
            setTimeout(() => {
                var queue = _.slice(this.state.queue);
                var index = _.findIndex(queue, { id: taskId });
                queue.splice(index, 1);
                this.setState({ queue }, () => {
                    this.triggerChangeEvent();
                });
            }, 60 * 1000);
        }
    },

    /**
     * Start sending a file associated with the task
     *
     * @param  {Number} taskId
     */
    startTask: function(taskId) {
        var transfer = _.find(this.state.queue, { id: taskId });
        if (!transfer) {
            return;
        }
        if (transfer.promise) {
            // already started
            return;
        }
        var options = {
            responseType: 'json',
            onProgress: (evt) => {
                this.updateTransfer(taskId, {
                    transferred: evt.loaded,
                    total: evt.total
                });
            },
        };
        var payload = new FormData;
        if (transfer.file instanceof Blob) {
            payload.append('file', transfer.file);
        } else if (transfer.url) {
            payload.append('url', transfer.url);
        } else if (transfer.stream) {
            payload.append('stream', transfer.stream.id);
        }
        if (transfer.poster instanceof Blob) {
            payload.append('poster', transfer.poster);
        }
        var route = this.props.route;
        var server = getServerName(route.parameters);
        var protocol = getProtocol(server);
        var schema = route.parameters.schema;
        var url = `${protocol}://${server}`;
        switch (transfer.action) {
            case 'upload image':
            case 'copy image':
                url += `/media/images/upload/${schema}/${taskId}`;
                break;
            case 'copy and transcode video':
            case 'upload and transcode video':
                url += `/media/videos/upload/${schema}/${taskId}`;
                break;
            case 'copy and transcode audio':
            case 'upload and transcode audio':
                url += `/media/audios/upload/${schema}/${taskId}`;
                break;
            case 'generate website poster':
                url += `/media/html/screenshot/${schema}/${taskId}`;
                break;
            default:
                return;
        }
        url += `?token=${transfer.token}`;
        //console.log('Uploading to ' + url);
        var promise = HttpRequest.fetch('POST', url, payload, options).then((response) => {
            if (transfer.file instanceof Blob) {
                // associate the blob with this URL so we can obtain the data
                var files = _.clone(this.state.files);
                var resourceUrl = _.get(response, 'url');
                if (resourceUrl) {
                    files[resourceUrl] = transfer.file;
                }
                if (transfer.poster instanceof Blob) {
                    var posterUrl = _get(response, 'poster_url');
                    if (posterUrl) {
                        files[posterUrl] = transfer.poster;
                    }
                }
                this.setState({ files });
            }
            this.updateTransfer(taskId, { done: true });
        });
        transfer.promise = promise;
        return promise;
    },

    render: function() {
        return null;
    },

    componentDidUpdate: function(prevProps) {
        if (!prevProps.database && this.props.database) {
            this.triggerChangeEvent();
        }
    },

    triggerChangeEvent: function() {
        if (this.props.onChange) {
            this.props.onChange({
                type: 'change',
                target: this,
            });
        }
    },
});

/**
 * Get the domain name or ip address from a location object
 *
 * @param  {Object} location
 *
 * @return {String}
 */
function getServerName(location) {
    if (location.server === '~') {
        return window.location.hostname;
    } else {
        return location.server;
    }
}

/**
 * Return 'http' if server is localhost, 'https' otherwise
 *
 * @param  {String} server
 *
 * @return {String}
 */
function getProtocol(server) {
    return /^localhost\b/.test(server) ? 'http' : 'http';
}
