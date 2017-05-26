module.exports = HttpError;

function HttpError(statusCode) {
    var msg;
    if (!statusCode) {
        statusCode = 500;
    }
    switch (statusCode) {
        case 400: msg = 'Bad Request'; break;
        case 401: msg = 'Unauthorized'; break;
        case 403: msg = 'Forbidden'; break;
        case 404: msg = 'Not Found'; break;
        case 409: msg = 'Conflict'; break;
        case 410: msg = 'Gone'; break;
        case 415: msg = 'Unsupported Media Type'; break;
        case 500: msg = 'Internal Server Error'; break;
        case 501: msg = 'Not Implemented'; break;
        case 502: msg = 'Bad Gateway'; break;
        case 503: msg = 'Service Unavailable'; break;
        case 504: msg = 'Gateway Timeout'; break;
    }
    this.statusCode = statusCode;
    this.message = msg;
}

HttpError.prototype = Object.create(Error.prototype)
