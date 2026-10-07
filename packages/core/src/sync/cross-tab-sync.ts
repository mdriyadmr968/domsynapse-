import { DomSynapseAction, ActionResult } from '../types';

export type CrossTabEventType =
  | 'action_executed'
  | 'history_changed'
  | 'spotlight_triggered'
  | 'spotlight_dismissed';

export interface CrossTabEvent {
  type: CrossTabEventType;
  senderId: string;
  timestamp: number;
  payload?: {
    action?: DomSynapseAction;
    result?: ActionResult;
    canUndo?: boolean;
    canRedo?: boolean;
    selector?: string;
    message?: string;
  };
}

export type CrossTabListener = (event: CrossTabEvent) => void;

export class CrossTabSync {
  private channelName: string;
  private channel: BroadcastChannel | null = null;
  private listeners: Set<CrossTabListener> = new Set();
  private instanceId: string;
  private isSupported: boolean;

  constructor(channelName = 'domsynapse_sync_channel') {
    this.channelName = channelName;
    this.instanceId = `tab_${Math.random().toString(36).substring(2, 9)}_${Date.now()}`;
    this.isSupported = typeof BroadcastChannel !== 'undefined';

    if (this.isSupported) {
      try {
        this.channel = new BroadcastChannel(this.channelName);
        this.channel.onmessage = (ev: MessageEvent<CrossTabEvent>) => {
          if (ev.data && ev.data.senderId !== this.instanceId) {
            this.notifyListeners(ev.data);
          }
        };
      } catch {
        this.channel = null;
      }
    }
  }

  /**
   * Broadcasts an event to all other tabs
   */
  public broadcast(type: CrossTabEventType, payload?: CrossTabEvent['payload']): void {
    const event: CrossTabEvent = {
      type,
      senderId: this.instanceId,
      timestamp: Date.now(),
      payload,
    };

    if (this.channel) {
      try {
        this.channel.postMessage(event);
      } catch (err) {
        console.warn('[DomSynapse] BroadcastChannel error:', err);
      }
    }
  }

  /**
   * Subscribes to cross-tab events from other tabs
   */
  public subscribe(listener: CrossTabListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Cleans up channel and listeners
   */
  public close(): void {
    this.listeners.clear();
    if (this.channel) {
      this.channel.close();
      this.channel = null;
    }
  }

  public getInstanceId(): string {
    return this.instanceId;
  }

  private notifyListeners(event: CrossTabEvent): void {
    this.listeners.forEach((listener) => {
      try {
        listener(event);
      } catch (err) {
        console.error('[DomSynapse] Error in CrossTabSync listener:', err);
      }
    });
  }
}
