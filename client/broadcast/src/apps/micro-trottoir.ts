import type { BroadcastApp } from '../types.js';
import type { GlobalState, MediaItem, InterviewContent, InterviewSegment, InterviewSubject } from '@shared/types';
import type { Socket } from 'socket.io-client';

const INTRO_DURATION = 4_000;
const QUESTION_DURATION = 3_000;
const TEXT_ANSWER_DURATION = 8_000;
const PHOTO_DURATION = 5_000;
const OUTRO_DURATION = 3_000;

export function createMicroTrottoir(): BroadcastApp {
  let mounted = false;
  let container: HTMLElement | null = null;

  const timers = new Set<ReturnType<typeof setTimeout>>();

  function safeTimeout(fn: () => void, delay: number): ReturnType<typeof setTimeout> {
    const id = setTimeout(() => {
      timers.delete(id);
      fn();
    }, delay);
    timers.add(id);
    return id;
  }

  function clearAllTimers(): void {
    for (const id of timers) clearTimeout(id);
    timers.clear();
  }

  function setContent(html: string): void {
    if (!container) return;
    container.innerHTML = html;
  }

  function getInterviewItems(snapshot: MediaItem[]): MediaItem[] {
    // Client-side filtering: take interview items that are ready
    return snapshot
      .filter(i => i.type === 'interview' && i.status === 'ready')
      .sort((a, b) => a.submittedAt - b.submittedAt);
  }

  function renderIntro(): Promise<void> {
    return new Promise(resolve => {
      if (!mounted) { resolve(); return; }
      setContent(`
        <div class="micro-trottoir micro-trottoir--intro">
          <p class="micro-trottoir__intro-label">MICRO-TROTTOIR</p>
          <p class="micro-trottoir__intro-sub">Dans les coulisses de la JAM</p>
        </div>
      `);
      safeTimeout(resolve, INTRO_DURATION);
    });
  }

  function renderOutro(): Promise<void> {
    return new Promise(resolve => {
      if (!mounted) { resolve(); return; }
      setContent(`
        <div class="micro-trottoir micro-trottoir--outro">
          <p class="micro-trottoir__outro-label">Retour en régie</p>
        </div>
      `);
      safeTimeout(resolve, OUTRO_DURATION);
    });
  }

  function renderQuestion(text: string): Promise<void> {
    return new Promise(resolve => {
      if (!mounted) { resolve(); return; }
      setContent(`
        <div class="micro-trottoir micro-trottoir--question">
          <p class="micro-trottoir__question-text">${escapeHtml(text)}</p>
        </div>
      `);
      safeTimeout(resolve, QUESTION_DURATION);
    });
  }

  function renderVideoAnswer(
    videoUrl: string,
    durationMs: number,
    subject: InterviewSubject
  ): Promise<void> {
    return new Promise(resolve => {
      if (!mounted) { resolve(); return; }
      const bandeau = renderBandeau(subject);
      setContent(`
        <div class="micro-trottoir micro-trottoir--answer">
          <video class="micro-trottoir__video" autoplay muted playsinline>
            <source src="${escapeHtml(videoUrl)}">
          </video>
          ${bandeau}
        </div>
      `);
      safeTimeout(resolve, Math.max(durationMs, 3_000));
    });
  }

  function renderTextAnswer(text: string, subject: InterviewSubject): Promise<void> {
    return new Promise(resolve => {
      if (!mounted) { resolve(); return; }
      const bandeau = renderBandeau(subject);
      setContent(`
        <div class="micro-trottoir micro-trottoir--answer micro-trottoir--text">
          <p class="micro-trottoir__answer-text">${escapeHtml(text)}</p>
          ${bandeau}
        </div>
      `);
      safeTimeout(resolve, TEXT_ANSWER_DURATION);
    });
  }

  function renderPhoto(photoUrl: string, subject: InterviewSubject): Promise<void> {
    return new Promise(resolve => {
      if (!mounted) { resolve(); return; }
      const bandeau = renderBandeau(subject);
      setContent(`
        <div class="micro-trottoir micro-trottoir--photo">
          <img class="micro-trottoir__photo-img" src="${escapeHtml(photoUrl)}" alt="">
          ${bandeau}
        </div>
      `);
      safeTimeout(resolve, PHOTO_DURATION);
    });
  }

  function renderBandeau(subject: InterviewSubject): string {
    if (!subject.displayName) return '';
    const name = escapeHtml(subject.displayName);
    const role = subject.role ? ` · ${escapeHtml(subject.role)}` : '';
    const team = subject.team ? escapeHtml(subject.team) : '';
    return `
      <div class="micro-trottoir__bandeau">
        <span class="micro-trottoir__bandeau-name">${name}</span>
        <span class="micro-trottoir__bandeau-meta">${team}${role}</span>
      </div>
    `;
  }

  function escapeHtml(s: string): string {
    return s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  async function playSegment(segment: InterviewSegment, subject: InterviewSubject): Promise<void> {
    if (!mounted) return;

    await renderQuestion(segment.question);
    if (!mounted) return;

    if (segment.video !== null && segment.duration !== null) {
      await renderVideoAnswer(segment.video, segment.duration * 1_000, subject);
    } else if (segment.textOnly !== null) {
      await renderTextAnswer(segment.textOnly, subject);
    }

    if (!mounted) return;

    for (const photo of segment.photos) {
      if (!mounted) return;
      await renderPhoto(photo, subject);
    }
  }

  async function playInterview(item: MediaItem, socket: Socket): Promise<void> {
    if (!mounted) return;
    const content = item.content as InterviewContent;

    for (const segment of content.segments) {
      if (!mounted) return;
      await playSegment(segment, content.subject);
    }

    // Mark as displayed after full playback
    socket.emit('pool:mark', { itemId: item.id, event: 'displayed' });
  }

  async function runSequence(items: MediaItem[], sock: Socket): Promise<void> {
    if (!mounted) return;

    if (items.length === 0) {
      // Degrade: signal ready and let BroadcastManager handle the transition
      sock.emit('broadcast:transition:complete');
      return;
    }

    await renderIntro();
    if (!mounted) return;

    for (const item of items) {
      if (!mounted) return;
      await playInterview(item, sock);
    }

    if (!mounted) return;
    await renderOutro();

    if (mounted) {
      sock.emit('broadcast:transition:complete');
    }
  }

  return {
    mount(cont: HTMLElement, state: GlobalState, sock: Socket): void {
      mounted = true;
      container = cont;
      container.className = 'app app--micro-trottoir';

      const items = getInterviewItems(state.pool.queueSnapshot);
      // Run async but guard with mounted flag throughout
      runSequence(items, sock).catch(() => {
        // If sequence throws, signal transition complete to avoid blocking the scheduler
        if (mounted) sock.emit('broadcast:transition:complete');
      });
    },

    unmount(): void {
      mounted = false;
      clearAllTimers();
      container = null;
    },
  };
}