module.exports = Payloads;

function Payloads(payloadManager) {
    this.get = function(res) {
        return payloadManager.get(res);
    };

    this.queue = function(res) {
        return payloadManager.queue(res);
    };

    this.find = function(criteria) {
        return payloadManager.find(criteria);
    },

    this.send = function(payloadId) {
        return payloadManager.send(payloadId);
    };

    this.abort = function(payloadId) {
        return payloadManager.abort(payloadId);
    };

    this.stream = function(stream) {
        return payloadManager.stream(stream);
    };
}
