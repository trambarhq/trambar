import _ from 'lodash';

const table = 'reaction';

async function saveReaction(db, reaction) {
    return await db.saveOne({ table }, reaction);
}

async function removeReaction(db, reaction) {
    return await db.removeOne({ table }, reaction);
}

async function addLike(db, story, user) {
    const comment = {
        type: 'like',
        story_id: story.id,
        user_id: user.id,
        published: true,
        public: true,
    };
    return saveReaction(db, comment);
}

async function startComment(db, story, user) {
    const comment = {
        type: 'comment',
        story_id: story.id,
        user_id: user.id,
        details: {},
        published: false,
        public: true,
    };
    return saveReaction(db, comment);
}

async function saveSurveyResults(db, story, user, answers)  {
    const reaction = {
        type: 'vote',
        story_id: story.id,
        user_id: user.id,
        published: true,
        public: true,
        details: { answers }
    };
    return saveReaction(db, reaction);
}

async function updateTaskStatuses(db, reactions, story, user, answers) {
    const reactionsAfter = [];
    for (let [ listKey, itemStatuses ] of _.entries(answers)) {
        for (let [ itemKey, selected ] of _.entries(itemStatuses)) {
            const task = {
                list: parseInt(listKey),
                item: parseInt(itemKey)
            };
            const existing = _.find(reactions, (reaction) => {
                if (reaction.type === 'task-completion') {
                    if (reaction.user_id === user.id) {
                        return _.isEqual(reaction.details.task, task);
                    }
                }
            });
            if (selected) {
                if (!existing) {
                    const reaction = {
                        type: 'task-completion',
                        story_id: story.id,
                        user_id: user.id,
                        published: true,
                        public: true,
                        details: { task },
                    };
                    const reactionAfter = await saveReaction(db, reaction);
                    reactionsAfter.push(reactionAfter);
                } else {
                    reactionsAfter.push(existing);
                }
            } else {
                if (existing) {
                    await removeReaction(db, existing);
                }
            }
        }
    }
    return reactionsAfter;
}

async function republishReaction(db, reaction) {
    return saveReaction(db, { id: reaction.id, published: true });
}

export {
    saveReaction,
    removeReaction,
    republishReaction,
    addLike,
    startComment,
    saveSurveyResults,
    updateTaskStatuses,
};
