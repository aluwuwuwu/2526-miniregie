// EnrichmentPoller — polls at a fixed interval until companion content appears.
//
// onTick     — called on each interval, returns true if enrichment happened (stops).
// onScheduled — called each time a new check is programmed (initial + reschedule),
//              with the absolute timestamp of the upcoming check.

export class EnrichmentPoller {
  private readonly intervalMs:   number;
  private readonly onTick:       () => boolean;
  private readonly onScheduled:  ((checkAt: number) => void) | undefined;
  private timer:   ReturnType<typeof setTimeout> | undefined;
  private checkAt: number | undefined;

  constructor(intervalMs: number, onTick: () => boolean, onScheduled?: (checkAt: number) => void) {
    this.intervalMs  = intervalMs;
    this.onTick      = onTick;
    this.onScheduled = onScheduled;
  }

  schedule(): void {
    this.cancel();
    this.checkAt = Date.now() + this.intervalMs;
    this.timer = setTimeout(() => {
      this.timer   = undefined;
      this.checkAt = undefined;
      const enriched = this.onTick();
      if (!enriched) this.schedule();
    }, this.intervalMs);
    this.onScheduled?.(this.checkAt);
  }

  cancel(): void {
    if (this.timer !== undefined) {
      clearTimeout(this.timer);
      this.timer   = undefined;
      this.checkAt = undefined;
    }
  }

  getCheckAt(): number | undefined {
    return this.checkAt;
  }
}
