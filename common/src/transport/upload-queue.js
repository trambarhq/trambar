module.exports = UploadQueue;

function UploadQueue(uploadManager) {

    this.attachResources = function(object) {
        uploadManager.attachResources(object);
    };

    this.queueResources = function(object) {
        uploadManager.queueResources(object);
    };

    this.sendResources = function(object) {
        uploadManager.sendResources(object);
    };
}
