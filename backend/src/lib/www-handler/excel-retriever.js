const _ = require('lodash');
const Bluebird = require('bluebird');
const FS = Bluebird.promisifyAll(require('fs'));
const CrossFetch = require('cross-fetch');

async function fetchFile(url, etag) {
    let fileURL = getFileURL(url);
    let options = {};
    if (etag) {
        options.headers = {
            'If-None-Match': etag,
        };
    }
    let res = await CrossFetch(fileURL, options);
    if (res.status === 200) {
        let buffer = await res.buffer();
        buffer.type = res.headers.get('content-type');
        buffer.etag = res.headers.get('etag');
        return buffer;
    } else if (res.status === 304) {
        return null;
    } else {
        let error = new Error;
        try {
            let json = await res.json();
            for (let key in json.error) {
                error[key] = json.error[key];
            }
        } catch (err) {
            try {
                error.message = await res.text();
            } catch (err) {
            }
        }
        throw error;
    }
}

const isOneDrive = /^https:\/\/(1drv\.ms|onedrive\.live\.com)\//;
const isDropbox = /^https:\/\/(www\.dropbox\.com)\//;

function getFileURL(url) {
    if (isOneDrive.test(url)) {
        let shareURL = getOneDriveShareURL(url);
        return shareURL + '/root/content';
    } else if (isDropbox.test(url)) {
        return _.replace(url, 'www', 'dl');
    }
    return url;
}

function getOneDriveShareURL(url) {
    let token = Buffer.from(url).toString('base64');
    token = _.trimEnd(token, '=');
    token = _.replace(token, /\//g, '_');
    token = _.replace(token, /\+/g, '-');
    token = 'u!' + token;
    let apiURL = 'https://api.onedrive.com/v1.0/shares/';
    return apiURL + token;
}

export {

};
