import StoryTypeRatings from './ratings/story-type-ratings.mjs';

export class ByType {
  static type = 'by-type';
  static calculation = 'immediate';
  static columns = [ 'type' ];
  static monitoring = [];

  static async prepareContext(db, schema, stories, listing) {
    return {};
  }

  static calculateRating(context, story) {
    const rating = StoryTypeRatings[story.type] || 0;
    return rating;
  }

  static handleEvent(evt) {
  }
};
