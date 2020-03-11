import StringWidth from 'string-width';

let prevLineCount = 0;
let writeFunction;

function writeOutput(text) {
  text += '\n';

  const stream = process.stdout;
  const lines = text.split('\n');
  prevLineCount += lines.length - 1;

  if (!writeFunction) {
    writeFunction = process.stdout.write;
    process.stdout.write = process.stderr.write = function() {
      commitOutput();
      return writeFunction.apply(this, arguments);
    };
  }
  writeFunction.call(stream, text);
}

const MOVE_LEFT = Buffer.from('1b5b3130303044', 'hex').toString();
const MOVE_UP = Buffer.from('1b5b3141', 'hex').toString();
const CLEAR_LINE = Buffer.from('1b5b304b', 'hex').toString();

function revertOutput() {
  const stream = process.stdout;
  const tokens = [];
  for (let i = prevLineCount; i >= 1; i--) {
    tokens.push(MOVE_UP, MOVE_LEFT, CLEAR_LINE);
  }
  prevLineCount = 0;
  if (tokens.length > 0) {
    writeFunction.call(stream, tokens.join(''));
  }
}

function commitOutput() {
  prevLineCount = 0;
}

export {
  revertOutput,
  commitOutput,
  writeOutput,
};
