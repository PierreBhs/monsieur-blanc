import type { WordPair } from "../game/types";

export const allCategories = "all";
export const anyDifficulty = "any";

export type DifficultyFilter = typeof anyDifficulty | "easy" | "tricky";

export type DeckFilter = {
  category: string;
  difficulty: DifficultyFilter;
};

export type DeckCategoryOption = {
  value: string;
  label: string;
  count: number;
};

export function filterWordPairs(deck: WordPair[], filter: DeckFilter): WordPair[] {
  return deck.filter((pair) => {
    const categoryMatches = filter.category === allCategories || pair.category === filter.category;
    const difficultyMatches =
      filter.difficulty === anyDifficulty || wordPairDifficulty(pair) === filter.difficulty;

    return categoryMatches && difficultyMatches;
  });
}

export function deckCategoryOptions(deck: WordPair[]): DeckCategoryOption[] {
  const categoryCounts = new Map<string, number>();

  for (const pair of deck) {
    categoryCounts.set(pair.category, (categoryCounts.get(pair.category) ?? 0) + 1);
  }

  return Array.from(categoryCounts.entries())
    .map(([label, count]) => ({ value: label, label, count }))
    .sort((left, right) => left.label.localeCompare(right.label));
}

export function wordPairDifficulty(pair: WordPair): Exclude<DifficultyFilter, "any"> {
  const hasComplexWord = [pair.civilian, pair.undercover].some((word) => /[\s-]/.test(word) || word.length > 12);

  return hasComplexWord ? "tricky" : "easy";
}
