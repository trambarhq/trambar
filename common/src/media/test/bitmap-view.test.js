var _ = require('lodash');
var Promise = require('bluebird');
var React = require('react');
var Chai = require('chai'), expect = Chai.expect;
var Enzyme = require('enzyme');

var BitmapView = require('media/bitmap-view');

var imageWithOrientation = require('./images/jpeg-orientation-sample.jpg');

describe('BitmapView', function() {
    it ('should extract orientation and dimension from blob', function() {
        return new Promise((resolve, reject) => {
            var blob = new Blob([ imageWithOrientation ], { type: 'image/jpeg' });
            var props = {
                url: URL.createObjectURL(blob),
                onLoad: () => {
                    resolve(wrapper);
                },
                onError: (evt) => {
                    reject(evt.error);
                },
            };
            var wrapper = Enzyme.mount(<BitmapView {...props} />);
        }).then((wrapper) => {
            var comp = wrapper.instance();
            expect(comp).to.have.property('width', 4);
            expect(comp).to.have.property('height', 16);
            expect(comp).to.have.property('orientation', 5);
        });
    })
})
