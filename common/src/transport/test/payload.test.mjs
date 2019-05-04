import _ from 'lodash';
import { expect } from 'chai';

import Payload from '../payload.mjs';

let testObject = _.range(1, 500);
let testJSON = JSON.stringify(testObject);
let testBlob1 = new Blob([ testJSON ], { type: 'text/plain' });

let testString = _.repeat('Hello world\n', 500);
let testBlob2 = new Blob([ testString ], { type: 'text/plain' });

describe('Payload', function() {
    describe('#attachFile()', function() {
        it ('should use "main" as the name when it is omitted', function() {
            let payload = new Payload('00000000', null, 'test');
            payload.attachFile(testBlob1);
            expect(payload.parts[0]).to.have.property('name', 'main');
        })
    })
    describe('#getSize()', function() {
        it ('should correctly calculate the total payload size', function() {
            let payload = new Payload('00000000', null, 'test');
            payload.attachFile(testBlob1);
            payload.attachFile(testBlob2, 'second');
            let size = payload.getSize();
            expect(size).to.equal(testBlob1.size + testBlob2.size);
        })
    })
    describe('#getUploaded()', function() {
        it ('should correctly calculate the total bytes uploaded size', function() {
            let payload = new Payload('00000000', null, 'test');
            payload.attachFile(testBlob1);
            payload.attachFile(testBlob2, 'second');
            payload.parts[0].uploaded += 3;
            payload.parts[1].uploaded += 1;
            let uploaded = payload.getUploaded();
            expect(uploaded).to.equal(4);
        })
    })
    describe('#getRemainingFiles()', function() {
        it ('should correctly count the remaining files', function() {
            let payload = new Payload('00000000', null, 'test');
            payload.attachFile(testBlob1);
            payload.attachFile(testBlob2, 'second');
            payload.attachURL('http://www.google.com', 'url');
            payload.parts[0].uploaded += 3;
            payload.parts[1].uploaded += 1;
            let count = payload.getRemainingFiles();
            expect(count).to.equal(2);
        })
    })
    describe('#getRemainingBytes()', function() {
        it ('should correctly calculate the remaing bytes uploaded size', function() {
            let payload = new Payload('00000000', null, 'test');
            payload.attachFile(testBlob1);
            payload.attachFile(testBlob2, 'second');
            payload.parts[0].uploaded += 3;
            payload.parts[1].uploaded += 1;
            let size = payload.getSize();
            let remaining = payload.getRemainingBytes();
            expect(remaining).to.equal(size - 4);
        })
    })
})
