const REDACTION_PATTERNS: RegExp[] = [
  /CFBD_API_KEY=\S+/gi,
  /Authorization:\s*Bearer\s+\S+/gi,
  /Bearer\s+[A-Za-z0-9._-]+/gi,
];

export function redactLogLine(line: string): string {
  let out = line;
  for (const pattern of REDACTION_PATTERNS) {
    out = out.replace(pattern, "[REDACTED]");
  }
  return out;
}
