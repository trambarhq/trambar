export class CacheSignature {
  constructor(address, schema) {
    this.address = address;
    this.schema = schema;
    this.signature = null;
    this.promise = null;
  }
}
