class HTTPError extends Error {
  constructor() {
    super();
    for (let i = 0; i < arguments.length; i++) {
      let arg = arguments[i];
      if (typeof(arg) === 'number') {
        this.statusCode = arg;
      } else if (typeof(arg) === 'string') {
        this.message = arg;
      } else if (typeof(arg) === 'object') {
        for (let key in arg) {
          this[key] = arg[key];
        }
      }
    }
    if (!this.statusCode) {
      this.statusCode = 500;
    }
    if (!this.hasOwnProperty('name')) {
      this.name = httpErrorNames[this.statusCode];
    }
    if (!this.hasOwnProperty('message')) {
      this.message = this.name;
    }
  }
}

class FileError extends Error {
  constructor(code) {
    super();
    if (code instanceof Object) {
      code = code.code;
    }
    this.code = code;
    this.message = fileErrorMessages[code];
  }
}

const httpErrorNames = {
  400: 'Bad Request',
  401: 'Unauthorized',
  402: 'Payment Required',
  403: 'Forbidden',
  404: 'Not Found',
  405: 'Method Not Allowed',
  406: 'Not Acceptable',
  407: 'Proxy Authentication Required',
  408: 'Request Timeout',
  409: 'Conflict',
  410: 'Gone',
  411: 'Length Required',
  412: 'Precondition Failed',
  413: 'Payload Too Large',
  414: 'URI Too Long',
  415: 'Unsupported Media Type',
  422: 'Unprocessable Entity',
  429: 'Too Many Requests',

  500: 'Internal Server Error',
  501: 'Not Implemented',
  502: 'Bad Gateway',
  503: 'Service Unavailable',
  504: 'Gateway Timeout',
};

const fileErrorMessages = {
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
  HTTPError,
  FileError,
};
