import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

/**
 * Ask Claude via the headless CLI (`claude -p`). Keyless — reuses the local
 * Claude Code auth. Returns the model's raw text output (the `result` field).
 *
 * Set PURGE_CLAUDE_BIN to override the binary path; defaults to `claude` on PATH.
 */
export async function askClaude(prompt: string, timeoutMs = 90_000): Promise<string> {
  const bin = process.env['PURGE_CLAUDE_BIN'] || 'claude';
  const { stdout } = await execFileAsync(
    bin,
    ['-p', prompt, '--output-format', 'json'],
    { timeout: timeoutMs, maxBuffer: 10 * 1024 * 1024 },
  );
  const parsed = JSON.parse(stdout) as { result?: string; is_error?: boolean };
  if (parsed.is_error || typeof parsed.result !== 'string') {
    throw new Error('Claude CLI returned an error or no result');
  }
  return parsed.result;
}

/** Extract the first JSON array/object from a model response (tolerates ```json fences and prose). */
export function extractJson<T>(text: string): T {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const body = fenced ? fenced[1] : text;
  const start = body.search(/[[{]/);
  if (start === -1) throw new Error('No JSON found in model output');
  // Find the matching end by scanning from the last closing bracket.
  const end = Math.max(body.lastIndexOf(']'), body.lastIndexOf('}'));
  if (end === -1 || end < start) throw new Error('Malformed JSON in model output');
  return JSON.parse(body.slice(start, end + 1)) as T;
}
