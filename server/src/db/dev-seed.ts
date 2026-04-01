/**
 * Dev seed data — exported as a callable function for use from both
 * the CLI seed script and the admin /jam/reset route.
 */

import { randomUUID } from 'node:crypto';
import { db } from './index.js';
import { participants, mediaItems } from './schema.js';

export const SEED_MARKER = 'seed:dev';

// Aspect ratio constants used in seed content
const AR_16_9    = 16 / 9;   // 1.778 — standard landscape (YouTube, most clips)
const AR_9_16    = 9  / 16;  // 0.5625 — portrait / vertical (phone photo, TikTok-style clip)
const AR_4_3     = 4  / 3;   // 1.333 — classic TV / older photos
const AR_1_1     = 1.0;       // square (Instagram-style)
const AR_21_9    = 21 / 9;   // 2.333 — ultra-wide / panoramic
const AR_3_4     = 3  / 4;   // 0.75 — portrait near the threshold

export function applyDevSeed(): void {
  const now = Date.now();

  const fakeParticipants: Array<typeof participants.$inferInsert> = [
    {
      id:          randomUUID(),
      username:    'alice_photo',
      displayName: 'Alice Marchand',
      team:        'Équipe Rouge',
      role:        SEED_MARKER,
      firstSeenAt: now - 1000 * 60 * 30,
      lastSeenAt:  now - 1000 * 60 * 5,
    },
    {
      id:          randomUUID(),
      username:    'bob_video',
      displayName: 'Bob Lejeune',
      team:        'Équipe Bleue',
      role:        SEED_MARKER,
      firstSeenAt: now - 1000 * 60 * 45,
      lastSeenAt:  now - 1000 * 60 * 2,
    },
    {
      id:          randomUUID(),
      username:    'carla_note',
      displayName: 'Carla Dupont',
      team:        'Équipe Verte',
      role:        SEED_MARKER,
      firstSeenAt: now - 1000 * 60 * 20,
      lastSeenAt:  now - 1000 * 60 * 1,
    },
    {
      id:          randomUUID(),
      username:    'david_yt',
      displayName: 'David Renard',
      team:        'Équipe Rouge',
      role:        SEED_MARKER,
      firstSeenAt: now - 1000 * 60 * 60,
      lastSeenAt:  now,
    },
    {
      id:          randomUUID(),
      username:    'emma_cam',
      displayName: 'Emma Fontaine',
      team:        'Équipe Jaune',
      role:        SEED_MARKER,
      firstSeenAt: now - 1000 * 60 * 90,
      lastSeenAt:  now - 1000 * 60 * 8,
    },
    {
      id:          randomUUID(),
      username:    'felix_mix',
      displayName: 'Félix Beaumont',
      team:        'Équipe Bleue',
      role:        SEED_MARKER,
      firstSeenAt: now - 1000 * 60 * 55,
      lastSeenAt:  now - 1000 * 60 * 3,
    },
    {
      id:          randomUUID(),
      username:    'grace_edit',
      displayName: 'Grace Willems',
      team:        'Équipe Verte',
      role:        SEED_MARKER,
      firstSeenAt: now - 1000 * 60 * 110,
      lastSeenAt:  now - 1000 * 60 * 12,
    },
    {
      id:          randomUUID(),
      username:    'hugo_son',
      displayName: 'Hugo Claes',
      team:        'Équipe Jaune',
      role:        SEED_MARKER,
      firstSeenAt: now - 1000 * 60 * 70,
      lastSeenAt:  now - 1000 * 60 * 20,
    },
  ];

  for (const p of fakeParticipants) {
    db.insert(participants).values(p).run();
  }

  function pid(username: string): string {
    return fakeParticipants.find(p => p.username === username)!.id as string;
  }

  type ItemInsert = typeof mediaItems.$inferInsert;

  const fakeItems: ItemInsert[] = [
    // ── Notes ────────────────────────────────────────────────────────────────
    {
      id:          randomUUID(),
      type:        'note',
      content:     { text: 'Pensez à boire de l\'eau, c\'est une longue nuit !' },
      status:      'ready',
      submittedAt: now - 1000 * 60 * 25,
      authorId:    pid('carla_note'),
    },
    {
      id:          randomUUID(),
      type:        'note',
      content:     { text: 'Le making-of de la scène 3 est absolument incroyable, vous allez halluciner.' },
      status:      'ready',
      submittedAt: now - 1000 * 60 * 12,
      authorId:    pid('carla_note'),
    },
    {
      id:          randomUUID(),
      type:        'note',
      content:     { text: 'Équipe Verte en tête du classement ! On lâche rien jusqu\'à l\'aube.' },
      status:      'ready',
      submittedAt: now - 1000 * 60 * 3,
      authorId:    pid('alice_photo'),
    },
    {
      id:          randomUUID(),
      type:        'note',
      content:     { text: 'Scène de l\'ascenseur CONFIRMÉE. C\'était encore mieux que prévu.' },
      status:      'ready',
      submittedAt: now - 1000 * 60 * 48,
      authorId:    pid('felix_mix'),
    },
    {
      id:          randomUUID(),
      type:        'note',
      content:     { text: 'Merci à la cantine de la HELB pour les sandwichs de minuit, vous sauvez des vies.' },
      status:      'ready',
      submittedAt: now - 1000 * 60 * 37,
      authorId:    pid('grace_edit'),
    },
    {
      id:          randomUUID(),
      type:        'note',
      content:     { text: 'Attention : le couloir du 3e est fermé pour tournage jusqu\'à 4h.' },
      status:      'ready',
      submittedAt: now - 1000 * 60 * 19,
      authorId:    pid('hugo_son'),
    },
    {
      id:          randomUUID(),
      type:        'note',
      content:     { text: 'Qui a le câble XLR ? On en a besoin d\'urgence en salle 204.' },
      status:      'ready',
      submittedAt: now - 1000 * 60 * 7,
      authorId:    pid('bob_video'),
    },
    {
      id:          randomUUID(),
      type:        'note',
      content:     { text: '17h de tournage au compteur. Équipe Jaune toujours debout, chapeau.' },
      status:      'ready',
      submittedAt: now - 1000 * 60 * 2,
      authorId:    pid('emma_cam'),
    },

    // ── Photos — landscape 16:9 ───────────────────────────────────────────────
    // picsum dimensions control the actual AR → we set it explicitly
    {
      id:          randomUUID(),
      type:        'photo',
      content:     { url: 'https://picsum.photos/seed/jam-land-1/1280/720', aspectRatio: AR_16_9, caption: 'Ambiance plateau — 2h du matin' },
      status:      'ready',
      submittedAt: now - 1000 * 60 * 28,
      authorId:    pid('alice_photo'),
    },
    {
      id:          randomUUID(),
      type:        'photo',
      content:     { url: 'https://picsum.photos/seed/jam-land-2/1280/720', aspectRatio: AR_16_9, caption: null },
      status:      'ready',
      submittedAt: now - 1000 * 60 * 18,
      authorId:    pid('bob_video'),
    },
    {
      id:          randomUUID(),
      type:        'photo',
      content:     { url: 'https://picsum.photos/seed/jam-land-3/1280/720', aspectRatio: AR_16_9, caption: 'Équipe Rouge en plein tournage' },
      status:      'ready',
      submittedAt: now - 1000 * 60 * 8,
      authorId:    pid('alice_photo'),
    },
    {
      id:          randomUUID(),
      type:        'photo',
      content:     { url: 'https://picsum.photos/seed/jam-land-4/1280/720', aspectRatio: AR_16_9, caption: 'Répétition de la scène finale' },
      status:      'ready',
      submittedAt: now - 1000 * 60 * 52,
      authorId:    pid('emma_cam'),
    },

    // ── Photos — classic 4:3 ─────────────────────────────────────────────────
    {
      id:          randomUUID(),
      type:        'photo',
      content:     { url: 'https://picsum.photos/seed/jam-43-1/1024/768', aspectRatio: AR_4_3, caption: 'Régie son — Félix aux commandes' },
      status:      'ready',
      submittedAt: now - 1000 * 60 * 33,
      authorId:    pid('felix_mix'),
    },
    {
      id:          randomUUID(),
      type:        'photo',
      content:     { url: 'https://picsum.photos/seed/jam-43-2/1024/768', aspectRatio: AR_4_3, caption: null },
      status:      'ready',
      submittedAt: now - 1000 * 60 * 6,
      authorId:    pid('alice_photo'),
    },

    // ── Photos — portrait 9:16 (phone shots, selfies) ─────────────────────────
    // These trigger PORTRAIT_FULL / PORTRAIT_DUO / PORTRAIT_WITH_NOTE
    {
      id:          randomUUID(),
      type:        'photo',
      content:     { url: 'https://picsum.photos/seed/jam-port-1/720/1280', aspectRatio: AR_9_16, caption: 'Selfie équipe — avant la grande scène' },
      status:      'ready',
      submittedAt: now - 1000 * 60 * 44,
      authorId:    pid('grace_edit'),
    },
    {
      id:          randomUUID(),
      type:        'photo',
      content:     { url: 'https://picsum.photos/seed/jam-port-2/720/1280', aspectRatio: AR_9_16, caption: null },
      status:      'ready',
      submittedAt: now - 1000 * 60 * 22,
      authorId:    pid('hugo_son'),
    },
    {
      id:          randomUUID(),
      type:        'photo',
      content:     { url: 'https://picsum.photos/seed/jam-port-3/720/1280', aspectRatio: AR_9_16, caption: 'Coulisses — Équipe Jaune' },
      status:      'ready',
      submittedAt: now - 1000 * 60 * 11,
      authorId:    pid('emma_cam'),
    },
    {
      id:          randomUUID(),
      type:        'photo',
      content:     { url: 'https://picsum.photos/seed/jam-port-4/720/1280', aspectRatio: AR_3_4, caption: 'Portrait — Alice derrière la caméra' },
      status:      'ready',
      submittedAt: now - 1000 * 60 * 57,
      authorId:    pid('alice_photo'),
    },

    // ── Photos — square (Instagram-style) ────────────────────────────────────
    {
      id:          randomUUID(),
      type:        'photo',
      content:     { url: 'https://picsum.photos/seed/jam-sq-1/800/800', aspectRatio: AR_1_1, caption: 'Logo équipe Bleue' },
      status:      'ready',
      submittedAt: now - 1000 * 60 * 39,
      authorId:    pid('bob_video'),
    },
    {
      id:          randomUUID(),
      type:        'photo',
      content:     { url: 'https://picsum.photos/seed/jam-sq-2/800/800', aspectRatio: AR_1_1, caption: null },
      status:      'ready',
      submittedAt: now - 1000 * 60 * 16,
      authorId:    pid('carla_note'),
    },

    // ── Photos — wide / panoramic (21:9) ─────────────────────────────────────
    // These trigger WIDE_VISUAL / WIDE_VISUAL_WITH_NOTE
    {
      id:          randomUUID(),
      type:        'photo',
      content:     { url: 'https://picsum.photos/seed/jam-wide-1/2100/900', aspectRatio: AR_21_9, caption: 'Vue panoramique du plateau principal' },
      status:      'ready',
      submittedAt: now - 1000 * 60 * 62,
      authorId:    pid('alice_photo'),
    },
    {
      id:          randomUUID(),
      type:        'photo',
      content:     { url: 'https://picsum.photos/seed/jam-wide-2/2100/900', aspectRatio: AR_21_9, caption: null },
      status:      'ready',
      submittedAt: now - 1000 * 60 * 29,
      authorId:    pid('grace_edit'),
    },

    // ── Giphy GIFs ────────────────────────────────────────────────────────────
    // Real Giphy IDs — fetched via GIPHY_API_KEY in production.
    // In dev the resolve pipeline is bypassed; content is inserted directly.
    {
      id:          randomUUID(),
      type:        'giphy',
      // "This is fine" dog — landscape 16:9 (480×270)
      content:     {
        giphyId:     'QMHoU66sBXqqLqYvGO',
        url:         'https://media.giphy.com/media/QMHoU66sBXqqLqYvGO/giphy.gif',
        mp4Url:      'https://media.giphy.com/media/QMHoU66sBXqqLqYvGO/giphy.mp4',
        title:       'This is fine',
        aspectRatio: AR_16_9,
        caption:     'Ambiance 48h',
      },
      status:      'ready',
      submittedAt: now - 1000 * 60 * 43,
      authorId:    pid('hugo_son'),
    },
    {
      id:          randomUUID(),
      type:        'giphy',
      // Vertical phone reaction GIF — portrait 9:16 (270×480)
      content:     {
        giphyId:     'l0HlNQ03J5JxX6lva',
        url:         'https://media.giphy.com/media/l0HlNQ03J5JxX6lva/giphy.gif',
        mp4Url:      'https://media.giphy.com/media/l0HlNQ03J5JxX6lva/giphy.mp4',
        title:       'Reaction',
        aspectRatio: AR_9_16,
        caption:     null,
      },
      status:      'ready',
      submittedAt: now - 1000 * 60 * 26,
      authorId:    pid('bob_video'),
    },
    {
      id:          randomUUID(),
      type:        'giphy',
      // Applause — square (480×480)
      content:     {
        giphyId:     '3o7btNhMBytxAM6YBa',
        url:         'https://media.giphy.com/media/3o7btNhMBytxAM6YBa/giphy.gif',
        mp4Url:      'https://media.giphy.com/media/3o7btNhMBytxAM6YBa/giphy.mp4',
        title:       'Applause',
        aspectRatio: AR_1_1,
        caption:     'Bravo l\'équipe !',
      },
      status:      'ready',
      submittedAt: now - 1000 * 60 * 13,
      authorId:    pid('carla_note'),
    },
    {
      id:          randomUUID(),
      type:        'giphy',
      // Mind blown — landscape 16:9 (480×270)
      content:     {
        giphyId:     'xT0xeJpnrWC4XWblEk',
        url:         'https://media.giphy.com/media/xT0xeJpnrWC4XWblEk/giphy.gif',
        mp4Url:      'https://media.giphy.com/media/xT0xeJpnrWC4XWblEk/giphy.mp4',
        title:       'Mind Blown',
        aspectRatio: AR_16_9,
        caption:     'Scène de l\'année',
      },
      status:      'ready',
      submittedAt: now - 1000 * 60 * 31,
      authorId:    pid('alice_photo'),
    },
    {
      id:          randomUUID(),
      type:        'giphy',
      // Typing furiously — landscape 4:3 (480×360)
      content:     {
        giphyId:     'LmNwrBhejkK9EFP504',
        url:         'https://media.giphy.com/media/LmNwrBhejkK9EFP504/giphy.gif',
        mp4Url:      'https://media.giphy.com/media/LmNwrBhejkK9EFP504/giphy.mp4',
        title:       'Typing Furiously',
        aspectRatio: AR_4_3,
        caption:     'Le monteur en pleine action',
      },
      status:      'ready',
      submittedAt: now - 1000 * 60 * 47,
      authorId:    pid('felix_mix'),
    },
    {
      id:          randomUUID(),
      type:        'giphy',
      // We did it! — square (480×480)
      content:     {
        giphyId:     'kyLYXonQYYfwYDIeZl',
        url:         'https://media.giphy.com/media/kyLYXonQYYfwYDIeZl/giphy.gif',
        mp4Url:      'https://media.giphy.com/media/kyLYXonQYYfwYDIeZl/giphy.mp4',
        title:       'We Did It',
        aspectRatio: AR_1_1,
        caption:     null,
      },
      status:      'ready',
      submittedAt: now - 1000 * 60 * 9,
      authorId:    pid('emma_cam'),
    },
    {
      id:          randomUUID(),
      type:        'giphy',
      // Coffee loading — portrait 9:16 (270×480)
      content:     {
        giphyId:     'DrJm6F9poo4aA',
        url:         'https://media.giphy.com/media/DrJm6F9poo4aA/giphy.gif',
        mp4Url:      'https://media.giphy.com/media/DrJm6F9poo4aA/giphy.mp4',
        title:       'Coffee Loading',
        aspectRatio: AR_9_16,
        caption:     'Ravitaillement en caféine',
      },
      status:      'ready',
      submittedAt: now - 1000 * 60 * 66,
      authorId:    pid('hugo_son'),
    },

    // ── Clips ─────────────────────────────────────────────────────────────────
    // Only fake-clip-01, 02, 03 actually exist in /uploads
    {
      id:          randomUUID(),
      type:        'clip',
      // Standard landscape (shot with camera)
      content:     { url: '/uploads/fake-clip-01.mp4', duration: 47_000, mimeType: 'video/mp4', aspectRatio: AR_16_9, caption: 'Teaser scène 1 — Équipe Bleue' },
      status:      'ready',
      submittedAt: now - 1000 * 60 * 40,
      authorId:    pid('bob_video'),
    },
    {
      id:          randomUUID(),
      type:        'clip',
      // Vertical phone video — triggers VERTICAL_MEDIA / VERTICAL_MEDIA_WITH_NOTE
      content:     { url: '/uploads/fake-clip-02.mp4', duration: 28_000, mimeType: 'video/mp4', aspectRatio: AR_9_16, caption: 'Clip vertical — prise de vue téléphone' },
      status:      'ready',
      submittedAt: now - 1000 * 60 * 15,
      authorId:    pid('emma_cam'),
    },
    {
      id:          randomUUID(),
      type:        'clip',
      // Classic 4:3
      content:     { url: '/uploads/fake-clip-03.mp4', duration: 112_000, mimeType: 'video/mp4', aspectRatio: AR_4_3, caption: 'Interview improvisée dans le couloir' },
      status:      'ready',
      submittedAt: now - 1000 * 60 * 58,
      authorId:    pid('grace_edit'),
    },

    // ── YouTube ───────────────────────────────────────────────────────────────
    // All standard 16:9 — aspectRatio is pre-filled as if oEmbed already ran
    {
      id:          randomUUID(),
      type:        'youtube',
      content:     { url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', youtubeId: 'dQw4w9WgXcQ', title: 'Rick Astley — Never Gonna Give You Up', duration: 213_000, thumbnail: 'https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg', aspectRatio: AR_16_9, caption: 'Classique intemporel' },
      status:      'ready',
      submittedAt: now - 1000 * 60 * 35,
      authorId:    pid('david_yt'),
    },
    {
      id:          randomUUID(),
      type:        'youtube',
      content:     { url: 'https://www.youtube.com/watch?v=9bZkp7q19f0', youtubeId: '9bZkp7q19f0', title: 'PSY — Gangnam Style', duration: 252_000, thumbnail: 'https://img.youtube.com/vi/9bZkp7q19f0/maxresdefault.jpg', aspectRatio: AR_16_9, caption: null },
      status:      'ready',
      submittedAt: now - 1000 * 60 * 10,
      authorId:    pid('david_yt'),
    },
    {
      id:          randomUUID(),
      type:        'youtube',
      content:     { url: 'https://www.youtube.com/watch?v=kJQP7kiw5Fk', youtubeId: 'kJQP7kiw5Fk', title: 'Luis Fonsi — Despacito ft. Daddy Yankee', duration: 282_000, thumbnail: 'https://img.youtube.com/vi/kJQP7kiw5Fk/maxresdefault.jpg', aspectRatio: AR_16_9, caption: 'Pour garder l\'énergie à 4h du mat' },
      status:      'ready',
      submittedAt: now - 1000 * 60 * 62,
      authorId:    pid('felix_mix'),
    },
    {
      id:          randomUUID(),
      type:        'youtube',
      content:     { url: 'https://www.youtube.com/watch?v=JGwWNGJdvx8', youtubeId: 'JGwWNGJdvx8', title: 'Ed Sheeran — Shape of You', duration: 234_000, thumbnail: 'https://img.youtube.com/vi/JGwWNGJdvx8/maxresdefault.jpg', aspectRatio: AR_16_9, caption: null },
      status:      'ready',
      submittedAt: now - 1000 * 60 * 41,
      authorId:    pid('emma_cam'),
    },
    {
      id:          randomUUID(),
      type:        'youtube',
      content:     { url: 'https://www.youtube.com/watch?v=OPf0YbXqDm0', youtubeId: 'OPf0YbXqDm0', title: 'Mark Ronson — Uptown Funk ft. Bruno Mars', duration: 270_000, thumbnail: 'https://img.youtube.com/vi/OPf0YbXqDm0/maxresdefault.jpg', aspectRatio: AR_16_9, caption: 'Vibes de fin de nuit' },
      status:      'ready',
      submittedAt: now - 1000 * 60 * 17,
      authorId:    pid('hugo_son'),
    },
    {
      id:          randomUUID(),
      type:        'youtube',
      content:     { url: 'https://www.youtube.com/watch?v=fJ9rUzIMcZQ', youtubeId: 'fJ9rUzIMcZQ', title: 'Queen — Bohemian Rhapsody (Official Video)', duration: 367_000, thumbnail: 'https://img.youtube.com/vi/fJ9rUzIMcZQ/maxresdefault.jpg', aspectRatio: AR_16_9, caption: null },
      status:      'ready',
      submittedAt: now - 1000 * 60 * 53,
      authorId:    pid('david_yt'),
    },
    {
      id:          randomUUID(),
      type:        'youtube',
      content:     { url: 'https://www.youtube.com/watch?v=Zi_XLOBDo_Y', youtubeId: 'Zi_XLOBDo_Y', title: 'Michael Jackson — Billie Jean', duration: 294_000, thumbnail: 'https://img.youtube.com/vi/Zi_XLOBDo_Y/maxresdefault.jpg', aspectRatio: AR_16_9, caption: 'Pour les insomniaques du plateau' },
      status:      'ready',
      submittedAt: now - 1000 * 60 * 71,
      authorId:    pid('felix_mix'),
    },
    {
      id:          randomUUID(),
      type:        'youtube',
      content:     { url: 'https://www.youtube.com/watch?v=sOnqjkJTMaA', youtubeId: 'sOnqjkJTMaA', title: 'Michael Jackson — Thriller', duration: 840_000, thumbnail: 'https://img.youtube.com/vi/sOnqjkJTMaA/maxresdefault.jpg', aspectRatio: AR_16_9, caption: null },
      status:      'ready',
      submittedAt: now - 1000 * 60 * 88,
      authorId:    pid('david_yt'),
    },

    // ── Ticker ────────────────────────────────────────────────────────────────
    {
      id:          randomUUID(),
      type:        'ticker',
      content:     { text: 'Bienvenue à la 48h IAD ! Toutes les équipes sont en lice — suivez l\'action en direct.', label: 'LIVE' },
      status:      'ready',
      submittedAt: now - 1000 * 60 * 60,
      authorId:    'system:admin',
    },
    {
      id:          randomUUID(),
      type:        'ticker',
      content:     { text: 'Rendu final : dimanche à 14h00 en salle A. Ne soyez pas en retard.', label: 'RAPPEL' },
      status:      'ready',
      submittedAt: now - 1000 * 60 * 50,
      authorId:    'system:admin',
    },
    {
      id:          randomUUID(),
      type:        'ticker',
      content:     { text: 'Équipe Rouge · Équipe Bleue · Équipe Verte · Équipe Jaune — qui va l\'emporter ?', label: 'CLASSEMENT' },
      status:      'ready',
      submittedAt: now - 1000 * 60 * 30,
      authorId:    'system:admin',
    },
    {
      id:          randomUUID(),
      type:        'ticker',
      content:     { text: 'Le jury délibère. Résultats annoncés à 15h30 en amphi.', label: 'JURY' },
      status:      'ready',
      submittedAt: now - 1000 * 60 * 5,
      authorId:    'system:admin',
    },
  ];

  for (const item of fakeItems) {
    db.insert(mediaItems).values(item).run();
  }

  console.log(`[dev-seed] Inserted ${fakeParticipants.length} participants and ${fakeItems.length} media items.`);
}