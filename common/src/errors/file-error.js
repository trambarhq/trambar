class FileError extends Error {
    constructor(code) {
        super();
        if (code instanceof Object) {
            code = code.code;
        }
        this.code = code;
        this.message = errorMessages[code];
    }
}

const errorMessages = {
    1: 'A required file or directory could not be found at the time an operation was processed',
    2: 'Access to the file was denied',
    3: 'Operation was aborted',
    4: 'The file or directory cannot be read',
    5: 'The URL is malformed',
    6: 'The state of the underlying file system prevents any writing to a file or a directory',
    7: 'The operation cannot be performed on the current state of the interface object',
    8: 'Synax error',
    9: 'The modification requested is not allowed',
    10: 'Not enough remaining storage space or the storage quota was reached',
    11: 'The app looked up an entry, but the entry found is of the wrong type',
    12: 'The file or directory with the same path already exists'
};

export {
    FileError as default,
    FileError,
};
