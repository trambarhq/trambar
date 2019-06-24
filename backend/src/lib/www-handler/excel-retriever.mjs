import _ from 'lodash';
import CrossFetch from 'cross-fetch';
import HTTPError from '../common/errors/http-error.mjs';
import Spreadsheet from '../accessors/spreadsheet.mjs';

import * as ExcelParser from './excel-parser.mjs';

async function fetch(spreadsheet) {
    const { url, etag } = spreadsheet;
    const fileURL = getFileURL(url);
    const options = {};
    if (etag) {
        options.headers = {
            'If-None-Match': etag,
        };
    }
    const res = await CrossFetch(fileURL, options);
    if (res.status === 200) {
        const buffer = await res.buffer();
        buffer.type = res.headers.get('content-type');
        buffer.etag = res.headers.get('etag');
        if (!buffer.etag) {
            throw new HTTPError(400, `No e-tag: ${url}`);
        }
        return buffer;
    } else if (res.status === 304) {
        return null;
    } else {
        const error = new Error;
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
        const shareURL = getOneDriveShareURL(url);
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
    const apiURL = 'https://api.onedrive.com/v1.0/shares/';
    return apiURL + token;
}

export {
    fetch,
};
