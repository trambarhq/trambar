module.exports = UploadQueue;

function UploadQueue(uploadManager) {

    this.attachResources = function(object) {
        return uploadManager.attachResources(object);
    };

    this.downloadNextResource = function(object) {
        return uploadManager.downloadNextResource(object);
    },

    this.queueResources = function(object) {
        return uploadManager.queueResources(object);
    };

    this.sendResources = function(object) {
        return uploadManager.sendResources(object);
    };
}
