module.exports = HttpError;

function HttpError(statusCode, attributes) {
    if (!statusCode) {
        statusCode = 500;
    }
    var name = httpErrorNamess[statusCode];
    this.statusCode = statusCode;
    this.name = name
    this.message = name;
    for (var key in attributes) {
        this[key] = attributes[key];
    }
}

var httpErrorNamess = {
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

    500: 'Internal Server Error',
    501: 'Not Implemented',
    502: 'Bad Gateway',
    503: 'Service Unavailable',
    504: 'Gateway Timeout',
};

HttpError.prototype = Object.create(Error.prototype)
