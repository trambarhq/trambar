var Operation = require('data/remote-data-source/operation');

module.exports = Storage;

function Storage(location, objects, options) {
    Operation.call(this, location);
    this.objects = objects;
    this.options = options || {};
    this.canceled = false;
}

Storage.prototype = Object.create(Operation.prototype)
