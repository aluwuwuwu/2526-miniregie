import type { MediaItem } from '@shared/types';

export const TYPE_COLOR: Record<string, string> = {
  photo:     'var(--accent)',
  gif:       '#a855f7',
  note:      'var(--warning)',
  clip:      'var(--ready)',
  ticker:    'var(--accent-dim)',
  youtube:   'var(--live)',
  link:      'var(--text-muted)',
  interview: '#06b6d4',
};

export const TYPE_LABEL: Record<string, string> = {
  photo:     'photo',
  gif:       'gif',
  note:      'note',
  clip:      'clip',
  ticker:    'ticker',
  youtube:   'yt',
  link:      'link',
  interview: 'intv',
};

export const LAYOUT_LABEL: Record<string, string> = {
  IDLE:                          'idle',
  MEDIA_FULL:                    'media full',
  MEDIA_WITH_VISUAL:             'media + visual',
  MEDIA_WITH_CAPTION:            'media + note',
  MEDIA_VIS_CAP:                 'media + visual + note',
  VISUAL_FULL:                   'visual full',
  VISUAL_WITH_CAPTION:           'visual + note',
  NOTE_CARD:                     'note card',
  DUAL_VISUAL:                   'dual visual',
};

export function itemLabel(item: MediaItem, maxLen = 80): string {
  const c = item.content as Record<string, unknown>;
  if (typeof c.text    === 'string') return c.text.slice(0, maxLen);
  if (typeof c.title   === 'string') return c.title.slice(0, maxLen);
  if (typeof c.caption === 'string' && c.caption) return c.caption.slice(0, maxLen);
  return '—';
}
