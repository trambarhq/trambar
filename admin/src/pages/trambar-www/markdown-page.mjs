import React from 'react';
import { Parser } from 'mark-gor/react';
import { MarkdownSection } from './markdown-section.mjs';

class MarkdownPage {
    constructor(data) {
        this.slug = data.slug;
        this.title = data.title;
        this.sections = [];

        const parser = new Parser;
        const tokens = parser.parse(data.markdown || '');
        const first = new MarkdownSection(this, [], tokens);
        this.sections.push(first);
    }

    getPlainText(options) {
        const fragments = [];
        for (let section of this.sections) {
            const fragment = section.getPlainText();
            fragments.push(fragment);
        }
        return fragments.join('');
    }

    getRichText(options) {
        const divs = [];
        for (let section of this.sections) {
            const div = section.getRichText(options);
            divs.push(div);
        }
        if (divs.length === 1) {
            return divs[0];
        } else {
            return React.createElement('div', {}, divs);
        }
    }
}

export {
    MarkdownPage
};
