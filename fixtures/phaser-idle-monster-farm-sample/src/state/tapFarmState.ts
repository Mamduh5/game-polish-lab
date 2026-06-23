export interface TapFarmState {
  energy: number;
}
export const tapFarmState: TapFarmState = { energy: 40 };
export function getTapFarmRewardAmount(_state: TapFarmState): number {
  return 5;
}
