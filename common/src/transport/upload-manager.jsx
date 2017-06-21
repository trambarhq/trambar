var _ = require('lodash');
var React = require('react'), PropTypes = React.PropTypes;
var HttpRequest = require('transport/http-request');

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
        };
    },

    /**
     * Reattach blob that disappeared after saving
     *
     * @param  {Object} object
     */
    attachResources: function(object) {
        var resourceLists = getResources(object);
        _.forIn(resourceLists, (resources, type) => {
            _.each(resources, (res) => {
                if (res.file && _.isEmpty(res.file)) {
                    if (res.task_id) {
                        var transfer = _.find(this.state.queue, { id: taskId });
                        if (transfer && transfer.file) {
                            res.file = transfer.file;
                        }
                    }
                }
            });
        });
    },

    /**
     * Queue resources used by an object
     *
     * @param  {Object} object
     *
     * @return {Promise}
     */
    queueResources: function(object) {
        var promises = [];
        var resourceLists = getResources(object);
        _.forIn(resourceLists, (resources, type) => {
            var action;
            switch (type) {
                case 'image': action = 'upload image'; break;
                case 'video': action = 'upload and transcode video'; break;
                case 'website': action = 'generate website thumbnail'; break;
            }
            // go through each
            _.each(resources, (res) => {
                var params;
                if (type === 'image' || type === 'video') {
                    if (res.file instanceof Blob && !res.task_id) {
                        // a local file
                        params = { file: res.file };
                    } else if (res.external_url && !res.task_id) {
                        // a file at cloud-storage provider
                        params = { url: image.external_url };
                    }
                } else if (type === 'website') {
                    if (res.url && !res.thumbnail_url && !res.task_id) {
                        // ask server to create thumbnail image
                        params = { url: res.url };
                    }
                }
                if (params) {
                    var promise = this.queueTask(action, params).then((taskId) => {
                        // save the task id into the object
                        // we'll use it to update the container object when
                        // the task is done
                        res.task_id = taskId;
                    });
                    promises.push(promise);
                }
            });
        });
        return Promise.all(promises);
    },

    /**
     * Send files queued earlier after, after task id is saved
     *
     * @param  {Object} object
     */
    sendResources: function(object) {
        var resourceLists = getResources(object);
        _.forIn(resourceLists, (resources, type) => {
            _.each(resources, (res) => {
                if (res.task_id) {
                    this.startTask(res.task_id);
                }
            });
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
            onProgress: (evt) => {
                this.updateTransfer(taskId, {
                    transferred: evt.loaded,
                    total: evt.total
                });
            },
        };
        var payload;
        if (transfer.file instanceof Blob) {
            payload = new FormData;
            payload.append('file', transfer.file);
        } else if (transfer.url) {
            payload = { url: transfer.url };
        } else {
            return;
        }
        var route = this.props.route;
        var server = getServerName(route.parameters);
        var protocol = getProtocol(server);
        var schema = route.parameters.schema;
        var url = `${protocol}://${server}`;
        switch (transfer.action) {
            case 'upload image':
                url += `/media/images/upload/${schema}/${taskId}`;
                break;
            case 'upload and transcode video':
                url += `/media/videos/upload/${schema}/${taskId}`;
                break;
            case 'generate website thumbnail':
                url += `/media/html/screenshot/${schema}/${taskId}`;
                break;
            default:
                return;
        }
        url += `?token=${transfer.token}`;
        var promise = HttpRequest.fetch('POST', url, payload, options).then((response) => {
            this.updateTransfer(taskId, { response });
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
    return /^localhost\b/.test(server) ? 'http' : 'https'    ;
}

/**
 * Return list of media objects
 *
 * @param  {Object} object
 *
 * @return {Object}
 */
function getResources(object) {
    return _.pickBy({
        image: _.get(object, 'details.images'),
        video: _.get(object, 'details.videos'),
        website: _.get(object, 'details.websites'),
    }, 'length');
}
