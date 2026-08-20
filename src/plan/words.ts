// ============================================================
// Saying a list out loud.
//
// Lowest layer on purpose: the engine writes sentences in several
// places and each one had grown its own join, so "shoulder, elbow" and
// "shoulder and elbow" both shipped depending on which file you were
// reading. One definition, and the Oxford comma stays off because the
// coach does not talk like a style guide.
// ============================================================

/** "squat", "squat and press", "squat, press and row". */
export function wordList(words: string[]): string {
  if (words.length <= 1) return words[0] ?? ''
  return `${words.slice(0, -1).join(', ')} and ${words[words.length - 1]}`
}
