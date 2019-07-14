import React from 'react';

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
        const spans = this.getData(options);
        const children = [];
        for (let span of spans) {
            const { style, text } = span;
            children.push(React.createElement('span', { style }, text));
        }
        if (children.length === 1) {
            return children[0];
        } else {
            return React.createElement('span', {}, children);
        }
    }

    getData(options) {
        const spans = [];
        for (let token of this.tokens) {
            const { font, text } = token;
            const style = {};
            if (font) {
                if (font.bold) {
                    style.fontWeight = 'bold';
                }
                if (font.italic) {
                    style.fontStyle = 'italic';
                }
                if (font.underline) {
                    style.textDecoration = 'underline';
                }
            }
            spans.push({ style, text });
        }
        return spans;
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
