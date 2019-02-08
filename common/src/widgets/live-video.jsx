import React, { PureComponent } from 'react';

/**
 * A video component that accepts a stream or blob as a prop. A workaround for
 * scalar-only limitation of regular HTML elements in React.
 *
 * @extends PureComponent
 */
class LiveVideo extends PureComponent {
    render() {
        let { srcObject, ...props } = this.props;
        if (srcObject instanceof Blob) {
            // srcObject is supposed to accept a blob but that's not
            // currently supported by the browsers
            props.src = this.blobURL = URL.createObjectURL(srcObject);
        }
        return <video ref={this.setNode} {...props} />
    }

    setNode = (node) => {
        this.node = node;
    }

    setSrcObject() {
        let { srcObject } = this.props;
        if (srcObject) {
            if (!(srcObject instanceof Blob)) {
                this.node.srcObject = srcObject;
            }
            this.node.play();
        }
    }

    componentDidMount() {
        this.setSrcObject();
    }

    componentDidUpdate(prevProps, prevState) {
        let { srcObject } = this.props;
        if (prevProps.srcObject !== srcObject) {
            this.setSrcObject();
        }
    }

    componentWillUnmount() {
        if (this.blobURL) {
            URL.revokeObjectURL(this.blobURL);
        }
    }
}

export {
    LiveVideo as default,
    LiveVideo,
};
