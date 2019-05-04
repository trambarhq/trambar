import Storage from './storage.mjs';

class Removal extends Storage {
    constructor(location, objects) {
        super(location, objects, { onConflict: false });
        if (!this.local) {
            // removal of remote objects is implemented as setting its deleted flag
            this.objects = _.map(objects, (object) => {
                return {
                    id: object.id,
                    deleted: true,
                };
            });
        }
    }
}

export {
    Removal as default,
    Removal,
};
