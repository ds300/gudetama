export function bold(s: string) {
  return `\u001b[1m${s}\u001b[0m`
}
export function cyan(s: string) {
  return `\u001b[36;1m${s}\u001b[0m`
}
export function gray(s: string) {
  return `\u001b[38;5;244m${s}\u001b[0m`
}
export function green(s: string) {
  return `\u001b[32;1m${s}\u001b[0m`
}
