var Chai = require('chai'), expect = Chai.expect;

var Functions = require('../functions');
var Runtime = require('../runtime');
for(var name in Runtime) {
    global[name] = Runtime[name];
}

describe('Functions', function() {
    describe('#payloadIds()', function() {
        it('should return a list of payload ids of items in the object\'s resources array', function() {
            var details = {
                resources: [
                    {
                        type: 'image',
                        payload_id: 3,
                    },
                    {
                        type: 'video',
                        payload_id: 4
                    }
                ]
            };
            expect(Functions.payloadIds(details)).to.deep.equal([3, 4]);
        })
        it('should return null when there are no payload ids', function() {
            var details = {
                resources: [
                    {
                        type: 'image',
                    },
                    {
                        type: 'video',
                    }
                ]
            };
            expect(Functions.payloadIds(details)).to.equal(null);
        })
        it('should return id when it is stored in the details object itself', function() {
            var details = {
                payload_id: 3
            };
            expect(Functions.payloadIds(details)).to.deep.equal([ 3 ]);
        })
    })
    describe('#updatePayload()', function() {
        it('should copy properties from payload into matching resource', function() {
            var payload = {
                id: 3,
                details: {
                    url: 'image.jpg',
                    width: 400,
                    height: 300,
                },
                completion: 100
            };
            var details = {
                resources: [
                    {
                        type: 'image',
                        payload_id: 3,
                    },
                    {
                        type: 'video',
                        payload_id: 4
                    }
                ]
            };
            var newDetails = Functions.updatePayload(details, payload);
            var res0 = newDetails.resources[0];
            expect(res0).to.have.property('url', 'image.jpg');
            expect(res0).to.have.property('width', 400);
            expect(res0).to.have.property('height', 300);
            var res1 = newDetails.resources[1];
            expect(res1).to.not.have.property('url');
        })
        it('should not overwrite existing properties', function() {
            var payload = {
                id: 3,
                details: {
                    url: '/somewhere/image.jpg',
                    width: 400,
                    height: 300,
                },
                completion: 100
            };
            var details = {
                resources: [
                    {
                        type: 'image',
                        payload_id: 3,
                        height: 314,
                    },
                    {
                        type: 'video',
                        payload_id: 4
                    }
                ]
            };
            var newDetails = Functions.updatePayload(details, payload);
            var res0 = newDetails.resources[0];
            expect(res0).to.have.property('width', 400);
            expect(res0).to.have.property('height', 314);
        })
        it('should set ready = true when the payload is 100% processed', function() {
            var payload = {
                id: 3,
                details: {
                    url: '/somewhere/image.jpg',
                    width: 400,
                    height: 300,
                },
                completion: 100
            };
            var details = {
                resources: [
                    {
                        type: 'image',
                        payload_id: 3,
                    },
                    {
                        type: 'video',
                        payload_id: 4
                    }
                ]
            };
            var newDetails = Functions.updatePayload(details, payload);
            var res0 = newDetails.resources[0];
            expect(res0).to.have.property('ready', true);
        })
        it('should set ready = false when the payload is less than 100% processed', function() {
            var payload = {
                id: 3,
                details: {
                    url: '/somewhere/image.jpg',
                    width: 400,
                    height: 300,
                },
                completion: 90
            };
            var details = {
                resources: [
                    {
                        type: 'image',
                        payload_id: 3,
                    },
                    {
                        type: 'video',
                        payload_id: 4
                    }
                ]
            };
            var newDetails = Functions.updatePayload(details, payload);
            var res0 = newDetails.resources[0];
            expect(res0).to.have.property('ready', false);
        })
        it('should copy properties into the details object itself when there payload id is there', function() {
            var payload = {
                id: 3,
                details: {
                    url: '/somewhere/image.jpg',
                    width: 400,
                    height: 300,
                },
                completion: 90
            };
            var details = {
                type: 'image',
                payload_id: 3,
            };
            var newDetails = Functions.updatePayload(details, payload, true);
            expect(newDetails).to.have.property('url');
            expect(newDetails).to.have.property('width');
            expect(newDetails).to.have.property('height');
            expect(newDetails).to.have.property('payload_id');
            expect(newDetails).to.have.property('ready', false);
        })
    })
    describe('#externalIdStrings()', function() {
        it('should return an array of concatenated id string', function() {
            var external = [
                {
                    type: 'gitlab',
                    server_id: 2,
                    user: {
                        id: 1,
                    }
                },
                {
                    type: 'gitlab',
                    server_id: 3,
                    user: {
                        id: 2,
                    }
                }
            ];
            var list = Functions.externalIdStrings(external, 'gitlab', [ 'user' ]);
            expect(list).to.deep.equal([ '2,1', '3,2' ]);
        })
        it('should ignore entries where object is missing', function() {
            var external = [
                {
                    type: 'facebook',
                    server_id: 5,
                    user: {
                        id: '0123456789001234567890',
                    }
                },
                {
                    type: 'facebook',
                    server_id: 6
                }
            ];
            var list = Functions.externalIdStrings(external, 'facebook', [ 'user' ]);
            expect(list).to.deep.equal([ '5,0123456789001234567890' ]);
        })
        it('should not include server id when server type is not specified', function() {
            var external = [
                {
                    type: 'gitlab',
                    server_id: 2,
                    commit: {
                        id: '012345',
                    }
                },
                {
                    type: 'github',
                    server_id: 3,
                    commit: {
                        id: '234567',
                    }
                }
            ];
            var list = Functions.externalIdStrings(external, null, [ 'commit' ]);
            expect(list).to.deep.equal([ '012345', '234567' ]);
        })
        it('should generate multiple strings per entry when object has an id list instead of just a single id', function() {
            var external = [
                {
                    type: 'gitlab',
                    server_id: 2,
                    project: {
                        id: 1,
                    },
                    commit: {
                        ids: [ '012345', '123456' ],
                    }
                },
                {
                    type: 'gitlab',
                    server_id: 3,
                    project: {
                        id: 7,
                    },
                    commit: {
                        ids: [ '234567' ],
                    }
                }
            ];
            var list = Functions.externalIdStrings(external, 'gitlab', [ 'project', 'commit' ]);
            expect(list).to.deep.equal([ '2,1,012345', '2,1,123456', '3,7,234567' ]);
        })
        it('should just the server ids when no names are specified', function() {
            var external = [
                {
                    type: 'gitlab',
                    server_id: 2,
                    user: {
                        id: 1,
                    }
                },
                {
                    type: 'gitlab',
                    server_id: 3,
                    user: {
                        id: 2,
                    }
                }
            ];
            var list = Functions.externalIdStrings(external, 'gitlab', []);
            expect(list).to.deep.equal([ '2', '3' ]);
        })
    })
})
