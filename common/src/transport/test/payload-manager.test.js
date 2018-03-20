var _ = require('lodash');
var Promise = require('bluebird');
var Moment = require('moment');
var React = require('react');
var Chai = require('chai'), expect = Chai.expect;
var Enzyme = require('enzyme');

var PayloadManager = require('transport/payload-manager');
var RemoteDataSource = require('data/remote-data-source');
var IndexedDBCache = require('data/indexed-db-cache');
var HTTPRequest = require('transport/http-request');
var Database = require('data/database');
var RouteManager = require('routing/route-manager');
var Route = require('routing/route');

describe('PayloadManager', function() {
    var fetchOriginal = HTTPRequest.fetch;
    after(function() {
        HTTPRequest.fetch = fetchOriginal;
    })

    var cacheWrapper = Enzyme.mount(<IndexedDBCache databaseName="pm-test"/>);
    var cache = cacheWrapper.instance();
    var dataSourceProps = {
        cache: cache,
    };
    var dataSourceWrapper = Enzyme.mount(<RemoteDataSource {...dataSourceProps} />);
    var dataSource = dataSourceWrapper.instance();
    var database =  new Database(dataSource);
    var routeManagerProps = {
        pages: [],
        database: database,
    };
    var routeManagerWrapper = Enzyme.mount(<RouteManager {...routeManagerProps} />);
    var routeManager = routeManagerWrapper.instance();
    var route = new Route(routeManager);

    var payloadManagerProps = {
        hasConnection: true,
        database: database,
        route: route,
        onChange: null,
    };
    var payloadManagerWrapper = Enzyme.mount(<PayloadManager {...payloadManagerProps} />);
    var payloadManager = payloadManagerWrapper.instance();

    // restore props to default values after each test
    afterEach(function() {
        dataSourceWrapper.setProps(dataSourceProps);
    })

    describe('#add()', function() {
        it('should add a payload', function() {
        })
    })
    describe('#stream()', function() {
        it('should send blobs to server as they are added to stream', function() {
        })
    })
    describe('#dispatch()', function() {
        it('should start sending payloads', function() {
        })
    })
    describe('#inquire()', function() {
        it('should return information about a set of payloads', function() {
        })
    })
    describe('#getUploadProgress()', function() {
        it('should return overall upload progress', function() {
        })
    })
})
