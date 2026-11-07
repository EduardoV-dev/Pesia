import { type QueuedEntryOp } from "./entry-ops"

/**
 * The browser-side persistence the queue and the snapshots live on: the
 * `weight-tracker-ops` and `weight-tracker-snapshot` stores in one database.
 * Structure-free environments (tests, SSR) fall back to memory-keeping so the
 * queue keeps working without IndexedDB.
 */
export const OFFLINE_DATABASE_NAME = "weight-tracker"
export const OFFLINE_OPS_STORE_NAME = "weight-tracker-ops"
export const OFFLINE_SNAPSHOT_STORE_NAME = "weight-tracker-snapshot"

const SNAPSHOT_CURRENT_KEY = "current"

type OfflineDatabase = {
  readonly perf: "idb" | "memory"
  readonly db: IDBDatabase | null
}

let cachedDatabase: OfflineDatabase | null = null

const memoryOps = new Map<string, QueuedEntryOp>()
const memorySnapshots = new Map<string, unknown>()

function requiresIndexedDatabase(): IDBFactory | null {
  if (typeof indexedDB === "undefined") {
    return null
  }

  return indexedDB
}

function openOfflineDatabase(): Promise<OfflineDatabase> {
  if (cachedDatabase) {
    return Promise.resolve(cachedDatabase)
  }

  const factory = requiresIndexedDatabase()

  if (!factory) {
    cachedDatabase = { perf: "memory", db: null }

    return Promise.resolve(cachedDatabase)
  }

  return new Promise((resolve) => {
    const request = factory.open(OFFLINE_DATABASE_NAME, 1)

    request.onupgradeneeded = () => {
      const db = request.result

      if (!db.objectStoreNames.contains(OFFLINE_OPS_STORE_NAME)) {
        db.createObjectStore(OFFLINE_OPS_STORE_NAME, { keyPath: "opId" })
      }

      if (!db.objectStoreNames.contains(OFFLINE_SNAPSHOT_STORE_NAME)) {
        db.createObjectStore(OFFLINE_SNAPSHOT_STORE_NAME)
      }
    }
    request.onsuccess = () => {
      cachedDatabase = { perf: "idb", db: request.result }
      resolve(cachedDatabase)
    }
    request.onerror = () => {
      cachedDatabase = { perf: "memory", db: null }
      resolve(cachedDatabase)
    }
  })
}

function withStore(
  storeName: string,
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => void,
): Promise<void> {
  return openOfflineDatabase().then((database) => {
    if (!database.db) {
      return
    }

    return new Promise<void>((resolve, reject) => {
      const transaction = database.db!.transaction(storeName, mode)

      transaction.oncomplete = () => resolve()
      transaction.onerror = transaction.onabort = () => {
        reject(transaction.error ?? new Error("La cola local no está disponible"))
      }

      run(transaction.objectStore(storeName))
    })
  })
}

export async function putOpRecord(record: QueuedEntryOp): Promise<void> {
  memoryOps.set(record.opId, record)
  await withStore(OFFLINE_OPS_STORE_NAME, "readwrite", (store) => store.put(record))
}

export async function deleteOpRecords(opIds: readonly string[]): Promise<void> {
  for (const opId of opIds) {
    memoryOps.delete(opId)
  }

  await withStore(OFFLINE_OPS_STORE_NAME, "readwrite", (store) => {
    for (const opId of opIds) {
      store.delete(opId)
    }
  })
}

export async function loadOpRecords(): Promise<QueuedEntryOp[]> {
  const database = await openOfflineDatabase()

  if (!database.db) {
    return [...memoryOps.values()]
  }

  const request = database.db
    .transaction(OFFLINE_OPS_STORE_NAME, "readonly")
    .objectStore(OFFLINE_OPS_STORE_NAME)
    .getAll()

  return new Promise((resolve) => {
    request.onsuccess = () => resolve((request.result ?? []) as QueuedEntryOp[])
    request.onerror = () => resolve([])
  })
}

export async function readSnapshot(key: string): Promise<unknown> {
  const database = await openOfflineDatabase()

  if (!database.db) {
    return memorySnapshots.get(key)
  }

  const request = database.db
    .transaction(OFFLINE_SNAPSHOT_STORE_NAME, "readonly")
    .objectStore(OFFLINE_SNAPSHOT_STORE_NAME)
    .get(key)

  return new Promise((resolve) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => resolve(undefined)
  })
}

export async function writeSnapshot(key: string, value: unknown): Promise<void> {
  memorySnapshots.set(key, value)
  await withStore(OFFLINE_SNAPSHOT_STORE_NAME, "readwrite", (store) => store.put(value, key))
}

export type CurrentOfflineKey = {
  readonly sheetProfileId?: string
  readonly historySubjectId?: string
}

/** The record pointing at which payloads the offline shell should render. */
export async function readCurrentKey(): Promise<CurrentOfflineKey> {
  return (await readSnapshot(SNAPSHOT_CURRENT_KEY)) as CurrentOfflineKey
}

export async function writeCurrentKey(key: CurrentOfflineKey): Promise<void> {
  const previous = await readCurrentKey()

  await writeSnapshot(SNAPSHOT_CURRENT_KEY, { ...previous, ...key })
}
