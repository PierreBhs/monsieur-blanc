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

const defaultCategoryGroup = "Objects & Tech";

const categoryGroups: Record<string, string> = {
  activities: "Entertainment & Culture",
  animals: "Nature & Science",
  beauty: "Entertainment & Culture",
  beliefs: "People & Society",
  breakfast: "Food & Drink",
  cards: "Entertainment & Culture",
  characters: "Entertainment & Culture",
  chemicals: "Nature & Science",
  cities: "Places & Travel",
  commerce: "Work & Money",
  communication: "People & Society",
  countries: "Places & Travel",
  culture: "Entertainment & Culture",
  disappearing: "Mystery & Danger",
  dishes: "Food & Drink",
  documents: "Work & Money",
  drama: "Entertainment & Culture",
  drinks: "Food & Drink",
  escape: "Mystery & Danger",
  events: "People & Society",
  explosives: "Mystery & Danger",
  food: "Food & Drink",
  fruits: "Food & Drink",
  games: "Entertainment & Culture",
  headwear: "Entertainment & Culture",
  history: "People & Society",
  hobbies: "Entertainment & Culture",
  institutions: "People & Society",
  internet: "Objects & Tech",
  jewelry: "Entertainment & Culture",
  jobs: "People & Society",
  leaders: "People & Society",
  liquids: "Food & Drink",
  machines: "Objects & Tech",
  media: "Entertainment & Culture",
  money: "Work & Money",
  music: "Entertainment & Culture",
  myths: "Entertainment & Culture",
  nature: "Nature & Science",
  nightlife: "Entertainment & Culture",
  objects: "Objects & Tech",
  office: "Work & Money",
  organizations: "People & Society",
  pasta: "Food & Drink",
  people: "People & Society",
  performances: "Entertainment & Culture",
  performers: "Entertainment & Culture",
  photos: "Entertainment & Culture",
  phrases: "People & Society",
  places: "Places & Travel",
  power: "Work & Money",
  prediction: "Mystery & Danger",
  property: "Work & Money",
  relationships: "People & Society",
  risk: "Mystery & Danger",
  rituals: "People & Society",
  rooms: "Places & Travel",
  secrets: "Mystery & Danger",
  security: "Mystery & Danger",
  social: "People & Society",
  sports: "Entertainment & Culture",
  states: "People & Society",
  substances: "Nature & Science",
  surveillance: "Mystery & Danger",
  sweets: "Food & Drink",
  transport: "Places & Travel",
  travel: "Places & Travel",
  truth: "People & Society",
  vegetables: "Food & Drink",
  vehicles: "Places & Travel",
  venues: "Places & Travel",
  wearables: "Entertainment & Culture",
  "weird groups": "People & Society",
};

export function filterWordPairs(deck: WordPair[], filter: DeckFilter): WordPair[] {
  return deck.filter((pair) => {
    const categoryMatches =
      filter.category === allCategories ||
      categoryGroupLabel(pair.category) === filter.category ||
      pair.category === filter.category;
    const difficultyMatches =
      filter.difficulty === anyDifficulty || wordPairDifficulty(pair) === filter.difficulty;

    return categoryMatches && difficultyMatches;
  });
}

export function deckCategoryOptions(deck: WordPair[]): DeckCategoryOption[] {
  const categoryCounts = new Map<string, number>();

  for (const pair of deck) {
    const category = categoryGroupLabel(pair.category);
    categoryCounts.set(category, (categoryCounts.get(category) ?? 0) + 1);
  }

  return Array.from(categoryCounts.entries())
    .map(([label, count]) => ({ value: label, label, count }))
    .sort((left, right) => left.label.localeCompare(right.label));
}

export function wordPairDifficulty(pair: WordPair): Exclude<DifficultyFilter, "any"> {
  const hasComplexWord = [pair.civilian, pair.undercover].some((word) => /[\s-]/.test(word) || word.length > 12);

  return hasComplexWord ? "tricky" : "easy";
}

export function categoryGroupLabel(category: string): string {
  return categoryGroups[category] ?? defaultCategoryGroup;
}
