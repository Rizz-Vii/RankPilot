// Minimal self-contained test (no mocha harness required)
import type { EventType } from '../../src/lib/events/event-types';
import type { FirestoreLegacyCollectionRef, FirestoreLegacyDocRef } from '../../src/lib/events/publishEvent';
import { publishEvent } from '../../src/lib/events/publishEvent';
type DocData = Record<string, unknown>;

class InMemoryDocSnapshot {
  private _data: DocData | undefined;
  readonly exists: boolean;
  constructor(data?: DocData) {
    this._data = data;
    this.exists = !!data;
  }
  data(): DocData | undefined {
    return this._data;
  }
}

class InMemoryDocRef implements FirestoreLegacyDocRef {
  private store: Map<string, DocData>;
  readonly path: string;
  constructor(store: Map<string, DocData>, path: string) {
    this.store = store;
    this.path = path;
  }
  async get(): Promise<{ exists: boolean; data(): DocData | undefined }> {
    const data = this.store.get(this.path);
    return new InMemoryDocSnapshot(data);
  }
  async create(data: DocData): Promise<void> {
    if (this.store.has(this.path)) throw new Error('already exists');
    this.store.set(this.path, data);
  }
  async set(data: DocData): Promise<void> {
    if (this.store.has(this.path)) throw new Error('already exists');
    this.store.set(this.path, data);
  }
}

class InMemoryCollectionRef implements FirestoreLegacyCollectionRef {
  private store: Map<string, DocData>;
  readonly path: string;
  constructor(store: Map<string, DocData>, path: string) {
    this.store = store;
    this.path = path;
  }
  doc(id: string): FirestoreLegacyDocRef {
    return new InMemoryDocRef(this.store, `${this.path}/${id}`);
  }
}

class InMemoryFirestore implements FirestoreLegacyCollectionRef { // also exposes dump() for test assertions
  private store = new Map<string, DocData>();
  // FirestoreLegacyCollectionRef requirement
  doc(id: string): FirestoreLegacyDocRef { return new InMemoryDocRef(this.store, id); }
  // Adapter so publishEvent sees legacy style: provide collection()
  collection(path: string): FirestoreLegacyCollectionRef { return new InMemoryCollectionRef(this.store, path); }
  dump(): Array<[string, DocData]> {
    return Array.from(this.store.entries());
  }
}

async function run() {
  // Happy path
  const db = new InMemoryFirestore();
  const res = await publishEvent({
    db,
    orgId: 'org_abc',
    type: 'automation.run.started' as EventType,
    source: 'automation',
    attrs: { naturalKey: 'run-1', step: 'init', ok: true },
  });

  if (!/^\d{13}-[0-9a-f]{8}$/.test(res.eventId)) {
    throw new Error('Unexpected eventId format');
  }
  const writes = db.dump();
  if (writes.length !== 1 || writes[0][0] !== `/orgs/org_abc/events/${res.eventId}`) {
    throw new Error('Write not recorded at expected path');
  }

  // Unknown type
  let caught = false;
  try {
    await publishEvent({
      db,
      orgId: 'org_abc',
      // Intentionally invalid type; runtime check should throw
      type: 'automation.run.UNKNOWN' as unknown as EventType,
      source: 'automation',
    });
  } catch (e: unknown) {
    caught = !!(
      e &&
      typeof e === 'object' &&
      'message' in e &&
      typeof (e as { message?: unknown }).message === 'string' &&
      (e as { message: string }).message === 'UNKNOWN_EVENT_TYPE'
    );
  }
  if (!caught) throw new Error('UNKNOWN_EVENT_TYPE was not thrown');


  console.log('publishEvent tests: PASS');
}

run().catch((err) => {

  console.error('publishEvent tests: FAIL');

  console.error(err);
  process.exit(1);
});
