import type { Clue } from '../types/game';

export function parseClue(response: string): Clue | null {
  let reasoning = '';
  // Support legacy thought tags
  const thoughtMatch = response.match(/<thought>([\s\S]*?)<\/thought>/i);
  if (thoughtMatch) {
    reasoning = thoughtMatch[1].trim();
  }

  // Support new "Reasoning:" format
  const reasoningMatch = response.match(/Reasoning:\s*([\s\S]*?)$/i);
  if (reasoningMatch && !reasoning) {
    reasoning = reasoningMatch[1].replace(/<[^>]*>/g, '').trim();
  }

  // Look for CLUE: word: number pattern, allowing for markdown bold/italic or quotes
  const clueMatch = response.match(/CLUE:\s*[*"'_]*([A-Za-z]+)[*"'_]*\s*:\s*(\d+)/i);
  if (clueMatch) {
    if (!reasoning) {
      reasoning = response.replace(/<thought>[\s\S]*?<\/thought>/ig, '').replace(/Reasoning:\s*[\s\S]*?$/i, '').replace(clueMatch[0], '').trim();
    }
    return {
      word: clueMatch[1].toUpperCase(),
      number: parseInt(clueMatch[2], 10),
      reasoning,
    };
  }

  // Fallback: look for "word: number" pattern in bold or quotes
  const fallback = response.match(/\*?\*?"?([A-Za-z]+)"?\*?\*?\s*:\s*(\d+)/);
  if (fallback) {
    if (!reasoning) {
      reasoning = response.replace(/<thought>[\s\S]*?<\/thought>/ig, '').replace(/Reasoning:\s*[\s\S]*?$/i, '').trim();
    }
    return {
      word: fallback[1].toUpperCase(),
      number: parseInt(fallback[2], 10),
      reasoning,
    };
  }

  return null;
}

export function parseGuess(response: string, validWords: string[]): string | 'PASS' | null {
  // 1. Look for GUESS: WORD pattern, allowing for formatting
  const guessMatch = response.match(/GUESS:\s*[*"'_]*([A-Za-z]+)/i);
  if (guessMatch) {
    const guessWord = guessMatch[1].toUpperCase().trim();
    if (guessWord === 'PASS') return 'PASS';
    const matched = validWords.find(w => w === guessWord);
    if (matched) return matched;
  }

  // 2. Check for PASS intent explicitly on its own line or strong single-word phrase
  if (/(?:^|\n)\s*\**PASS\**\s*(?:$|\n)/i.test(response)) {
    return 'PASS';
  }

  // 3. Try extracting from a line starting with GUESS:
  const guessLines = response.split('\n').filter(l => /GUESS:/i.test(l));
  if (guessLines.length > 0) {
    const lastGuessLine = guessLines[guessLines.length - 1].toUpperCase();
    if (/\bPASS\b/.test(lastGuessLine)) return 'PASS';
    for (const w of validWords) {
      if (new RegExp(`\\b${w}\\b`).test(lastGuessLine)) return w;
    }
  }

  // 4. Fallback: look for any bold word that matches a valid card
  const boldWords = response.match(/\*\*([A-Za-z]+)\*\*/g);
  if (boldWords) {
    for (const bold of boldWords) {
      const word = bold.replace(/\*\*/g, '').toUpperCase().trim();
      if (word === 'PASS') return 'PASS';
      const matched = validWords.find(w => w === word);
      if (matched) return matched;
    }
  }

  // 5. Check for conversational pass intent only if no strict guess formatting was found
  if (/\b(I will|We should|I vote to|Let's)\s+pass\b/i.test(response) || /\bPASS\b/i.test(response)) {
    return 'PASS';
  }

  return null;
}

export function cleanResponse(response: string): string {
  // Remove markdown headers
  let cleaned = response.replace(/^#{1,3}\s+.+$/gm, '');
  // Remove thought tags
  cleaned = cleaned.replace(/<thought>[\s\S]*?<\/thought>/ig, '');
  // Remove CLUE: / GUESS: prefixes (already parsed)
  cleaned = cleaned.replace(/^(CLUE|GUESS):\s*.+$/gim, '');
  // Remove Reasoning blocks
  cleaned = cleaned.replace(/^Reasoning:\s*.+$/gim, '');
  // Remove excessive whitespace
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n').trim();
  // Remove action asterisks like *(nodding)*
  cleaned = cleaned.replace(/\*\([^)]+\)\*/g, '');
  return cleaned;
}
