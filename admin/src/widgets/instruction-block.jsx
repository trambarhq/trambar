import _ from 'lodash';
import React, { PureComponent } from 'react';
import { AsyncComponent } from 'relaks';
import MarkGor from 'mark-gor/react';

// widgets
import CollapsibleContainer from 'common/widgets/collapsible-container.jsx';

import './instruction-block.scss';

class InstructionBlock extends AsyncComponent {
    static displayName = 'InstructionBlock';

    /**
     * Render component asynchronously
     *
     * @param  {Meanwhile}  meanwhile
     *
     * @return {Promise}
     */
    async renderAsync(meanwhile) {
        let { env, topic, folder, hidden } = this.props;
        let { languageCode } = env.locale;
        let props = {
            hidden,
            env,
        };

        render();
        props.contents = await loadMarkdown(folder, topic, languageCode);
        render();

        function render() {
            meanwhile.show(<InstructionBlockSync {...props} />);
        }
    }
}

/**
 * A box with instructions in it. Instructions are Markdown files stored in
 * src/instructions.
 *
 * @extends PureComponent
 */
class InstructionBlockSync extends PureComponent {
    static displayName = 'InstructionBlockSync';

    /**
     * Render component
     *
     * @return {ReactElement|null}
     */
    render() {
        let { hidden, contents } = this.props;
        if (!contents) {
            return null;
        }
        let classNames = [ 'instruction-block' ];
        if (hidden) {
            classNames.push('hidden')
        }
        return (
            <div className={classNames.join(' ')}>
                <CollapsibleContainer open={!hidden}>
                    <div className="contents">{contents}</div>
                </CollapsibleContainer>
            </div>
        );
    }
}

/**
 * Load and parse instruction text
 *
 * @param  {String} folder
 * @param  {String} topic
 * @param  {String} lang
 *
 * @return {Promise<ReactElement>}
 */
async function loadMarkdown(folder, topic, lang) {
    let text = await loadText(folder, topic, lang);
    let contents = MarkGor.parse(text || '');
    return loadImages(contents, folder);
}

/**
 * Load instruction text
 *
 * @param  {String} folder
 * @param  {String} topic
 * @param  {String} lang
 *
 * @return {Promise<String>}
 */
async function loadText(folder, topic, lang) {
    let module;
    try {
        module = await import(`../instructions/${folder}/${topic}.${lang}.md`);
    } catch (err) {
        if (process.env.NODE_ENV !== 'production') {
            console.log(`Missing instructions for topic "${topic}" in language "${lang}"`);
        }
        module = await import(`../instructions/${folder}/${topic}.en.md`);
    }
    return module.default || '';
}

/**
 * Load images used by img tags
 *
 * @param  {ReactElement} element
 * @param  {String} folder
 *
 * @return {ReactElement}
 */
async function loadImages(element, folder) {
    if (typeof(element) === 'string') {
        return element;
    } else if (element instanceof Array) {
        let results = [];
        for (let e of element) {
            let result = await loadImages(e, folder);
            results.push(result)
        }
        return results;
    } else if (element.type === 'img') {
        let filename = element.props.src;
        if (filename && !/^\w+:/.test(filename)) {
            try {
                let url = await import(`../instructions/${folder}/${filename}`);
                return React.cloneElement(element, { src: url });
            } catch (err) {
                if (process.env.NODE_ENV !== 'production') {
                    console.log(`Unable to find image: ${url}`);
                }
            }
        }
        return element;
    } else if (element.type === 'a') {
        let url = element.props.href;
        if (url && !/^\w+:/.test(url)) {
            try {
                let fileURL = await import(`../instructions/${folder}/${url}`);
                let props = { href: url };
                if (/\.html$/.test(url)) {
                    props.target = '_blank';
                } else {
                    props.download = url;
                }
                return React.cloneElement(element, props);
            } catch (err) {
                if (process.env.NODE_ENV !== 'production') {
                    console.log(`Unable to find link: ${url}`);
                }
                return element;
            }
        } else {
            return React.cloneElement(element, { target: '_blank' });
        }
    } else if (element.props && !_.isEmpty(element.props.children)) {
        let newChildren = [];
        for (let child of element.props.children) {
            let newChild = await loadImages(child, folder);
            newChildren.push(newChild);
        }
        return React.cloneElement(element, {}, newChildren);
    } else {
        return element;
    }
}

InstructionBlock.defaultProps = {
    hidden: false,
};

export {
    InstructionBlock as default,
    InstructionBlock,
    InstructionBlockSync,
};

import Environment from 'common/env/environment.mjs';

if (process.env.NODE_ENV !== 'production') {
    const PropTypes = require('prop-types');

    InstructionBlock.propTypes = {
        folder: PropTypes.string.isRequired,
        topic: PropTypes.string.isRequired,
        hidden: PropTypes.bool,
        env: PropTypes.instanceOf(Environment).isRequired,
    };
    InstructionBlockSync.propTypes = {
        hidden: PropTypes.bool,
        contents: PropTypes.oneOfType([
            PropTypes.arrayOf(PropTypes.node),
            PropTypes.node
        ]),
        env: PropTypes.instanceOf(Environment).isRequired,
    };
}
