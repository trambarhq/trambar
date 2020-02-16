import { expect } from 'chai';

import * as ExternalDataUtils from '../external-data-utils.mjs';

describe('ExternalDataUtils', function() {
  describe('#createLink()', function() {
    it('should create a link object', function() {
      let server = {
        id: 3,
        type: 'gitlab',
        details: {}
      };
      let link = ExternalDataUtils.createLink(server, {
        project: { id: 1 }
      });
      expect(link).to.deep.equal({
        type: 'gitlab',
        server_id: 3,
        project: { id: 1 }
      });
    })
  })
  describe('#extendLink()', function() {
    it('should extend object\'s link with additional properties', function() {
      let server = {
        id: 3,
        type: 'gitlab',
        details: {}
      };
      let repo = {
        id: 4,
        external: [
          ExternalDataUtils.createLink(server, {
            project: { id: 1 }
          })
        ]
      };
      let link = ExternalDataUtils.extendLink(server, repo, {
        commit: { id: 'abcdefg' }
      });
      expect(link).to.deep.equal({
        type: 'gitlab',
        server_id: 3,
        project: { id: 1 },
        commit: { id: 'abcdefg' },
      });
    })
  })
  describe('#addLink()', function() {
    it('should add link to an object', function() {
      let server = {
        id: 3,
        type: 'gitlab',
        details: {}
      };
      let repo = {
        id: 4,
      };
      ExternalDataUtils.addLink(repo, server, {
        project: { id: 1 },
      });
      expect(repo).to.deep.equal({
        id: 4,
        external: [
          {
            type: 'gitlab',
            server_id: 3,
            project: { id: 1 },
          }
        ]
      });
    })
  })
  describe('#inheritLink()', function() {
    it('should add link that inherits keys from another object', function() {
      let server = {
        id: 3,
        type: 'gitlab',
        details: {}
      };
      let repo = {
        id: 4,
        external: [
          {
            type: 'gitlab',
            server_id: 3,
            project: { id: 1 },
          }
        ]
      };
      let commit = {
        id: 45,
        details: {},
      };
      ExternalDataUtils.inheritLink(commit, server, repo, {
        commit: { id: 'abcdefg' },
      });
      expect(commit).to.deep.equal({
        id: 45,
        details: {},
        external: [
          {
            type: 'gitlab',
            server_id: 3,
            project: { id: 1 },
            commit: { id: 'abcdefg' },
          }
        ]
      });
    })
  })
  describe('#findLink()', function() {
    it('should find a link', function() {
      let server = {
        id: 3,
        type: 'gitlab',
        details: {}
      };
      let repo = {
        id: 4,
        external: [
          {
            type: 'gitlab',
            server_id: 3,
            project: { id: 1 },
          }
        ]
      };
      let link = ExternalDataUtils.findLink(repo, server);
      expect(link).to.equal(repo.external[0]);
    })
    it('should find a link with a particular key', function() {
      let server = {
        id: 3,
        type: 'gitlab',
        details: {}
      };
      let repo = {
        id: 4,
        external: [
          {
            type: 'gitlab',
            server_id: 3,
            project: { id: 1 },
          }
        ]
      };
      let link = ExternalDataUtils.findLink(repo, server, {
        project: { id: 1 }
      });
      expect(link).to.equal(repo.external[0]);
    })
    it('should return null when key does not match', function() {
      let server = {
        id: 3,
        type: 'gitlab',
        details: {}
      };
      let repo = {
        id: 4,
        external: [
          {
            type: 'gitlab',
            server_id: 3,
            project: { id: 1 },
          }
        ]
      };
      let link = ExternalDataUtils.findLink(repo, server, {
        project: { id: 3 }
      });
      expect(link).to.be.null;
    })
  })
  describe('#findLinkByServerType()', function() {
    it('should find a link by type', function() {
      let repo = {
        id: 4,
        external: [
          {
            type: 'gitlab',
            server_id: 3,
            project: { id: 1 },
          }
        ]
      };
      let link = ExternalDataUtils.findLinkByServerType(repo, 'gitlab');
      expect(link).to.equal(repo.external[0]);
    })
    it('should return null when there is no link of specified type', function() {
      let repo = {
        id: 4,
        external: [
          {
            type: 'gitlab',
            server_id: 3,
            project: { id: 1 },
          }
        ]
      };
      let link = ExternalDataUtils.findLinkByServerType(repo, 'github');
      expect(link).to.be.null;
    })
  })
  describe('#findLinkByRelations()', function() {
    it('should find a link by type', function() {
      let issue = {
        id: 7,
        external: [
          {
            type: 'gitlab',
            server_id: 3,
            project: { id: 1 },
            issue: { id: 12 }
          }
        ]
      };
      let link = ExternalDataUtils.findLinkByRelations(issue, 'project', 'issue');
      expect(link).to.equal(issue.external[0]);
    })
    it('should return null when there is no link with specified relations', function() {
      let repo = {
        id: 4,
        external: [
          {
            type: 'gitlab',
            server_id: 3,
            project: { id: 1 },
          }
        ]
      };
      let link = ExternalDataUtils.findLinkByServerType(repo, 'project', 'issue');
      expect(link).to.be.null;
    })
  })
  describe('#findLinkByRelative()', function() {
    it('should find a link that is from the same server as another object', function() {
      let repo = {
        id: 4,
        external: [
          {
            type: 'gitlab',
            server_id: 3,
            project: { id: 1 },
          }
        ]
      };
      let issue = {
        id: 7,
        external: [
          {
            type: 'gitlab',
            server_id: 3,
            project: { id: 1 },
            issue: { id: 12 }
          }
        ]
      };
      let link = ExternalDataUtils.findLinkByRelative(issue, repo);
      expect(link).to.equal(issue.external[0]);
    })
    it('should find a match when provided with additional relations', function() {
      let repo = {
        id: 4,
        external: [
          {
            type: 'gitlab',
            server_id: 3,
            project: { id: 1 },
          }
        ]
      };
      let issue = {
        id: 7,
        external: [
          {
            type: 'gitlab',
            server_id: 3,
            project: { id: 1 },
            issue: { id: 12 }
          }
        ]
      };
      let link = ExternalDataUtils.findLinkByRelative(issue, repo, 'project');
      expect(link).to.equal(issue.external[0]);
    })
    it('should not find a match when the objects are from different servers', function() {
      let repo = {
        id: 4,
        external: [
          {
            type: 'github',
            server_id: 2,
            project: { id: 1 },
          }
        ]
      };
      let issue = {
        id: 7,
        external: [
          {
            type: 'gitlab',
            server_id: 3,
            project: { id: 1 },
            issue: { id: 12 }
          }
        ]
      };
      let link = ExternalDataUtils.findLinkByRelative(issue, repo);
      expect(link).to.be.null;
    })
    it('should not find a match when the relations do not match', function() {
      let repo = {
        id: 4,
        external: [
          {
            type: 'gitlab',
            server_id: 3,
            project: { id: 3 },
          }
        ]
      };
      let issue = {
        id: 7,
        external: [
          {
            type: 'gitlab',
            server_id: 3,
            project: { id: 1 },
            issue: { id: 12 }
          }
        ]
      };
      let link = ExternalDataUtils.findLinkByRelative(issue, repo, 'project');
      expect(link).to.be.null;
    })
  })
  describe('#removeLink()', function() {
    it('should add link that inherits keys from another object', function() {
      let server = {
        id: 3,
        type: 'gitlab',
        details: {}
      };
      let repo = {
        id: 4,
        external: [
          {
            type: 'gitlab',
            server_id: 3,
            project: { id: 1 },
          }
        ]
      };
      ExternalDataUtils.removeLink(repo, server);
      expect(repo).to.have.property('external').that.has.a.lengthOf(0);
    })
  })
  describe('#importProperty()', function() {
    it('should overwrite a value when overwrite = always', function() {
      let server = {
        id: 3,
        type: 'gitlab',
        details: {}
      };
      let repo = {
        name: 'evil',
      };
      ExternalDataUtils.addLink(repo, server);
      ExternalDataUtils.importProperty(repo, server, 'name', {
        value: 'good',
        overwrite: 'always'
      });
      expect(repo).to.have.property('name').that.equal('good');
    })
    it('should not overwrite a value when overwrite = never', function() {
      let server = {
        id: 3,
        type: 'gitlab',
        details: {}
      };
      let repo = {
        name: 'evil',
      };
      ExternalDataUtils.addLink(repo, server);
      ExternalDataUtils.importProperty(repo, server, 'name', {
        value: 'good',
        overwrite: 'never'
      });
      expect(repo).to.have.property('name').that.equal('evil');
    })
    it('should set an unassigned property when overwrite = never', function() {
      let server = {
        id: 3,
        type: 'gitlab',
        details: {}
      };
      let repo = {};
      ExternalDataUtils.addLink(repo, server);
      ExternalDataUtils.importProperty(repo, server, 'name', {
        value: 'good',
        overwrite: 'never'
      });
      expect(repo).to.have.property('name').that.equal('good');
    })
    it('should set an unassigned property when overwrite = match-previous', function() {
      let server = {
        id: 3,
        type: 'gitlab',
        details: {}
      };
      let repo = {};
      ExternalDataUtils.addLink(repo, server);
      ExternalDataUtils.importProperty(repo, server, 'name', {
        value: 'good',
        overwrite: 'match-previous:_name'
      });
      expect(repo).to.have.property('name').that.equal('good');
    })
    it('should set an property when it has not been changed', function() {
      let server = {
        id: 3,
        type: 'gitlab',
        details: {}
      };
      let repo = {};
      ExternalDataUtils.addLink(repo, server);
      ExternalDataUtils.importProperty(repo, server, 'name', {
        value: 'good',
        overwrite: 'match-previous:_name'
      });
      expect(repo).to.have.property('name').that.equal('good');
      ExternalDataUtils.importProperty(repo, server, 'name', {
        value: 'bad',
        overwrite: 'match-previous:_name'
      });
      expect(repo).to.have.property('name').that.equal('bad');
      ExternalDataUtils.importProperty(repo, server, 'name', {
        value: 'ugly',
        overwrite: 'match-previous:_name'
      });
      expect(repo).to.have.property('name').that.equal('ugly');
    })
    it('should not set an property when it was changed', function() {
      let server = {
        id: 3,
        type: 'gitlab',
        details: {}
      };
      let repo = {};
      ExternalDataUtils.addLink(repo, server);
      ExternalDataUtils.importProperty(repo, server, 'name', {
        value: 'good',
        overwrite: 'match-previous:_name'
      });
      expect(repo).to.have.property('name').that.equal('good');
      repo.name = 'sad';
      ExternalDataUtils.importProperty(repo, server, 'name', {
        value: 'bad',
        overwrite: 'match-previous:_name'
      });
      expect(repo).to.have.property('name').that.equal('sad');
    })
  })
  describe('#importResource()', function() {
    it('should insert a resource when replace = always there there was none before', function() {
      let server = {
        id: 3,
        type: 'gitlab',
        details: {}
      };
      let res = {
        type: 'image',
        url: '/srv/media/images/abcdefg',
        width: 10,
        height: 20,
      };
      let repo = {};
      ExternalDataUtils.addLink(repo, server);
      ExternalDataUtils.importResource(repo, server, {
        type: 'image',
        value: res,
        replace: 'always'
      });
      expect(repo).to.have.nested.property('details.resources').that.contains(res);
    })
    it('should replace a resource when replace = always', function() {
      let server = {
        id: 3,
        type: 'gitlab',
        details: {}
      };
      let res1 = {
        type: 'image',
        url: '/srv/media/images/abcdefg',
        width: 10,
        height: 20,
      };
      let res2 = {
        type: 'image',
        url: '/srv/media/images/qwerty',
        width: 10,
        height: 20,
      };
      let repo = {};
      ExternalDataUtils.addLink(repo, server);
      ExternalDataUtils.importResource(repo, server, {
        type: 'image',
        value: res1,
        replace: 'always'
      });
      expect(repo).to.have.nested.property('details.resources').that.contains(res1);
      ExternalDataUtils.importResource(repo, server, {
        type: 'image',
        value: res2,
        replace: 'always'
      });
      expect(repo).to.have.nested.property('details.resources').to.have.lengthOf(1).that.contains(res2);
    })
    it('should remove a resource when replace = always', function() {
      let server = {
        id: 3,
        type: 'gitlab',
        details: {}
      };
      let res1 = {
        type: 'image',
        url: '/srv/media/images/abcdefg',
        width: 10,
        height: 20,
      };
      let res2 = {
        type: 'image',
        url: '/srv/media/images/qwerty',
        width: 10,
        height: 20,
      };
      let repo = {};
      ExternalDataUtils.addLink(repo, server);
      ExternalDataUtils.importResource(repo, server, {
        type: 'image',
        value: res1,
        replace: 'always'
      });
      expect(repo).to.have.nested.property('details.resources').that.contains(res1);
      ExternalDataUtils.importResource(repo, server, {
        type: 'image',
        value: null,
        replace: 'always'
      });
      expect(repo).to.not.have.nested.property('details.resources');
    })
    it('should not replace a resource when replace = never', function() {
      let server = {
        id: 3,
        type: 'gitlab',
        details: {}
      };
      let res1 = {
        type: 'image',
        url: '/srv/media/images/abcdefg',
        width: 10,
        height: 20,
      };
      let res2 = {
        type: 'image',
        url: '/srv/media/images/qwerty',
        width: 10,
        height: 20,
      };
      let repo = {};
      ExternalDataUtils.addLink(repo, server);
      ExternalDataUtils.importResource(repo, server, {
        type: 'image',
        value: res1,
        replace: 'never'
      });
      expect(repo).to.have.nested.property('details.resources').that.contains(res1);
      ExternalDataUtils.importResource(repo, server, {
        type: 'image',
        value: res2,
        replace: 'never'
      });
      expect(repo).to.have.nested.property('details.resources').to.have.lengthOf(1).that.contains(res1);
    })
    it('should replace a resource when replace = match-previous', function() {
      let server = {
        id: 3,
        type: 'gitlab',
        details: {}
      };
      let res1 = {
        type: 'image',
        url: '/srv/media/images/abcdefg',
        width: 10,
        height: 20,
      };
      let res2 = {
        type: 'image',
        url: '/srv/media/images/qwerty',
        width: 10,
        height: 20,
      };
      let res3 = {
        type: 'image',
        url: '/srv/media/images/qwerty',
        width: 100,
        height: 200,
      };
      let repo = {};
      ExternalDataUtils.addLink(repo, server);
      ExternalDataUtils.importResource(repo, server, {
        type: 'image',
        value: res1,
        replace: 'match-previous'
      });
      expect(repo).to.have.nested.property('details.resources').that.contains(res1);
      ExternalDataUtils.importResource(repo, server, {
        type: 'image',
        value: res2,
        replace: 'match-previous'
      });
      expect(repo).to.have.nested.property('details.resources').to.have.lengthOf(1).that.contains(res2);
      ExternalDataUtils.importResource(repo, server, {
        type: 'image',
        value: res3,
        replace: 'match-previous'
      });
      expect(repo).to.have.nested.property('details.resources').to.have.lengthOf(1).that.contains(res3);
    })
    it('should not replace a resource if it was changed', function() {
      let server = {
        id: 3,
        type: 'gitlab',
        details: {}
      };
      let res1 = {
        type: 'image',
        url: '/srv/media/images/abcdefg',
        width: 10,
        height: 20,
      };
      let res2 = {
        type: 'image',
        url: '/srv/media/images/qwerty',
        width: 10,
        height: 20,
      };
      let res3 = {
        type: 'image',
        url: '/srv/media/images/qwerty',
        width: 100,
        height: 200,
      };
      let resX = {
        type: 'image',
        url: '/srv/media/images/zxcvbn',
        width: 30,
        height: 30,
      };
      let repo = {};
      ExternalDataUtils.addLink(repo, server);
      ExternalDataUtils.importResource(repo, server, {
        type: 'image',
        value: res1,
        replace: 'match-previous'
      });
      expect(repo).to.have.nested.property('details.resources').that.contains(res1);
      repo.details.resources[0] = resX;
      ExternalDataUtils.importResource(repo, server, {
        type: 'image',
        value: res2,
        replace: 'match-previous'
      });
      expect(repo).to.have.nested.property('details.resources').to.have.lengthOf(1).that.contains(resX);
      ExternalDataUtils.importResource(repo, server, {
        type: 'image',
        value: res3,
        replace: 'match-previous'
      });
      expect(repo).to.have.nested.property('details.resources').to.have.lengthOf(1).that.contains(resX);
    })
    it('should not insert another resource if the previous one was removed', function() {
      let server = {
        id: 3,
        type: 'gitlab',
        details: {}
      };
      let res1 = {
        type: 'image',
        url: '/srv/media/images/abcdefg',
        width: 10,
        height: 20,
      };
      let res2 = {
        type: 'image',
        url: '/srv/media/images/qwerty',
        width: 10,
        height: 20,
      };
      let res3 = {
        type: 'image',
        url: '/srv/media/images/qwerty',
        width: 100,
        height: 200,
      };
      let repo = {};
      ExternalDataUtils.addLink(repo, server);
      ExternalDataUtils.importResource(repo, server, {
        type: 'image',
        value: res1,
        replace: 'match-previous'
      });
      expect(repo).to.have.nested.property('details.resources').that.contains(res1);
      repo.details.resources.splice(0);
      ExternalDataUtils.importResource(repo, server, {
        type: 'image',
        value: res2,
        replace: 'match-previous'
      });
      expect(repo).to.not.have.nested.property('details.resources');
      ExternalDataUtils.importResource(repo, server, {
        type: 'image',
        value: res3,
        replace: 'match-previous'
      });
      expect(repo).to.not.have.nested.property('details.resources');
    })
  })
  describe('#findCommonServer()', function() {
    it('should find server common to multiple objects', function() {
      let repo = {
        id: 4,
        external: [
          {
            type: 'github',
            server_id: 2,
            project: { id: 8 },
          },
          {
            type: 'gitlab',
            server_id: 3,
            project: { id: 1 },
          },
        ]
      };
      let issue = {
        id: 7,
        external: [
          {
            type: 'github',
            server_id: 14,
            project: { id: 8 },
            issue: { id: 12 }
          },
          {
            type: 'gitlab',
            server_id: 3,
            project: { id: 1 },
            issue: { id: 12 }
          },
        ]
      };
      let server = ExternalDataUtils.findCommonServer(issue, repo);
      expect(server).to.deep.equal({ id: 3, type: 'gitlab' });
    })
    it('should return null when objects are not connected to the same server', function() {
      let repo = {
        id: 4,
        external: [
          {
            type: 'github',
            server_id: 2,
            project: { id: 8 },
          },
        ]
      };
      let issue = {
        id: 7,
        external: [
          {
            type: 'github',
            server_id: 14,
            project: { id: 8 },
            issue: { id: 12 }
          },
          {
            type: 'gitlab',
            server_id: 3,
            project: { id: 1 },
            issue: { id: 12 }
          },
        ]
      };
      let server = ExternalDataUtils.findCommonServer(issue, repo);
      expect(server).to.be.null;
    })
  })
})
