import { Position, getLine } from './location';

export default class ParseError extends Error {
  line: number;
  column: number;

  constructor(input: string, position: Position, message: string, options?: { cause?: unknown }) {
    let error_message = `Error parsing TOML (${position.line}, ${position.column + 1}):\n`;

    if (input) {
      const line = getLine(input, position);
      const pointer = `${whitespace(position.column)}^`;

      if (line) error_message += `${line}\n${pointer}\n`;
    }
    error_message += message;

    super(error_message, options);

    this.line = position.line;
    this.column = position.column;
  }
}

export function isParseError(error: Error): error is ParseError {
  return error && Object.prototype.hasOwnProperty.call(error, 'line');
}

// Recursive descent overflows the JS stack on pathological nesting; surface it as the library's own error.
export function rethrowStackOverflow<T>(run: () => T): T {
  try {
    return run();
  } catch (error) {
    if (error instanceof RangeError) {
      throw new ParseError('', { line: 1, column: 0 }, 'nesting too deep', { cause: error });
    }
    throw error;
  }
}

function whitespace(count: number, character: string = ' '): string {
  return character.repeat(count);
}
