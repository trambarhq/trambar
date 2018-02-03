var React = require('react');

module.exports = LoadingAnimation;

require('./loading-animation.scss');

function LoadingAnimation(props) {
    return (
        <div className="loading-animation">
            <div className="first dot" />
            <div className="second dot" />
            <div className="third dot" />
            <div className="fourth dot" />
        </div>
    );
}
