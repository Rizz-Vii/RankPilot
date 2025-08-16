// Minimal self-contained test (no mocha harness required)
import { publishEvent } from '../../src/lib/events/publishEvent';

class InMemoryDocSnapshot {
  private _data: any | undefined;
  constructor(data?: any) {
    this._data = data;
  }
  exists(): boolean {
    return !!this._data;
  }
  get exists2(): boolean {
    return this.exists();
  }
  data() {
    return this._data;
  }
}

class InMemoryDocRef {
  private store: Map<string, any>;
  readonly path: string;
  constructor(store: Map<string, any>, path: string) {
    this.store = store;
    this.path = path;
  }
  async get() {
    const data = this.store.get(this.path);
    const snap: any = new InMemoryDocSnapshot(data);
    (snap as any).exists = (snap as any).exists2;
    return snap;
  }
  async create(data: any) {
    if (this.store.has(this.path)) throw new Error('already exists');
    this.store.set(this.path, data);
  }
  async set(data: any) {
    if (this.store.has(this.path)) throw new Error('already exists');
    this.store.set(this.path, data);
  }
}

class InMemoryCollectionRef {
  private store: Map<string, any>;
  readonly path: string;
  constructor(store: Map<string, any>, path: string) {
    this.store = store;
    this.path = path;
  }
  doc(id: string) {
    return new InMemoryDocRef(this.store, `${this.path}/${id}`);
  }
}

class InMemoryFirestore {
  private store = new Map<string, any>();
  collection(path: string) {
    return new InMemoryCollectionRef(this.store, path);
  }
  dump() {
    return Array.from(this.store.entries());
  }
}

async function run() {
  // Happy path
  const db: any = new InMemoryFirestore();
  const res = await publishEvent({
    db,
    orgId: 'org_abc',
    type: 'automation.run.started' as any,
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
      type: 'automation.run.UNKNOWN' as any,
      source: 'automation',
    });
  } catch (e: any) {
    caught = e && e.message === 'UNKNOWN_EVENT_TYPE';
  }
  if (!caught) throw new Error('UNKNOWN_EVENT_TYPE was not thrown');

  // eslint-disable-next-line no-console
  console.log('publishEvent tests: PASS');
}

run().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('publishEvent tests: FAIL');
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
