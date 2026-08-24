import assert from "node:assert/strict";
import test from "node:test";

import { run } from "../../dist/cli.js";

function captureOutput() {
  const stdout = [];
  const stderr = [];
  return {
    output: {
      log: (message) => stdout.push(message),
      error: (message) => stderr.push(message),
    },
    stdout,
    stderr,
  };
}

test("help describes setup without touching client state", async () => {
  const capture = captureOutput();

  const status = await run(["--help"], capture.output);

  assert.equal(status, 0);
  assert.match(capture.stdout.join("\n"), /newsmcp setup/);
  assert.deepEqual(capture.stderr, []);
});

test("unknown commands fail with a bounded error", async () => {
  const capture = captureOutput();

  const status = await run(["unknown"], capture.output);

  assert.equal(status, 1);
  assert.match(capture.stderr.join("\n"), /Unknown command: unknown/);
});
