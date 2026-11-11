import { PuppetLook } from "../../engine";

// The cast of "cabin-pressure" (plan.json). Puppet ids must be these names: barry and sofia are speakers in
// lines.json, so their mouths sync only when the placement id is "barry" / "sofia". Every woman has long hair.
export const BARRY: PuppetLook = { skin: "#f0c49a", hair: "#b8742f", outfit: "#3aa6a0" }; // teal sweater (a warm one merged with his skin under the grade), ginger hair
export const ROSE: PuppetLook = { skin: "#f1c9a8", hair: "#d8d8dc", outfit: "#a98bc9", glasses: true, long: true }; // grandma, lilac cardigan
export const MIA: PuppetLook = { skin: "#c98b5e", hair: "#2a1a12", outfit: "#ef7fae", long: true }; // kid, pink hoodie
export const SOFIA: PuppetLook = { skin: "#d9a37a", hair: "#15110f", outfit: "#1d2a4a", lanyard: "#c0392b", long: true }; // flight attendant, red uniform scarf (a kerchief would sit on her head)
export const CAPTAIN: PuppetLook = { skin: "#e8b48a", hair: "#9a9a9a", outfit: "#f2f2ee", vest: "#1d2a4a", beard: "#9a9a9a" };
export const FIRST_OFFICER: PuppetLook = { skin: "#8d5b3c", hair: "#1a1412", outfit: "#f2f2ee", vest: "#1d2a4a" };
// Extras for the rows behind (crop: true on their placements so keepHeads does not pull the camera back).
export const EXTRAS: PuppetLook[] = [
  { skin: "#e8b48a", hair: "#4a2e1c", outfit: "#d0563c" },
  { skin: "#c98b5e", hair: "#1c1410", outfit: "#3f8f6a", long: true },
  { skin: "#8d5b3c", hair: "#1a1412", outfit: "#7a63b8", glasses: true },
  { skin: "#e9b98f", hair: "#6a3a1e", outfit: "#2e7fb8" },
  { skin: "#d49a72", hair: "#2a1a12", outfit: "#e07a5f", long: true },
  { skin: "#f0c8a4", hair: "#8a8a8a", outfit: "#5a6e3a" },
];

// Where the cast sits in CabinSet, the same in every cabin shot: side -1 left / +1 right of the aisle, k 0 aisle ..
// 2 window, r row (rowZ(r)). Place with at: [seatX(side, k), rowZ(r) + SEAT_IN] from cabin.tsx.
export const SEATING = {
  barry: { side: 1, k: 0, r: 1 }, // right aisle seat, row 1
  mia: { side: -1, k: 0, r: 1 }, // left aisle seat, row 1, across the aisle from Barry
  rose: { side: -1, k: 1, r: 1 }, // next to Mia, middle seat
  windowLeft: { side: -1, k: 2, r: 1 }, // the passenger Rose also helps (an extra)
} as const;
