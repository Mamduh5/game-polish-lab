import { SPIRIT_SORT_LEVELS } from "../data/spiritSortLevels.js";
import { canMove, applyMove, undoMove, findHintMove, isShelfComplete, isSolved } from "../systems/SortRules.js";
import { ProgressSave } from "../systems/ProgressSave.js";
import { SpiritAssetLoader } from "../systems/SpiritAssetLoader.js";

export class SpiritSortScene extends Phaser.Scene {
  selectedShelfIndex = -1;
  blessedShelves = new Set();

  preload() {
    SpiritAssetLoader.load(this);
  }

  create() {
    this.level = SPIRIT_SORT_LEVELS[0];
    this.shelves = this.level.shelves.map((shelf) => [...shelf]);
    this.add.text(12, 12, "win message");
    this.renderShelves();
  }

  onShelfTap(targetShelfIndex) {
    if (this.selectedShelfIndex < 0) {
      this.selectedShelfIndex = targetShelfIndex;
      this.showSelectedShelfHighlight(targetShelfIndex);
      return;
    }
    if (canMove(this.shelves, this.selectedShelfIndex, targetShelfIndex)) {
      applyMove(this.shelves, this.selectedShelfIndex, targetShelfIndex);
      this.animateSpiritBounce(this.selectedShelfIndex, targetShelfIndex);
      if (isShelfComplete(this.shelves[targetShelfIndex])) {
        this.showCompletedShelfGlow(targetShelfIndex);
      }
      if (isSolved(this.shelves)) {
        ProgressSave.writeProgress({ solved: true });
      }
    } else {
      this.showInvalidMoveShake(targetShelfIndex);
    }
    this.selectedShelfIndex = -1;
  }

  renderShelves() {}
  showSelectedShelfHighlight(_shelf) {}
  animateSpiritBounce(_source, _target) {}
  showCompletedShelfGlow(_shelf) {}
  showInvalidMoveShake(_shelf) {}
  undoLastMove() { undoMove(this.shelves); }
  showHint() { findHintMove(this.shelves); }
}
