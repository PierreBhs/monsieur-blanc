export type MrWhiteVariant = {
  id: string;
  src: string;
  label: string;
  description: string;
};

export const MR_WHITE_VARIANTS: readonly MrWhiteVariant[] = [
  {
    id: "walter-white",
    src: "/mr-white-variants/walter-white.png",
    label: "Walter White",
    description:
      "The chemistry teacher turned drug lord at the center of Breaking Bad.",
  },
  {
    id: "michael-jackson",
    src: "/mr-white-variants/michael-jackson.png",
    label: "Michael Jackson",
    description: "The King of Pop whose hits, moonwalk, and global fame defined pop music for decades.",
  },
  {
    id: "jack-white",
    src: "/mr-white-variants/jack-white.png",
    label: "Jack White",
    description: "Rock guitarist and singer of The White Stripes and a prolific figure in modern garage rock.",
  },
  {
    id: "barry-white",
    src: "/mr-white-variants/barry-white.png",
    label: "Barry White",
    description: "Soul singer with a deep, velvety voice behind romantic classics like \"Can't Get Enough of Your Love, Babe.\"",
  },
  {
    id: "colonel-sanders",
    src: "/mr-white-variants/colonel-sanders.png",
    label: "Colonel Sanders",
    description: "Founder of Kentucky Fried Chicken and the white-suited, goateed face of the global fast-food chain.",
  },
  {
    id: "white-walker",
    src: "/mr-white-variants/white-walker.png",
    label: "White Walker",
    description: "Ice-born undead warriors from Game of Thrones who threaten the living beyond the Wall.",
  },
] as const;

type Rng = () => number;

export function pickMrWhiteVariant(rng: Rng = Math.random): MrWhiteVariant {
  const index = Math.floor(rng() * MR_WHITE_VARIANTS.length);
  return MR_WHITE_VARIANTS[index] ?? MR_WHITE_VARIANTS[0];
}

export function preloadMrWhiteVariant(src: string): void {
  const image = new Image();
  image.src = src;
}
