import _ from 'lodash';
import Promise from 'bluebird';
import React, { PureComponent } from 'react';
import MarkGor from 'mark-gor/react';

// widgets
import CollapsibleContainer from 'widgets/collapsible-container';

import './instruction-block.scss';

class InstructionBlock extends PureComponent {
    static displayName = 'InstructionBlock';

    constructor(props) {
        super(props);
        this.state = {
            contents: null,
        };
    }

    /**
     * Load instruction text on mount
     */
    componentWillMount() {
        let { env, topic, folder } = this.props;
        let { languageCode } = env.locale;
        if (topic) {
            loadMarkdown(folder, topic, languageCode).then((contents) => {
                this.setState({ contents });
            });
        }
    }

    /**
     * Reload text if topic or language changes
     *
     * @param  {Object} nextProps
     */
    componentWillReceiveProps(nextProps) {
        let { env, topic } = this.props;
        if (nextProps.topic !== topic || nextProps.env.locale !== env.locale) {
            let folder = nextProps.folder;
            let topic = nextProps.topic;
            let languageCode = nextProps.locale.languageCode;
            loadMarkdown(folder, topic, languageCode).then((contents) => {
                this.setState({ contents });
            });
        }
    }

    /**
     * Render component
     *
     * @return {ReactElement|null}
     */
    render() {
        let { hidden } = this.props;
        let { contents } = this.state;
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
 * @return {Promise}
 */
function loadMarkdown(folder, topic, lang) {
    return loadText(folder, topic, lang).then((text) => {
        let contents = MarkGor.parse(text);
        return loadImages(contents, folder);
    });
}

/**
 * Load instruction text
 *
 * @param  {String} folder
 * @param  {String} topic
 * @param  {String} lang
 *
 * @return {Promise}
 */
function loadText(folder, topic, lang) {
    return import(`instructions/${folder}/${topic}.${lang}.md`).catch(() => {
        if (process.env.NODE_ENV !== 'production') {
            console.log(`Missing instructions for topic "${topic}" in language "${lang}"`);
        }
        return import(`instructions/${folder}/${topic}.en.md`);
    });
}

/**
 * Load images used by img tags
 *
 * @param  {ReactElement} element
 * @param  {String} folder
 *
 * @return {ReactElement}
 */
function loadImages(element, folder) {
    if (typeof(element) === 'string') {
        return element;
    } else if (element instanceof Array) {
        return Promise.map(element, (element) => {
            return loadImages(element, folder);
        });
    } else if (element.type === 'img') {
        let url = element.props.src;
        if (url && !/^\w+:/.test(url)) {
            return import(`instructions/${folder}/${url}`).then((url) => {
                return React.cloneElement(element, { src: url });
            }).catch((err) => {
                if (process.env.NODE_ENV !== 'production') {
                    console.log(`Unable to find image: ${url}`);
                }
                return element;
            });
        } else {
            return element;
        }
    } else if (element.type === 'a') {
        let url = element.props.href;
        if (url && !/^\w+:/.test(url)) {
            return import(`instructions/${folder}/${url}`).then((url) => {
                let props = { href: url };
                if (/\.html$/.test(url)) {
                    props.target = '_blank';
                } else {
                    props.download = url;
                }
                return React.cloneElement(element, props);
            }).catch((err) => {
                if (process.env.NODE_ENV !== 'production') {
                    console.log(`Unable to find link: ${url}`);
                }
                return element;
            });
        } else {
            return React.cloneElement(element, { target: '_blank' });
        }
    } else if (element.props && !_.isEmpty(element.props.children)) {
        return Promise.map(element.props.children, (element) => {
            return loadImages(element, folder);
        }).then((children) => {
            return React.cloneElement(element, {}, children);
        });
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
};

import Environment from 'env/environment';

if (process.env.NODE_ENV !== 'production') {
    const PropTypes = require('prop-types');

    InstructionBlock.propTypes = {
        folder: PropTypes.string.isRequired,
        topic: PropTypes.string.isRequired,
        hidden: PropTypes.bool,

        env: PropTypes.instanceOf(Environment).isRequired,
    };
}
