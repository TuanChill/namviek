type EventCallback = (event: string, data: any) => void;

export class PubSub {
  // Map of databaseId to a Set of callback functions
  private subscribers: Map<string, Set<EventCallback>> = new Map();

  subscribe(databaseId: string, callback: EventCallback) {
    if (!this.subscribers.has(databaseId)) {
      this.subscribers.set(databaseId, new Set());
    }
    this.subscribers.get(databaseId)!.add(callback);

    // Return an unsubscribe function
    return () => {
      const dbSubs = this.subscribers.get(databaseId);
      if (dbSubs) {
        dbSubs.delete(callback);
        if (dbSubs.size === 0) {
          this.subscribers.delete(databaseId);
        }
      }
    };
  }

  publish(databaseId: string, event: string, data: any) {
    const dbSubs = this.subscribers.get(databaseId);
    if (dbSubs) {
      dbSubs.forEach((callback) => {
        try {
          callback(event, data);
        } catch (error) {
          console.error(`Error in PubSub callback for event ${event}:`, error);
        }
      });
    }
  }
}

// Global singleton instance
export const dbEvents = new PubSub();
