module.exports = HTTPError;

function HTTPError() {
    for (var i = 0; i < arguments.length; i++) {
        var arg = arguments[i];
        if (typeof(arg) === 'number') {
            this.statusCode = arg;
        } else if (typeof(arg) === 'string') {
            this.message = arg;
        } else if (typeof(arg) === 'object') {
            for (var key in arg) {
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

var httpErrorNames = {
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

HTTPError.prototype = Object.create(Error.prototype)
