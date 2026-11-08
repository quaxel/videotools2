import type { PuppetLook } from "../../engine";

// "Your Daily Life as a Viking vs. a Roman Soldier" (16:9 long form): the cast, from the design doc's palettes.
// Bjorn: a returned warrior on his farm in Denmark, c. AD 900. Felix: a Roman auxiliary at Vindolanda, c. AD 105.

const LINEN = "#D5C4A0";

// Bjorn, ~34: broad and barrel-chested, honey hair tied back, rounded red-brown beard, moss-green wool tunic with a
// patch, linen at the neck, dark trousers, pale mustard-brown leg wraps, worn leather shoes, belt with pouch and knife.
export const BJORN: PuppetLook = {
  skin: "#ecb994",
  hair: "#B8783E",
  beard: "#8f4f30",
  outfit: "#596647",
  tunic: true,
  patch: "#77804f",
  belt: "#684733",
  pants: "#4a3a2c",
  wraps: "#a98f55",
  shoes: "#684733",
  tied: true,
  build: "broad",
};
// For the cold scenes: the grey-brown wool cloak over the shoulders.
export const BJORN_COLD: PuppetLook = { ...BJORN, cloak: "#7d6d5b" };

// Felix, ~27: narrow and upright, short dark hair, light stubble, faded brick-red tunic, tidy belt, army shoes.
export const FELIX: PuppetLook = {
  skin: "#e3b089",
  hair: "#33282a",
  stubble: "#33282a",
  outfit: "#A85543",
  tunic: true,
  belt: "#674A36",
  shoes: "#674A36",
  build: "narrow",
};
// Cold weather: the grey-brown cloak pinned at the shoulder.
export const FELIX_CLOAK: PuppetLook = { ...FELIX, cloak: "#7a6c5e" };
// Drill and watch: mail shirt and helmet over the tunic (shield and spear are 3D props: props.tsx).
export const FELIX_KIT: PuppetLook = { ...FELIX, mail: "#8A9698", hat: "#8A9698", hatStyle: "galea", cloak: "#7a6c5e" };

// Supporting cast.
export const ASTRID: PuppetLook = { skin: "#eebf9c", hair: "#5b3a26", long: true, outfit: "#9a4a34", skirt: true, kerchief: "#e6dcc4", belt: "#684733" };
export const LIV: PuppetLook = { skin: "#f2c6a2", hair: "#c9a052", outfit: "#6f8193", tunic: true, belt: "#684733", tied: true, pants: "#4a3a2c", shoes: "#684733" };
export const DARO: PuppetLook = { skin: "#d9a27c", hair: "#2a1e16", outfit: "#c47c62", tunic: true, build: "broad", belt: "#674A36", shoes: "#674A36", stubble: "#2a1e16" };
export const OFFICER: PuppetLook = { skin: "#e0ad88", hair: "#8d8881", beard: "#8d8881", outfit: "#8a3a30", tunic: true, mail: "#9aa5a8", belt: "#4a3424", shoes: "#4a3424", cloak: "#5a4c40" };

export const PALETTE = {
  bjorn: [
    ["Tunic", "#596647"],
    ["Hair", "#B8783E"],
    ["Beard", "#8f4f30"],
    ["Beard shadow", "#70442E"],
    ["Linen", LINEN],
    ["Leather", "#684733"],
    ["Ink", "#302C25"],
  ],
  felix: [
    ["Tunic", "#A85543"],
    ["Shield", "#813F38"],
    ["Linen", "#DDD0AC"],
    ["Metal", "#8A9698"],
    ["Metal shadow", "#4D5B64"],
    ["Leather", "#674A36"],
    ["Hair / ink", "#292D34"],
  ],
} as const;
