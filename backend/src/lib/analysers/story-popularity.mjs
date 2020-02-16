import _ from 'lodash';
import Reaction from '../accessors/reaction.mjs';

class StoryPopularity {
  constructor() {
    this.type = 'story-popularity';
    // tables from which the stats are derived
    this.sourceTables = [ 'reaction' ];
    // filters and the columns they act on--determine which objects are
    // included in the statistics;
    this.filteredColumns = {
      reaction: {
        story_id: 'story_id',
      },
    };
    // additional criteria that objects must also meet to be included
    this.fixedFilters = {
      reaction: {
        deleted: false,
        published: true,
      }
    };
    // columns in the table(s) that affects the results (columns used by the
    // filters would, of course, also impact the results)
    this.depedentColumns = {
      reaction: [
        'type',
      ],
    };
  }

  async generate(db, schema, filters) {
    const criteria = { ...this.fixedFilters.reaction, ...filters };

    // load the reactions
    const rows = await Reaction.find(db, schema, criteria, 'type');
    // count by type
    const counts = {};
    for (let row of rows) {
      counts[row.type] = (counts[row.type] || 0) + 1;
    }
    return {
      details: counts,
      sample_count: rows.length,
    };
  }
}

const instance = new StoryPopularity;

export {
  instance as default,
  StoryPopularity,
};
