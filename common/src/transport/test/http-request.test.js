import { expect } from 'chai';
import { TestServer } from './lib/test-server.js';

import {
  performHTTPRequest,
  mockHTTPRequest,
} from '../http-request.js';

let port = 7978;
let baseURL = `http://localhost:${port}`;

describe('HTTPRequest', function() {
  before(function() {
    this.timeout(5000);
    return TestServer.start(port);
  })
  after(function() {
    mockHTTPRequest(false);
    return TestServer.stop();
  })
  describe('#performHTTPRequest()', function() {
    it('should retrieve a JSON object using GET', async function() {
      const url = `${baseURL}/echo`;
      const payload = {
        msg: 'hello world',
        life: 42,
      };
      const options = {
        responseType: 'json'
      };
      const result = await performHTTPRequest('GET', url, payload, options);
      expect(result).to.have.property('life', '42');
    })
    it('should retrieve a JSON object using POST', async function() {
      const url = `${baseURL}/echo`;
      const payload = {
        life: 42,
      };
      const options = {
        contentType: 'json',
        responseType: 'json'
      };
      const result = await performHTTPRequest('POST', url, payload, options);
      expect(result).to.have.property('life', 42);
    })
    it('should retrieve a string using GET', async function() {
      const url = `${baseURL}/echo`;
      const payload = {
        msg: 'hello world',
        life: 42,
      };
      const options = {
        responseType: 'text'
      };
      const result = await performHTTPRequest('GET', url, payload, options);
      expect(result).to.be.a('string');
    })
    it('should retrieve a blob using GET', async function() {
      const url = `${baseURL}/echo`;
      const payload = {
        msg: 'hello world',
        life: 42,
      };
      const options = {
        responseType: 'blob'
      };
      const result = await performHTTPRequest('GET', url, payload, options);
      expect(result).to.be.an.instanceof(Blob);
    })
    it('should reject with an error when the host is unreachable', async function() {
      this.timeout(5000);
      const url = 'http://domain.test/';
      try {
        await performHTTPRequest('GET', url);
        expect.fail();
      } catch (err) {
        expect(err).to.be.instanceOf(Error);
      }
    })
    it('should reject with an error when timeout is short', async function() {
      const url = `${baseURL}/delay/1000`;
      const options = {
        timeout: 200
      };
      try {
        await performHTTPRequest('GET', url, {}, options);
        expect.fail();
      } catch (err) {
        expect(err).to.be.instanceOf(Error);
      }
    })
  })
  describe('#mockHTTPRequest()', function() {
    it('should override normal functionality', async function() {
      const mockResult = { hello: 'world' };
      mockHTTPRequest(async () => mockResult);
      const result = await performHTTPRequest('GET', 'http://nowhere');
      expect(result).to.equal(mockResult);
    });
  })
})
