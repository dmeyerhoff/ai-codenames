import type { Clue } from '../types/game';

export function parseClue(response: string): Clue | null {
  let reasoning = '';
  const thoughtMatch = response.match(/<thought>([\s\S]*?)<\/thought>/i);
  if (thoughtMatch) {
    reasoning = thoughtMatch[1].trim();
  }

  // Look for CLUE: word: number pattern
  const clueMatch = response.match(/CLUE:\s*(\w+)\s*:\s*(\d+)/i);
  if (clueMatch) {
    if (!reasoning) {
      reasoning = response.replace(/<thought>[\s\S]*?<\/thought>/ig, '').replace(clueMatch[0], '').trim();
    }
    return {
      word: clueMatch[1].toUpperCase(),
      number: parseInt(clueMatch[2], 10),
      reasoning,
    };
  }

  // Fallback: look for "word: number" pattern in bold or quotes
  const fallback = response.match(/\*?\*?"?(\w+)"?\*?\*?\s*:\s*(\d+)/);
  if (fallback) {
    if (!reasoning) {
      reasoning = response.replace(/<thought>[\s\S]*?<\/thought>/ig, '').trim();
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
  // Check for PASS
  if (/\bPASS\b/i.test(response)) {
    return 'PASS';
  }

  // Look for GUESS: WORD pattern
  const guessMatch = response.match(/GUESS:\s*([A-Za-z]+)/i);
  if (guessMatch) {
    const guessWord = guessMatch[1].toUpperCase().trim();
    const matched = validWords.find(w => w === guessWord);
    if (matched) return matched;
  }

  // Fallback: look for any bold word that matches a valid card
  const boldWords = response.match(/\*\*([A-Za-z]+)\*\*/g);
  if (boldWords) {
    for (const bold of boldWords) {
      const word = bold.replace(/\*\*/g, '').toUpperCase().trim();
      const matched = validWords.find(w => w === word);
      if (matched) return matched;
    }
  }

  // Last resort: check if any valid word appears prominently
  const upperResponse = response.toUpperCase();
  for (const word of validWords) {
    if (new RegExp('\\b' + word + '\\b', 'i').test(upperResponse)) {
      return word;
    }
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
  // Remove excessive whitespace
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n').trim();
  // Remove action asterisks like *(nodding)*
  cleaned = cleaned.replace(/\*\([^)]+\)\*/g, '');
  return cleaned;
}
