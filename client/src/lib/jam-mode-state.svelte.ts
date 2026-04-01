// Jam-mode app state — owns slot timing metadata emitted by the server.
// Populated by server-state.svelte.ts when the 'jam-mode:layout' event fires.

export interface SlotTimerMeta {
	startedAt:  number;
	durationMs: number;
}

export interface JamSlotTimings {
	loud?:   SlotTimerMeta;
	visual?: SlotTimerMeta;
	note?:   SlotTimerMeta;
}

export interface EnrichState {
	checkAt:    number;
	intervalMs: number;
}

export const jamModeState = $state<{ slotTimings: JamSlotTimings; enrich: EnrichState | null }>({
	slotTimings: {},
	enrich:      null,
});

// Set to true on first user click (autoplay gate). YouTube iframes must not
// load their src before this, otherwise Chrome blocks autoplay.
export const broadcastUnlocked = $state({ value: false });