class ExcelRichTextCell {
    constructor(column, data) {
        this.column = column;
        this.tokens = data.richText;
    }

    getPlainText(options) {
        const fragments = [];
        for (let token of this.tokens) {
            fragments.push(token.text);
        }
        return fragments.join('');
    }

    getRichText(options) {
        return this.getPlainText(options)
    }

    getData(options) {
        return this.getPlainText(options)
    }
}

function containsRichText(data) {
    if (!(data instanceof Object)) {
        return false;
    }
    if (!(data.richText instanceof Array)) {
        return false;
    }
    return true;
}

export {
    ExcelRichTextCell,
    containsRichText,
};
