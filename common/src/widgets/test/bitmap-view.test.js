import _ from 'lodash';
import React from 'react';
import { expect } from 'chai';
import Enzyme from 'enzyme';
import Adapter from 'enzyme-adapter-react-16';
import { promiseSelf } from '../../utils/promise-self.js';

Enzyme.configure({ adapter: new Adapter() });

import { BitmapView } from '../bitmap-view.jsx';

import imageWithOrientation from '../../media/test/images/jpeg-orientation-sample.jpg';

describe('BitmapView', function() {
  it ('should extract orientation and dimension from blob', async function() {
    const blob = new Blob([ imageWithOrientation ], { type: 'image/jpeg' });
    const loading = promiseSelf();
    const ref = { current: null };
    const props = {
      ref: (r) => ref.current = r,
      url: URL.createObjectURL(blob),
      onLoad: loading.resolve,
      onError: loading.reject,
    };
    const wrapper = Enzyme.mount(<BitmapView {...props} />);
    await loading;
    const comp = ref.current;
    expect(comp).to.have.property('naturalWidth', 4);
    expect(comp).to.have.property('naturalHeight', 16);
    expect(comp).to.have.property('orientation', 5);
  })
})
