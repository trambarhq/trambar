var _ = require('lodash');
var Promise = require('bluebird');
var Database = require('database');

Database.open(true).then((db) => {
    return Promise.resolve().then(() => {
        var tables = [
            'listing',
            'statistics'
        ];
        return db.listen(tables, 'clean', handleDatabaseCleanRequests);
    });
});

function handleDatabaseCleanRequests(events) {
    var now = new Date;
    _.each(events, (event) => {
        var elapsed = getTimeElapsed(event.atime, now);
        switch (event.table) {
            case 'statistics':
                var priority = 'low';
                if (elapsed < 10 * 1000) {
                    // last accessed within 10 sec
                    priority = 'high';
                } else if (elapsed < 15 * 60 * 1000) {
                    // last accessed within 15 min
                    priority = 'medium';
                }
                queueStatisticsUpdate(event.schema, event.id, priority);
                break;
            case 'listing':
                var priority = 'low';
                if (elapsed < 60 * 1000) {
                    // last accessed within 1 min
                    priority = 'high';
                }
                queueListingUpdate(event.schema, event.id, priority);
                break;
        }
    })
}

var statisticsUpdateQueues = {
    high: [],
    midium: [],
    low: []
};

function queueStatisticsUpdate(schema, id, priority) {
    // push item onto queue unless it's already there
    var item = { schema, id };
    var queue = statisticsUpdateQueues[priority];
    if (_.find(queue, item) === -1) {
        queue.push(item);
    }

    // remove it from the other queues
    _.forIn(statisticsUpdateQueues, (otherQueue) => {
        if (otherQueue !== queue) {
            var index = _.find(otherQueue, item);
            if (index !== -1) {
                otherQueue.splice(index, 1);
            }
        }
    });
    processNextStatisticsRow();
}

var updatingStatistics = false;

function processNextStatisticsRow() {
    if (updatingStatistics) {
        // already in the middle of something
        return;
    }
    var nextItem;
    _.each(statisticsUpdateQueues, (queue, priority) => {
        var nextItem = queue.shift();
        if (nextItem) {
            updatingStatistics = true;
            updateStatisticsRow(nextItem.schema, nextItem.id).then((success) => {
                updatingStatistics = false;

                // delay the process of the next row depending on priority
                var delay = 0;
                switch (priority) {
                    case 'high': delay = 0; break;
                    case 'medium': delay = 100; break;
                    case 'low': delay = 500; break;
                }
                if (delay) {
                    setTimeout(processNextStatisticsRow, delay);
                } else {
                    setImmediate(processNextStatisticsRow);
                }
            }).catch((err) => {
                setImmediate(processNextStatisticsRow);
            });
            return false;
        }
    });
}

function updateStatisticsRow(schema, id) {
    return Database.open().then((db) => {
        // establish a lock on the row first, so multiple instances of this
        // script won't waste time performing the same work
        return Statistics.lock(db, schema, id, '1 minute', 'gn, type, filters').then((row) => {
            // regenerate the row
            var analyser = _.find(analysers, { type: row.type });
            if (!analyser) {
                throw new Error('Unknown statistics type: ' + row.type);
            }
            return analyser.generate(db, schema, row.filters).then((props) => {
                // save the new data and release the lock
                return Statistics.unlock(db, schema, id, props, 'gn').then((newRow) => {
                    // if Postgres stored-proc has bumped the gn, then the new
                    // stats are actually different
                    if (row.gn !== newRow.gn) {
                        console.log('Updated statistics row ' + id);
                    } else {
                        console.log('Validated statistics row ' + id);
                    }
                });
            });
        }).finally(() => {
            return db.release();
        });
    });
}

var listingUpdateQueues = {
    high: [],
    midium: [],
    low: []
};
var listingUpdateTimeout = 0;

function queueListingUpdate(schema, id, priority) {
    // push item onto queue unless it's already there
    var item = { schema, id };
    var queue = listingUpdateQueues[priority];
    if (_.find(queue, item) === -1) {
        queue.push(item);
    }

    // remove it from the other queues
    _.forIn(listingUpdateQueues, (otherQueue) => {
        if (otherQueue !== queue) {
            var index = _.find(otherQueue, item);
            if (index !== -1) {
                otherQueue.splice(index, 1);
            }
        }
    });
    processNextListingRow();
}

function getTimeElapsed(start, end) {
    if (!start) {
        return Infinity;
    }
    if (!end) {
        return 0;
    }
    var s = (typeof(start) === 'string') ? new Date(start) : start;
    var e = (typeof(end) === 'string') ? new Date(end) : end;
    return (e - s);
}
