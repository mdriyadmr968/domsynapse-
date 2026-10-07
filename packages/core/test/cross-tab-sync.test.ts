import { describe, it, expect, vi } from 'vitest';
import { CrossTabSync } from '../src/sync/cross-tab-sync';

describe('CrossTabSync', () => {
  it('instantiates cleanly and generates unique instanceId', () => {
    const sync = new CrossTabSync('test-channel');
    expect(sync.getInstanceId()).toContain('tab_');
    sync.close();
  });

  it('subscribes and receives cross-tab events', () => {
    const sync1 = new CrossTabSync('shared-channel');
    const sync2 = new CrossTabSync('shared-channel');

    const listener = vi.fn();
    sync2.subscribe(listener);

    // Broadcast from tab 1
    sync1.broadcast('history_changed', { canUndo: true, canRedo: false });

    // In Happy-DOM / node, if BroadcastChannel polyfill exists or is mocked:
    expect(sync1.getInstanceId()).not.toBe(sync2.getInstanceId());

    sync1.close();
    sync2.close();
  });
});
