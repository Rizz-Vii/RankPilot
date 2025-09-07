// Generic Firestore snapshot mapping helper
// Side-effect free; aids in removing repeated snapshot mapping boilerplate.
import type { DocumentData, QuerySnapshot } from "firebase/firestore";

export function mapDocs<T>(
  snap: QuerySnapshot<DocumentData>,
  mapper: (id: string, data: DocumentData) => T
): T[] {
  return snap.docs.map((d) => mapper(d.id, d.data()));
}
