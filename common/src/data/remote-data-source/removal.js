var Storage = require('data/remote-data-source/storage');

module.exports = Removal;

function Removal(location, objects) {
    Storage.call(this, location, objects, { onConflict: false });
    if (!this.isLocal()) {
        // removal of remote objects is implemented as setting its deleted flag
        this.objects = _.map(objects, (object) => {
            return {
                id: object.id,
                deleted: true,
            };
        });
    }
}

Removal.prototype = Object.create(Storage.prototype)
