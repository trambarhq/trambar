import _ from 'lodash';
import React, { useState, useEffect } from 'react';

import './markdown-preview.scss';

function MarkdownPreview(props) {
    const { page, localized, route, env } = props;
    const [ limit, setLimit ] = useState(50);

    useEffect(() => {
        if (page && page.blocks.length > limit) {
            setTimeout(() => {
                setLimit(Infinity);
            }, 50);
        }
    }, [ page, limit ]);

    return (
        <div className="markdown-preview">
            {renderBlocks()}
        </div>
    );

    function renderBlocks() {
        let blocks;
        if (page) {
            if (page.blocks.length > limit) {
                blocks = _.slice(page.blocks, 0, limit);
            } else {
                blocks = page.blocks;
            }
        }
        return _.map(blocks, renderBlock);
    }

    function renderBlock(block, i) {
        const options = {
            imageHeight: 48,
            devicePixelRatio: env.devicePixelRatio,
            richTextAdjust: (type, props, children) => {
                if (type === 'A') {
                    console.log(props);
                }
                return { type, props, children };
            },
        };
        let classNames = [ 'block' ];
        if (!localized.includes(block)) {
            const language = block.language();
            if (language) {
                // it's a language indicator
                classNames.push('language');
                if (language === 'zz') {
                    classNames.push('off');
                }
            } else {
                classNames.push('foreign');
            }
        }

        const code = block.code();
        if (code && code.language === 'json') {
            try {
                JSON.parse(code.text);
            } catch (err) {
                classNames.push('broken');
            }
        }

        return (
            <div key={i} className={classNames.join(' ')}>
                {block.richText(options)}
            </div>
        )
    }
}

export {
    MarkdownPreview,
};
