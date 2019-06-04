class Cancellation extends Error {
    constructor() {
        super('Operation cancelled');
    };
}

export {
    Cancellation as default,
    Cancellation,
};
