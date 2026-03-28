import type { MediaItem, MediaContent, LayoutName } from "@shared/types";

export type { LayoutName };

type Item = Pick<MediaItem, 'type' | 'content'>;

export function resolveLayout(activeItems: Item[]): LayoutName {
  return 'IDLE';
}
