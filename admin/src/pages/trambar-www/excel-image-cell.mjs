class ExcelImageCell {
    constructor(column, data) {
        this.column = column;
        this.url = data.url;
        this.width = data.width;
        this.height = data.height;
        this.format = data.format;
    }

    getPlainText(options) {
        return `[image]`;
    }

    getRichText(options) {
        return this.getPlainText(options);
    }

    getData(options) {
        return this.getData(options);
    }

    getURL(filters, format) {
        const modifier = [];
        for (let [ n, v ] in Object.entries(filters)) {
            let m = '';
            switch (n) {
                case 'background':
                    m = `ba${v.r}-${v.g}-${v.b}-${v.a}`;
                    break;
                case 'blur':
                    if (v) {
                        if (typeof(v) === 'number') {
                            m = `bl${v}`;
                        } else {
                            m = `bl`;
                        }
                    }
                    break;
                case 'crop':
                    m = `cr${v.left}-${v.top}-${v.width}-${v.height}`;
                    break;
                case 'extract':
                    m = `ex${v}`;
                    break;
                case 'flatten':
                    if (v) {
                        m = `fla`;
                    }
                    break;
                case 'flip':
                    if (v) {
                        m = `fli`;
                    }
                    break;
                case 'flop':
                    if (v) {
                        m = `flo`;
                    }
                    break;
                case 'gamma':
                    m = `ga${v}`;
                    break;
                case 'grayscale':
                    if (v) {
                        m = `gr`;
                    }
                    break;
                case 'negate':
                    if (v) {
                        m = `ne`;
                    }
                    break;
                case 'normalize':
                    if (v) {
                        m = `no`;
                    }
                    break;
                case 'lossless':
                    if (v) {
                        m = `lo`;
                    }
                    break;
                case 'quality':
                    m = `q${v}`;
                    break;
                case 'rotate':
                    m = `ro${v}`;
                    break;
                case 'resize':
                    m = `re${v.width}-${v.height}`;
                    break;
                case 'sharpen':
                    if (v) {
                        m = `sh`;
                    }
                    break;
                case 'trim':
                    if (v) {
                        m = `tr`;
                    }
                    break;
            }
            if (m) {
                modifier.push(m);
            }
        }
        let url = this.url;
        if (modifiers.length > 0 || format) {
            url += `/${modifiers.join('+')}`;
            if (format) {
                url += `.${format}`;
            }
        }
        return url;
    }
}

function containsImage(data) {
    if (!(data instanceof Object)) {
        return false;
    }
    if (data.type !== 'image') {
        return false;
    }
    if (typeof(data.url) !== 'string') {
        return false;
    }
    if (typeof(data.width) !== 'number') {
        return false;
    }
    if (typeof(data.height) !== 'number') {
        return false;
    }
    return true;
}

export {
    ExcelImageCell,
    containsImage,
};
