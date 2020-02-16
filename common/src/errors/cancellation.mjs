class Cancellation extends Error {
  constructor() {
    super('Operation cancelled');
    this.cancellation = true;
  };
}

export {
  Cancellation as default,
  Cancellation,
};
