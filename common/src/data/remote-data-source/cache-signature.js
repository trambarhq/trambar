import _ from 'lodash';

class CacheSignature {
  constructor(address, schema) {
    this.address = address;
    this.schema = schema;
    this.signature = null;
    this.promise = null;
  }
}

export {
  CacheSignature as default,
  CacheSignature,
};
