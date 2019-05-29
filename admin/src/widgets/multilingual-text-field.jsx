import _ from 'lodash';
import React, { useState, useMemo, useImperativeHandle, useEffect } from 'react';
import { useListener } from 'relaks';

// widgets
import AutosizeTextArea from 'common/widgets/autosize-text-area.jsx';

import './multilingual-text-field.scss';

/**
 * A text field that accepts text in multiple languages.
 */
function MultilingualTextField(props, ref) {
    const { env, type, id, readOnly, value, availableLanguageCodes, children, onChange, ...otherProps } = props;
    const { t, languageCode, directory } = env.locale;
    const [ selectedLanguageCode, setSelectedLanguageCode ] = useState(() => {
        // choose initial language
        const existingLanguageCodes = _.keys(value);
        if (_.includes(existingLanguageCodes, languageCode)) {
            // if there's existing text of the current language, use it
            return languageCode;
        } else if (!_.isEmpty(existingLanguageCodes)) {
            // otherwise choose the first language of any existing text
            return existingLanguageCodes[0];
        } else if (_.includes(availableLanguageCodes, languageCode)) {
            // if there's no text, use the current language if it's in the list
            // of available languages
            return languageCode;
        } else if (!_.isEmpty(availableLanguageCodes)) {
            // otherwise use the first language on that list
            return availableLanguageCodes[0];
        } else {
            // if all else failed, use current language
            return languageCode;
        }
    });
    const [ hoverState, setHoverState ] = useState(null);
    const languageCodes = useMemo(() => {
        let existingLanguageCodes = _.keys(value);
        let codes = _.union(availableLanguageCodes, existingLanguageCodes);
        if (codes.length === 0) {
            codes.push(languageCode);
        }
        // include only codes of support languages
        let hash = _.keyBy(directory, 'code');
        return _.filter(_.map(codes, (code) => {
            return hash[code];
        }));
    }, [ env, availableLanguageCodes ]);
    const [ instance ] = useState({ value });

    useImperativeHandle(ref, () => {
        return instance;
    });

    const handleTextChange = useListener((evt) => {
        const text = evt.target.value;
        let newValue;
        if (text) {
            if (value instanceof Object) {
                newValue = _.clone(value);
            } else if (typeof(value) === 'string') {
                // convert a string to a multi-lingual object
                newValue = _.transform(availableLanguageCodes, (text, code) => {
                    text[code] = value;
                }, {});
            } else {
                newValue = {};
            }
            newValue[selectedLanguageCode] = text;
        } else {
            if (value instanceof Object) {
                newValue = _.omit(value, selectedLanguageCode);
                if (!_.includes(availableLanguageCodes, selectedLanguageCode)) {
                    // choose a new language when text of a no-longer-available
                    // language is removed
                    let language = _.first(languageCodes);
                    if (language) {
                        setSelectedLanguageCode(language.code);
                    }
                }
            } else {
                newValue = {};
            }
        }
        instance.value = newValue;
        if (onChange) {
            onChange({ type: 'change', target: instance });
        }
    });
    const handleLanguageClick = useListener((evt) => {
        const lang = evt.currentTarget.lang;
        setSelectedLanguageCode(lang);
        setHoverState(null);
    });
    const handleLanguageMouseOver = useListener((evt) => {
        const tab = evt.currentTarget;
        const tabs = tab.parentNode;
        const tabsRect = tabs.getBoundingClientRect();
        const tabRect = tab.getBoundingClientRect();
        const pos = tabRect.left + (tabRect.width / 2) - tabsRect.left;
        const lang = tab.lang;
        setHoverState({ languageCode: lang, arrowPosition: pos });
    });
    const handleLanguageMouseOut = useListener((evt) => {
        let tab = evt.currentTarget;
        let lang = tab.lang;
        if (lang === hoverState.languageCode) {
            setHoverState(null);
        }
    });

    useEffect(() => {
        // switch to the language of the new locale if it's
        // one of the available languages
        if (_.includes(availableLanguageCodes, languageCode)) {
            setSelectedLanguageCode(languageCode);
        }
    }, [ languageCode ])

    const classNames = [ 'multilingual-text-field' ];
    let Input;
    let inputProps = { id, ...otherProps };
    if (type === 'textarea') {
        Input = AutosizeTextArea;
    } else {
        Input = 'input';
        inputProps.type = type;
    }
    if (readOnly) {
        classNames.push('readonly');
        inputProps.placeholder = t('text-field-placeholder-none');
        inputProps.spellCheck = false;
        inputProps.readOnly = true;
    }
    if (languageCodes.length > 1) {
        classNames.push('multiple-languages');
    }
    if (value instanceof Object) {
        inputProps.value = value[selectedLanguageCode] || '';
    } else if (typeof(value) === 'string') {
        inputProps.value = value;
    } else {
        inputProps.value = '';
    }
    inputProps.lang = selectedLanguageCode;
    inputProps.onChange = handleTextChange;
    return (
        <div className={classNames.join(' ')}>
            <label htmlFor={id}>{children}</label>
            <Input {...inputProps} />
            {renderTabs()}
        </div>
    );

    function renderTabs() {
        if (languageCodes.length <= 1) {
            return null;
        }
        return (
            <div className="tabs">
                {_.map(languageCodes, renderTab)}
                {renderPopup()}
            </div>
        );
    }

    function renderTab(language, i) {
        const props = {
            className: 'tab',
            lang: language.code,
        };
        if (language.code === selectedLanguageCode) {
            props.className += ' selected';
        } else {
            props.onClick = handleLanguageClick;
            props.onMouseOver = handleLanguageMouseOver;
            props.onMouseOut = handleLanguageMouseOut;
        }
        return <div key={i} {...props}>{language.name}</div>;
    }

    function renderPopup() {
        if (!hoverState || readOnly) {
            return null;
        }
        let contents = value[hoverState.languageCode];
        if (!_.trim(contents)) {
            return null;
        }
        return (
            <div className="bubble">
                <div className="arrow" style={{ left: hoverState.arrowPosition }} />
                <div className="box">
                    {contents}
                </div>
            </div>
        );
    }
}

const component = React.forwardRef(MultilingualTextField);

component.defaultProps = {
    type: 'text',
    value: {},
    availableLanguageCodes: [],
};

export {
    component as default,
    component as MultilingualTextField,
};
