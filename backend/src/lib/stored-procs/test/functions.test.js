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
    describe('#serverIds()', function() {
        it('should return a list of server ids from an array of objects', function() {
            var external = [
                {
                    type: 'gitlab',
                    server_id: 2,
                    user: {
                        id: 1,
                    }
                },
                {
                    type: 'facebook',
                    server_id: 3,
                    user: {
                        id: '0123456789001234567890',
                    }
                }
            ];
            var list = Functions.serverIds(external);
            expect(list).to.deep.equal([ 2, 3 ]);
        })
    })
    describe('#intUserIds()', function() {
        it('should return a list of user ids that are presumably numbers', function() {
            var external = [
                {
                    type: 'gitlab',
                    server_id: 2,
                    user: {
                        id: 1,
                    }
                },
                {
                    type: 'facebook',
                    server_id: 3,
                    user: {
                        id: '0123456789001234567890',
                    }
                }
            ];
            var list = Functions.intUserIds(external, 'gitlab');
            expect(list).to.deep.equal([ 1 ]);
        })
    })
    describe('#stringUserIds()', function() {
        it('should return a list of user ids that are presumably strings', function() {
            var external = [
                {
                    type: 'gitlab',
                    server_id: 2,
                    user: {
                        id: 1,
                    }
                },
                {
                    type: 'facebook',
                    server_id: 3,
                    user: {
                        id: '0123456789001234567890',
                    }
                }
            ];
            var list = Functions.intUserIds(external, 'facebook');
            expect(list).to.deep.equal([ '0123456789001234567890' ]);
        })
    })
})
