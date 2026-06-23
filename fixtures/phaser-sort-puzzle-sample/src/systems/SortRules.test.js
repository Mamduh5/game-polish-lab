import { canMove, isShelfComplete, isSolved } from "./SortRules.js";

if (!canMove([["leaf"], []], 0, 1)) {
  throw new Error("expected legal move");
}
if (!isShelfComplete(["moon", "moon"])) {
  throw new Error("expected completed shelf");
}
if (!isSolved([["sun"], ["moon"]])) {
  throw new Error("expected solved shelves");
}
