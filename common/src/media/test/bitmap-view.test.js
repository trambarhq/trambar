import _ from 'lodash';
import Promise from 'bluebird';
import React from 'react';
import { expect } from 'chai';
import * as Enzyme from 'enzyme';

import BitmapView from 'media/bitmap-view';

import imageWithOrientation from './images/jpeg-orientation-sample.jpg';

describe('BitmapView', function() {
    it ('should extract orientation and dimension from blob', function() {
        return new Promise((resolve, reject) => {
            let blob = new Blob([ imageWithOrientation ], { type: 'image/jpeg' });
            let props = {
                url: URL.createObjectURL(blob),
                onLoad: () => {
                    resolve(wrapper);
                },
                onError: (evt) => {
                    reject(evt.error);
                },
            };
            let wrapper = Enzyme.mount(<BitmapView {...props} />);
        }).then((wrapper) => {
            let comp = wrapper.instance();
            expect(comp).to.have.property('width', 4);
            expect(comp).to.have.property('height', 16);
            expect(comp).to.have.property('orientation', 5);
        });
    })
})
