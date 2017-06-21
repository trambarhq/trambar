module.exports = UploadQueue;

function UploadQueue(uploadManager) {

    this.attachResources = function(object) {
        return uploadManager.attachResources(object);
    };

    this.queueResources = function(object) {
        return uploadManager.queueResources(object);
    };

    this.sendResources = function(object) {
        return uploadManager.sendResources(object);
    };
}
