class ExcelPlainTextCell {
    constructor(column, data) {
        this.column = column;
        this.text = data + '';
    }

    getPlainText(options) {
        return this.text;
    }

    getRichText(options) {
        return this.text;
    }

    getData(options) {
        return this.text;
    }
}

function containsPlainText(data) {
    if (data instanceof Object) {
        return false;
    }
    return true;
}

export {
    ExcelPlainTextCell,
    containsPlainText,
};
