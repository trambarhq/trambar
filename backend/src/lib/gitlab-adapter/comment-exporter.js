

function exportComments(db, schema) {
    return Story.findOne(db, event.schema, { id: reaction.story_id }, '*').then((story) => {
        var repoId = story.repo_id;
        var issueId = story.external_id;
        if (repoId && issueId) {
            taskQueue.schedule(() => {
                return Repo.findOne(db, 'global', { id: repoId }, '*').then((repo) => {
                    return Project.findOne(db, 'global', { name: schema }, '*').then((project) => {
                        if (!repo || !project || !_.includes(project.repo_ids, repo.id)) {
                            return;
                        }
                        return Server.findOne(db, 'global', { id: repo.server_id }, '*').then((server) => {
                            exportComment(project, reaction, server, repo, issueId);
                        });
                    });
                });
            });
        }
    });
}
