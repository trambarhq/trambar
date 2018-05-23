var _ = require('lodash');
var FileTransferManager = window.FileTransferManager;

module.exports = {
    initialize,
    send,
};

var transfers = [];
var uploader;

function initialize() {
    try {
        uploader = FileTransferManager.init();
        uploader.on('success', function(upload) {
            var transfer = _.find(transfers, { id: upload.id });
            if (transfer && transfer.onSuccess) {
                transfer.onSuccess(upload);
            }
            _.pull(transfers, transfer);
        });
        uploader.on('progress', function(upload) {
            var transfer = _.find(transfers, { id: upload.id });
            if (transfer && transfer.onProgress) {
                transfer.onProgress(upload);
            }
        });
        uploader.on('error', function(upload) {
            var transfer = _.find(transfers, { id: upload.id });
            if (transfer && transfer.onError) {
                transfer.onError(new Error(upload.error));
            }
        });
    } catch(err) {
        uploader = null;
    }
}

/**
 * Queue a file for background upload
 *
 * @param  {String} token
 * @param  {String} path
 * @param  {String} url
 * @param  {Object|undefined} options
 */
function send(token, path, url, options) {
    var payload = {
         id: token,
         filePath: path,
         serverUrl: url,
         fileKey: 'file',
         headers: _.get(options, 'headers', {}),
         parameters: _.get(options, 'parameters', {}),
     };
     uploader.startUpload(payload);
     var transfer = {
         id: token,
         onSuccess: _.get(options, 'onSuccess'),
         onError: _.get(options, 'onError'),
         onProgress: _.get(options, 'onProgress'),
     };
     transfers.push(transfer);
}
