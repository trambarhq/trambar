import React from 'react';
import { Renderer } from 'mark-gor/react';

class MarkdownSection {
    constructor(page, flags, tokens) {
        this.page = page;
        this.flags = flags;
        this.tokens = tokens;
    }

    getPlainText(options) {
        const fragments = [];
        for (let token of this.tokens) {
            fragments.push(token.captured);
        }
        return fragments.join('');
    }

    getRichText(options) {
        const renderer = new Renderer;
        const children = renderer.render(this.tokens);
        return React.createElement('div', {}, children);
    }
}

export {
    MarkdownSection
};
