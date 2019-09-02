import React from 'react';

function URLLink(props) {
    const { url } = props;
    if (!/^https?:\/\/\S+/.test(url)) {
        console.log(url);
        return null;
    }
    return (
        <a className="link" href={url} target="_blank">
            <i className="fa fa-external-link" />
        </a>
    );
}

export {
    URLLink as default,
    URLLink,
};
