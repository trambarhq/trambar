var React = require('react'), PropTypes = React.PropTypes;

module.exports = HeaderButton;
module.exports.File = FileButton;

require('./header-button.scss');

function HeaderButton(props) {
    if (props.hidden) {
        return null;
    }
    return (
        <label className={buttonClasses(props)} onClick={!props.disabled ? props.onClick : null}>
            <i className={iconClasses(props)}/>
            <span className="label">{props.label}</span>
        </label>
    );
}

HeaderButton.propTypes = {
    label: PropTypes.string,
    icon: PropTypes.string,
    hidden: PropTypes.bool,
    highlighted: PropTypes.bool,
    disabled: PropTypes.bool,
    onClick: PropTypes.func,
};

function FileButton(props) {
    if (props.hidden) {
        return null;
    }
    if (process.env.PLATFORM === 'cordova') {
        var buttonProps = _.omit(props, 'onChange');
        var onClick = () => {
            var camera = navigator.camera;
            if (camera) {
                var options = {
                    destinationType: Camera.DestinationType.FILE_URI,
                    sourceType: Camera.PictureSourceType.PHOTOLIBRARY,
                    mediaType: Camera.MediaType.ALLMEDIA,
                };
                var handleSuccess = (url) => {
                    var CordovaFile = require('transport/cordova-file');
                    var file = new CordovaFile(url);
                    return file.obtainMetadata().then(() => {
                        var evt = {
                            target: {
                                files: [ file ]
                            },
                        };
                        if (props.onChange) {
                            props.onChange(evt);
                        }
                    });
                };
                var handleFailure = () => {
                };
                camera.getPicture(handleSuccess, handleFailure, options);
            }
        };
        return (
            <label className={buttonClasses(props)} onClick={!props.disabled ? onClick : null}>
                <i className={iconClasses(props)}/>
                <span className="label">{props.label}</span>
            </label>
        );
    } else {
        var inputProps = {
            type: 'file',
            value: '',
            disabled: props.disabled,
            multiple: props.multiple,
            onChange: props.onChange,
        };
        if (edgeBug) {
            // deal with bug in Edge:
            // https://developer.microsoft.com/en-us/microsoft-edge/platform/issues/8282613/
            inputProps.id = `file-input-${edgeInputId++}`;
            return (
                <span className={buttonClasses(props)}>
                    <label htmlFor={inputProps.id}>
                        <i className={iconClasses(props)}/>
                        <span className="label">{props.label}</span>
                    </label>
                    <input {...inputProps} />
                </span>
            );
        }
        return (
            <label className={buttonClasses(props)}>
                <i className={iconClasses(props)}/>
                <span className="label">{props.label}</span>
                <input {...inputProps} />
            </label>
        );
    }
}

var edgeBug = /Edge/.test(navigator.userAgent);
var edgeInputId = 1;

FileButton.propTypes = {
    label: PropTypes.string,
    icon: PropTypes.string,
    hidden: PropTypes.bool,
    highlighted: PropTypes.bool,
    disabled: PropTypes.bool,
    multiple: PropTypes.bool,
    onChange: PropTypes.func,
};

function buttonClasses(props) {
    var classNames = [ 'header-button' ];
    if (props.className) {
        classNames.push(props.className);
    }
    if (props.highlighted) {
        classNames.push('highlighted');
    }
    if (props.disabled) {
        classNames.push('disabled');
    }
    return classNames.join(' ');
}

function iconClasses(props) {
    var classNames = [];
    if (props.icon) {
        classNames.push('fa', `fa-${props.icon}`);
    }
    return classNames.join(' ');
}
