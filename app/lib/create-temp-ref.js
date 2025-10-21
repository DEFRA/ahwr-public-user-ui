import { randomInt } from "node:crypto";
import { Profanity } from "@2toad/profanity";

const profanity = new Profanity({ wholeWord: false });

const containsSwearWord = (input) => {
  return profanity.exists(input);
};

export const createTempReference = ({ referenceForClaim } = { referenceForClaim: false }) => {
  const charset = "ABCDEFGHIJKLMNPQRSTUVWXYZ123456789";
  const id = Array.from({ length: 8 }, () => charset.charAt(randomInt(0, charset.length))).join("");
  const firstFour = id.slice(0, 4);
  const secondFour = id.slice(4);

  if (
    containsSwearWord(`${firstFour}${secondFour}`) ||
    containsSwearWord(`${secondFour}${firstFour}`)
  ) {
    return createTempReference({ referenceForClaim });
  }

  if (referenceForClaim) {
    return `TEMP-CLAIM-${firstFour}-${secondFour}`;
  }

  return `TEMP-${firstFour}-${secondFour}`;
};
