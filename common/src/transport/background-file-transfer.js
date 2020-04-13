const FileTransferManager = window.FileTransferManager;

const transfers = [];
let uploader;

function initializeBackgroundTransfer() {
  try {
    uploader = FileTransferManager.init();
    uploader.on('success', (upload) => {
      const transfer = transfers.find(t => t.id === upload.id);
      if (transfer && transfer.onSuccess) {
        transfer.onSuccess(upload);
      }
      transfers.splice(transfers.indexOf(transfer), 1);
    });
    uploader.on('progress', (upload) => {
      let transfer = transfers.find(t => t.id === upload.id);
      if (transfer && transfer.onProgress) {
        transfer.onProgress(upload);
      }
    });
    uploader.on('error', (upload) => {
      let transfer = transfers.find(t => t.id === upload.id);
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
 * @param  {string} token
 * @param  {string} path
 * @param  {string} url
 * @param  {Object|undefined} options
 */
function performBackgroundTransfer(token, path, url, options) {
  const { headers = {}, parameters = {}, onSuccess, onError, onProgress } = options || {};
  const payload = {
    id: token,
    filePath: path,
    serverUrl: url,
    fileKey: 'file',
    headers,
    parameters,
  };
  uploader.startUpload(payload);
  const transfer = {
    id: token,
    onSuccess,
    onError,
    onProgress,
  };
  transfers.push(transfer);
}

/**
 * Cancel an upload
 *
 * @param  {string} token
 */
function cancelBackgroundTransfer(token) {
  return new Promise((resolve, reject) => {
    const success = (res) => {
      resolve(res);
    };
    const fail = (msg) => {
      reject(new Error(msg.error));
    };
    uploader.removeUpload(token, success, fail);
  });
}

export {
  initializeBackgroundTransfer,
  performBackgroundTransfer,
  cancelBackgroundTransfer,
};
