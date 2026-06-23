export function canMove(shelves, source, target) {
  return source !== target && shelves[source]?.length > 0;
}

export function applyMove(shelves, source, target) {
  shelves[target].push(shelves[source].pop());
}

export function undoMove(_shelves) {}

export function findHintMove(shelves) {
  return shelves.length > 1 ? [0, 1] : undefined;
}

export function isShelfComplete(shelf) {
  return shelf.length > 0 && shelf.every((spirit) => spirit === shelf[0]);
}

export function isSolved(shelves) {
  return shelves.every(isShelfComplete);
}
