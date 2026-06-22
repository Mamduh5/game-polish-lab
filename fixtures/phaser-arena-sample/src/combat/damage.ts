import { Enemy } from "../enemies/Enemy";

export function applyDamage(enemy: Enemy, amount: number): void {
  enemy.hp -= amount;
}
