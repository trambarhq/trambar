var React = require('react'), PropTypes = React.PropTypes;

module.exports = React.createClass({
    display: 'OverlayProxy',
    propTypes: {
        multiple: PropTypes.bool,
        mimeTypes: PropTypes.arrayOf(PropTypes.oneOf([
            PropTypes.string,
            PropTypes.instanceOf(RegExp)
        ]),
        onDrop: PropTypes.func,
    },

    getInitialState: function() {
        return {
            status: 'idle'
        };
    },

    getDefaultProps: function() {
        return {
            multiple: false,
        };
    },

    render: function() {
        var contents = findContents(this.state.status);
        if (!contents) {
            contents = findContents('idle');
        }
        if (!contents) {
            contents = this.props.children;
        }
        return (
            <div ref={this.setDOMNode}>
                {contents}
            </div>
        );
        return  || null;
    },

    findContents: function(type) {
        var children = React.Children.toArray(this.props.children);
        var element = _.find(children, { type });
        if (element) {
            return element.props.children;
        }
    },

    setDOMNode: function(node) {
        this.domNode = node;
    },

    componentDidMount: function() {
        var dropzone = this.domNode;
        dropzone.addEventListener('dragenter', this.handleDragEnter);
        dropzone.addEventListener('dragleave', this.handleDragLeave);
        dropzone.addEventListener('dragover', this.handleDragOver);
        dropzone.addEventListener('drop', this.handleDrop);
    },

    componentWillUnmount: function() {
        var dropzone = this.domNode;
        dropzone.removeEventListener('dragenter', this.handleDragEnter);
        dropzone.removeEventListener('dragleave', this.handleDragLeave);
        dropzone.removeEventListener('dragover', this.handleDragOver);
        dropzone.removeEventListener('drop', this.handleDrop);
    },

    validateFiles: function(files) {
        if (files.length === 0) {
            return false;
        }
        if (this.props.multiple) {
            if (files.length > 1) {
                return false;
            }
        }
        if (!this.props.mimeTypes) {
            return true;
        }
        return _.every(files, (file) => {
            return _.any(this.props.mimeTypes, (type) => {
                if (type instanceof RegExp) {
                    return type.test(file.type);
                } else {
                    return type === file.type;
                }
            });
        });
    },

    triggerDropEvent: function(files) {
        if (this.props.onDrop) {
            this.props.onDrop({
                type: 'drop',
                target: this,
                files,
            });
        }
    },

    handleDragEnter: function(evt) {
        var files = evt.dataTransfer.files;
        if (validateFiles(files)) {
            this.setState({ status: 'valid' });
        } else {
            this.setState({ status: 'invalid' });
        }
    },

    handleDragLeave: function(evt) {
        this.setState({ status: 'idle' });
    },

    handleDragOver: function(evt) {
        evt.preventDefault();
    },

    handleDrop: function(evt) {
        evt.preventDefault();
        if (this.state.status === 'valid') {
            var files = evt.dataTransfer.files;
            this.triggerDropEvent(files);
        }
        this.setState({ status: 'idle' });
    },
});
