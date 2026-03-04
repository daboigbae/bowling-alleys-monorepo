import admin from "firebase-admin";
import { vi } from "vitest";

export type MockDocumentData = Record<string, unknown>;

export interface MockTimestamp {
  _seconds: number;
  _nanoseconds: number;
  seconds: number;
  nanoseconds: number;
  toDate: () => Date;
}

type QuerySource =
  | { kind: "collection"; path: string }
  | { kind: "collectionGroup"; collectionId: string };

type QueryDirection = "asc" | "desc";
type WhereFilterOp =
  | "=="
  | "!="
  | "<"
  | "<="
  | ">"
  | ">="
  | "array-contains"
  | "in"
  | "array-contains-any"
  | "not-in";

interface WhereFilter {
  fieldPath: string;
  op: WhereFilterOp;
  value: unknown;
}

interface OrderByConstraint {
  fieldPath: string;
  direction: QueryDirection;
}

interface QueryConstraints {
  filters: WhereFilter[];
  orderBy: OrderByConstraint[];
  limit: number | null;
  startAfter: unknown[] | null;
}

interface SetOptions {
  merge?: boolean;
}

interface QueryRecord {
  ref: MockDocumentReference;
  data: MockDocumentData;
}

interface ServerTimestampSentinel {
  _serverTimestamp: true;
  __mockServerTimestamp?: true;
}

type FirestoreFactory = (() => MockFirestore) & {
  FieldValue: {
    serverTimestamp: () => ServerTimestampSentinel;
  };
};

function createInitialConstraints(): QueryConstraints {
  return {
    filters: [],
    orderBy: [],
    limit: null,
    startAfter: null,
  };
}

function normalizePath(path: string): string {
  return path
    .split("/")
    .map((part) => part.trim())
    .filter(Boolean)
    .join("/");
}

function splitPath(path: string): string[] {
  return normalizePath(path).split("/").filter(Boolean);
}

function ensureDocumentPath(path: string): { collectionPath: string; docId: string } {
  const segments = splitPath(path);
  if (segments.length < 2 || segments.length % 2 !== 0) {
    throw new Error(`Invalid document path "${path}"`);
  }

  const docId = segments[segments.length - 1];
  const collectionPath = segments.slice(0, -1).join("/");
  return { collectionPath, docId };
}

function ensureCollectionPath(path: string): string {
  const normalized = normalizePath(path);
  const segments = splitPath(normalized);
  if (segments.length === 0 || segments.length % 2 === 0) {
    throw new Error(`Invalid collection path "${path}"`);
  }
  return normalized;
}

function buildDocumentPath(collectionPath: string, docId: string): string {
  return `${normalizePath(collectionPath)}/${docId}`;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== "object") {
    return false;
  }
  return Object.getPrototypeOf(value) === Object.prototype;
}

function createMockTimestamp(date: Date = new Date()): MockTimestamp {
  const millis = date.getTime();
  const seconds = Math.floor(millis / 1000);
  const nanoseconds = (millis % 1000) * 1_000_000;

  return {
    _seconds: seconds,
    _nanoseconds: nanoseconds,
    seconds,
    nanoseconds,
    toDate: () => new Date(millis),
  };
}

function createServerTimestampSentinel(): ServerTimestampSentinel {
  return {
    _serverTimestamp: true,
    __mockServerTimestamp: true,
  };
}

function isServerTimestampSentinel(value: unknown): value is ServerTimestampSentinel {
  return isPlainObject(value) && value._serverTimestamp === true;
}

function deepClone<T>(value: T): T {
  if (value === null || typeof value !== "object") {
    return value;
  }

  if (value instanceof Date) {
    return new Date(value.getTime()) as T;
  }

  if (Array.isArray(value)) {
    return value.map((item) => deepClone(item)) as T;
  }

  const cloned: Record<string, unknown> = {};
  for (const [key, itemValue] of Object.entries(value)) {
    cloned[key] = deepClone(itemValue);
  }
  return cloned as T;
}

function normalizeWriteValue(value: unknown): unknown {
  if (isServerTimestampSentinel(value)) {
    return createMockTimestamp();
  }

  if (value === null || typeof value !== "object") {
    return value;
  }

  if (value instanceof Date) {
    return new Date(value.getTime());
  }

  if (Array.isArray(value)) {
    return value.map((item) => normalizeWriteValue(item));
  }

  const normalized: Record<string, unknown> = {};
  for (const [key, nestedValue] of Object.entries(value)) {
    normalized[key] = normalizeWriteValue(nestedValue);
  }
  return normalized;
}

function ensureDocumentData(value: unknown, context: string): MockDocumentData {
  if (!isPlainObject(value)) {
    throw new Error(`${context} must be a plain object`);
  }
  return deepClone(normalizeWriteValue(value) as MockDocumentData);
}

function getFieldValue(data: MockDocumentData, fieldPath: string): unknown {
  if (fieldPath === "__name__") {
    return undefined;
  }

  const segments = fieldPath.split(".");
  let current: unknown = data;
  for (const segment of segments) {
    if (!isPlainObject(current)) {
      return undefined;
    }
    current = current[segment];
  }
  return current;
}

function setFieldValue(target: MockDocumentData, fieldPath: string, value: unknown): void {
  const segments = fieldPath.split(".");
  if (segments.length === 0) {
    return;
  }

  let current: Record<string, unknown> = target;
  for (let idx = 0; idx < segments.length - 1; idx += 1) {
    const segment = segments[idx];
    const existing = current[segment];
    if (!isPlainObject(existing)) {
      current[segment] = {};
    }
    current = current[segment] as Record<string, unknown>;
  }

  current[segments[segments.length - 1]] = value;
}

function valuesEqual(left: unknown, right: unknown): boolean {
  if (left === right) {
    return true;
  }

  if (left instanceof Date && right instanceof Date) {
    return left.getTime() === right.getTime();
  }

  if (Array.isArray(left) && Array.isArray(right)) {
    if (left.length !== right.length) {
      return false;
    }
    return left.every((item, index) => valuesEqual(item, right[index]));
  }

  if (isPlainObject(left) && isPlainObject(right)) {
    const leftKeys = Object.keys(left);
    const rightKeys = Object.keys(right);
    if (leftKeys.length !== rightKeys.length) {
      return false;
    }
    return leftKeys.every((key) => valuesEqual(left[key], right[key]));
  }

  return false;
}

function toComparableValue(value: unknown): string | number | boolean | null {
  if (value === undefined || value === null) {
    return null;
  }

  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return value;
  }

  if (value instanceof Date) {
    return value.getTime();
  }

  if (isPlainObject(value) && typeof value.toDate === "function") {
    try {
      const date = value.toDate();
      if (date instanceof Date) {
        return date.getTime();
      }
    } catch {
      return null;
    }
  }

  if (isPlainObject(value) && typeof value.seconds === "number") {
    return value.seconds;
  }

  return JSON.stringify(value);
}

function compareValues(left: unknown, right: unknown): number {
  const leftComparable = toComparableValue(left);
  const rightComparable = toComparableValue(right);

  if (leftComparable === rightComparable) {
    return 0;
  }

  if (leftComparable === null) {
    return -1;
  }

  if (rightComparable === null) {
    return 1;
  }

  if (leftComparable < rightComparable) {
    return -1;
  }
  return 1;
}

function applyWhereFilter(record: QueryRecord, filter: WhereFilter): boolean {
  const fieldValue = getFieldValue(record.data, filter.fieldPath);
  switch (filter.op) {
    case "==":
      return valuesEqual(fieldValue, filter.value);
    case "!=":
      return !valuesEqual(fieldValue, filter.value);
    case "<":
      return compareValues(fieldValue, filter.value) < 0;
    case "<=":
      return compareValues(fieldValue, filter.value) <= 0;
    case ">":
      return compareValues(fieldValue, filter.value) > 0;
    case ">=":
      return compareValues(fieldValue, filter.value) >= 0;
    case "array-contains":
      return Array.isArray(fieldValue) && fieldValue.some((item) => valuesEqual(item, filter.value));
    case "in":
      return Array.isArray(filter.value) && filter.value.some((item) => valuesEqual(item, fieldValue));
    case "array-contains-any":
      return (
        Array.isArray(fieldValue) &&
        Array.isArray(filter.value) &&
        filter.value.some((item) => fieldValue.some((valueItem) => valuesEqual(valueItem, item)))
      );
    case "not-in":
      return Array.isArray(filter.value) && !filter.value.some((item) => valuesEqual(item, fieldValue));
    default:
      return false;
  }
}

function compareQueryRecords(
  left: QueryRecord,
  right: QueryRecord,
  orderBy: OrderByConstraint[],
): number {
  for (const constraint of orderBy) {
    const leftValue = getFieldValue(left.data, constraint.fieldPath);
    const rightValue = getFieldValue(right.data, constraint.fieldPath);
    const comparison = compareValues(leftValue, rightValue);
    if (comparison !== 0) {
      return constraint.direction === "desc" ? comparison * -1 : comparison;
    }
  }

  return compareValues(left.ref.id, right.ref.id);
}

function isDocumentSnapshotLike(
  value: unknown,
): value is { id: string; data: () => MockDocumentData | undefined } {
  return (
    isPlainObject(value) &&
    typeof value.id === "string" &&
    typeof value.data === "function"
  );
}

function randomId(): string {
  return `mock-${Math.random().toString(36).slice(2, 18)}`;
}

export class MockDocumentSnapshot {
  public readonly id: string;
  public readonly exists: boolean;

  private readonly snapshotData: MockDocumentData | undefined;

  constructor(public readonly ref: MockDocumentReference, data: MockDocumentData | undefined) {
    this.id = ref.id;
    this.exists = data !== undefined;
    this.snapshotData = data ? deepClone(data) : undefined;
  }

  data(): MockDocumentData | undefined {
    return this.snapshotData ? deepClone(this.snapshotData) : undefined;
  }
}

export class MockQuerySnapshot {
  constructor(public readonly docs: MockDocumentSnapshot[]) {}

  get empty(): boolean {
    return this.docs.length === 0;
  }

  get size(): number {
    return this.docs.length;
  }

  forEach(
    callback: (snapshot: MockDocumentSnapshot, index: number, allDocs: MockDocumentSnapshot[]) => void,
  ): void {
    this.docs.forEach(callback);
  }
}

export class MockQuery {
  constructor(
    protected readonly firestore: MockFirestore,
    protected readonly source: QuerySource,
    protected readonly constraints: QueryConstraints,
  ) {}

  private withConstraints(next: Partial<QueryConstraints>): MockQuery {
    return new MockQuery(this.firestore, this.source, {
      filters: next.filters ?? this.constraints.filters,
      orderBy: next.orderBy ?? this.constraints.orderBy,
      limit: next.limit ?? this.constraints.limit,
      startAfter: next.startAfter ?? this.constraints.startAfter,
    });
  }

  where(fieldPath: string, op: WhereFilterOp, value: unknown): MockQuery {
    return this.withConstraints({
      filters: [...this.constraints.filters, { fieldPath, op, value }],
    });
  }

  orderBy(fieldPath: string, direction: QueryDirection = "asc"): MockQuery {
    return this.withConstraints({
      orderBy: [...this.constraints.orderBy, { fieldPath, direction }],
    });
  }

  limit(limitCount: number): MockQuery {
    return this.withConstraints({
      limit: limitCount,
    });
  }

  startAfter(...values: unknown[]): MockQuery {
    if (values.length === 0) {
      return this;
    }

    let cursorValues = values;
    if (values.length === 1 && isDocumentSnapshotLike(values[0])) {
      const docData = values[0].data() || {};
      if (this.constraints.orderBy.length === 0) {
        cursorValues = [values[0].id];
      } else {
        const orderValues = this.constraints.orderBy.map((constraint) =>
          getFieldValue(docData, constraint.fieldPath),
        );
        cursorValues = [...orderValues, values[0].id];
      }
    }

    return this.withConstraints({
      startAfter: cursorValues,
    });
  }

  async get(): Promise<MockQuerySnapshot> {
    const snapshots = this.firestore.executeQuery(this.source, this.constraints);
    return new MockQuerySnapshot(snapshots);
  }
}

export class MockCollectionReference extends MockQuery {
  public readonly id: string;
  public readonly path: string;
  public readonly parent: MockDocumentReference | null;

  constructor(firestore: MockFirestore, collectionPath: string) {
    const normalizedPath = ensureCollectionPath(collectionPath);
    super(firestore, { kind: "collection", path: normalizedPath }, createInitialConstraints());
    const segments = splitPath(normalizedPath);
    this.path = normalizedPath;
    this.id = segments[segments.length - 1];
    if (segments.length >= 3) {
      const parentPath = segments.slice(0, -1).join("/");
      this.parent = new MockDocumentReference(firestore, parentPath);
    } else {
      this.parent = null;
    }
  }

  doc(docId?: string): MockDocumentReference {
    const id = docId ?? randomId();
    return new MockDocumentReference(this.firestore, buildDocumentPath(this.path, id));
  }

  async add(data: MockDocumentData): Promise<MockDocumentReference> {
    const documentRef = this.doc();
    await documentRef.set(data);
    return documentRef;
  }
}

export class MockDocumentReference {
  public readonly id: string;
  public readonly path: string;
  public readonly parent: MockCollectionReference;

  constructor(private readonly firestore: MockFirestore, documentPath: string) {
    const normalizedPath = normalizePath(documentPath);
    const { collectionPath, docId } = ensureDocumentPath(normalizedPath);
    this.path = normalizedPath;
    this.id = docId;
    this.parent = new MockCollectionReference(firestore, collectionPath);
  }

  async get(): Promise<MockDocumentSnapshot> {
    const data = this.firestore.readDocument(this.path);
    return new MockDocumentSnapshot(this, data);
  }

  async set(data: MockDocumentData, options?: SetOptions): Promise<void> {
    this.firestore.setDocument(this.path, data, options);
  }

  async update(data: MockDocumentData): Promise<void> {
    this.firestore.updateDocument(this.path, data);
  }

  async delete(): Promise<void> {
    this.firestore.deleteDocument(this.path);
  }

  collection(name: string): MockCollectionReference {
    return new MockCollectionReference(this.firestore, `${this.path}/${normalizePath(name)}`);
  }
}

type WriteOperation =
  | {
      type: "set";
      ref: MockDocumentReference;
      data: MockDocumentData;
      options?: SetOptions;
    }
  | {
      type: "update";
      ref: MockDocumentReference;
      data: MockDocumentData;
    }
  | {
      type: "delete";
      ref: MockDocumentReference;
    };

export class MockWriteBatch {
  private readonly operations: WriteOperation[] = [];

  constructor(private readonly firestore: MockFirestore) {}

  set(ref: MockDocumentReference, data: MockDocumentData, options?: SetOptions): MockWriteBatch {
    this.operations.push({ type: "set", ref, data, options });
    return this;
  }

  update(ref: MockDocumentReference, data: MockDocumentData): MockWriteBatch {
    this.operations.push({ type: "update", ref, data });
    return this;
  }

  delete(ref: MockDocumentReference): MockWriteBatch {
    this.operations.push({ type: "delete", ref });
    return this;
  }

  async commit(): Promise<void> {
    for (const operation of this.operations) {
      if (operation.type === "set") {
        this.firestore.setDocument(operation.ref.path, operation.data, operation.options);
        continue;
      }
      if (operation.type === "update") {
        this.firestore.updateDocument(operation.ref.path, operation.data);
        continue;
      }
      this.firestore.deleteDocument(operation.ref.path);
    }
  }
}

export class MockTransaction {
  private readonly operations: WriteOperation[] = [];

  constructor(private readonly firestore: MockFirestore) {}

  async get(ref: MockDocumentReference): Promise<MockDocumentSnapshot> {
    const data = this.firestore.readDocument(ref.path);
    return new MockDocumentSnapshot(ref, data);
  }

  set(ref: MockDocumentReference, data: MockDocumentData, options?: SetOptions): MockTransaction {
    this.operations.push({ type: "set", ref, data, options });
    return this;
  }

  update(ref: MockDocumentReference, data: MockDocumentData): MockTransaction {
    this.operations.push({ type: "update", ref, data });
    return this;
  }

  delete(ref: MockDocumentReference): MockTransaction {
    this.operations.push({ type: "delete", ref });
    return this;
  }

  async commit(): Promise<void> {
    for (const operation of this.operations) {
      if (operation.type === "set") {
        this.firestore.setDocument(operation.ref.path, operation.data, operation.options);
        continue;
      }
      if (operation.type === "update") {
        this.firestore.updateDocument(operation.ref.path, operation.data);
        continue;
      }
      this.firestore.deleteDocument(operation.ref.path);
    }
  }
}

export type FirestoreSeedInput = Record<string, unknown>;

export class MockFirestore {
  private readonly collections = new Map<string, Map<string, MockDocumentData>>();

  collection(path: string): MockCollectionReference {
    return new MockCollectionReference(this, path);
  }

  doc(path: string): MockDocumentReference {
    return new MockDocumentReference(this, path);
  }

  collectionGroup(collectionId: string): MockQuery {
    return new MockQuery(
      this,
      { kind: "collectionGroup", collectionId: normalizePath(collectionId) },
      createInitialConstraints(),
    );
  }

  batch(): MockWriteBatch {
    return new MockWriteBatch(this);
  }

  async runTransaction<T>(updateFunction: (transaction: MockTransaction) => Promise<T> | T): Promise<T> {
    const transaction = new MockTransaction(this);
    const result = await updateFunction(transaction);
    await transaction.commit();
    return result;
  }

  seed(data: FirestoreSeedInput): void {
    for (const [pathOrCollection, value] of Object.entries(data)) {
      const pathSegments = splitPath(pathOrCollection);

      if (pathSegments.length >= 2 && pathSegments.length % 2 === 0) {
        const documentData = ensureDocumentData(value, `Document seed "${pathOrCollection}"`);
        this.setDocument(pathOrCollection, documentData);
        continue;
      }

      if (!isPlainObject(value)) {
        throw new Error(`Collection seed "${pathOrCollection}" must be an object map of docs`);
      }

      const collectionPath = ensureCollectionPath(pathOrCollection);
      for (const [docId, docData] of Object.entries(value)) {
        const documentPath = buildDocumentPath(collectionPath, docId);
        const normalizedDocData = ensureDocumentData(docData, `Document seed "${documentPath}"`);
        this.setDocument(documentPath, normalizedDocData);
      }
    }
  }

  reset(): void {
    this.collections.clear();
  }

  readDocument(documentPath: string): MockDocumentData | undefined {
    const { collectionPath, docId } = ensureDocumentPath(documentPath);
    const collection = this.collections.get(collectionPath);
    const data = collection?.get(docId);
    return data ? deepClone(data) : undefined;
  }

  setDocument(documentPath: string, data: MockDocumentData, options?: SetOptions): void {
    const { collectionPath, docId } = ensureDocumentPath(documentPath);
    const normalizedData = ensureDocumentData(data, `set("${documentPath}") data`);
    const collection = this.getCollection(collectionPath, true);

    if (options?.merge) {
      const existing = collection.get(docId) ?? {};
      const merged = deepClone(existing);
      for (const [fieldPath, fieldValue] of Object.entries(normalizedData)) {
        setFieldValue(merged, fieldPath, deepClone(fieldValue));
      }
      collection.set(docId, merged);
      return;
    }

    collection.set(docId, normalizedData);
  }

  updateDocument(documentPath: string, updates: MockDocumentData): void {
    const { collectionPath, docId } = ensureDocumentPath(documentPath);
    const collection = this.getCollection(collectionPath, false);
    if (!collection || !collection.has(docId)) {
      throw new Error(`Document "${documentPath}" does not exist`);
    }

    const current = deepClone(collection.get(docId) ?? {});
    const normalizedUpdates = ensureDocumentData(updates, `update("${documentPath}") data`);
    for (const [fieldPath, value] of Object.entries(normalizedUpdates)) {
      setFieldValue(current, fieldPath, deepClone(value));
    }
    collection.set(docId, current);
  }

  deleteDocument(documentPath: string): void {
    const { collectionPath, docId } = ensureDocumentPath(documentPath);
    const collection = this.getCollection(collectionPath, false);
    collection?.delete(docId);
  }

  executeQuery(source: QuerySource, constraints: QueryConstraints): MockDocumentSnapshot[] {
    let records = this.loadQueryRecords(source);

    if (constraints.filters.length > 0) {
      records = records.filter((record) =>
        constraints.filters.every((filter) => applyWhereFilter(record, filter)),
      );
    }

    if (constraints.orderBy.length > 0) {
      records = records.sort((left, right) =>
        compareQueryRecords(left, right, constraints.orderBy),
      );
    }

    if (constraints.startAfter) {
      records = this.applyStartAfter(records, constraints.orderBy, constraints.startAfter);
    }

    if (constraints.limit !== null) {
      records = records.slice(0, constraints.limit);
    }

    return records.map((record) => new MockDocumentSnapshot(record.ref, record.data));
  }

  private applyStartAfter(
    records: QueryRecord[],
    orderBy: OrderByConstraint[],
    cursorValues: unknown[],
  ): QueryRecord[] {
    if (cursorValues.length === 0) {
      return records;
    }

    if (orderBy.length === 0) {
      const cursorId = String(cursorValues[0]);
      return records.filter((record) => compareValues(record.ref.id, cursorId) > 0);
    }

    return records.filter((record) => {
      for (let idx = 0; idx < orderBy.length; idx += 1) {
        const constraint = orderBy[idx];
        const cursorValue = cursorValues[idx];
        const recordValue = getFieldValue(record.data, constraint.fieldPath);
        const comparison = compareValues(recordValue, cursorValue);
        if (comparison !== 0) {
          return constraint.direction === "desc" ? comparison < 0 : comparison > 0;
        }
      }

      // If orderBy values tie, use doc ID as stable tie-breaker for snapshot cursors.
      if (cursorValues.length > orderBy.length) {
        return compareValues(record.ref.id, cursorValues[orderBy.length]) > 0;
      }
      return false;
    });
  }

  private loadQueryRecords(source: QuerySource): QueryRecord[] {
    if (source.kind === "collection") {
      const collection = this.getCollection(source.path, false);
      if (!collection) {
        return [];
      }

      return Array.from(collection.entries()).map(([docId, data]) => {
        const ref = new MockDocumentReference(this, buildDocumentPath(source.path, docId));
        return { ref, data: deepClone(data) };
      });
    }

    const records: QueryRecord[] = [];
    for (const [collectionPath, docs] of Array.from(this.collections.entries())) {
      const segments = splitPath(collectionPath);
      if (segments[segments.length - 1] !== source.collectionId) {
        continue;
      }

      for (const [docId, data] of Array.from(docs.entries())) {
        const ref = new MockDocumentReference(this, buildDocumentPath(collectionPath, docId));
        records.push({ ref, data: deepClone(data) });
      }
    }

    return records;
  }

  private getCollection(path: string, createIfMissing: true): Map<string, MockDocumentData>;
  private getCollection(path: string, createIfMissing: false): Map<string, MockDocumentData> | undefined;
  private getCollection(
    path: string,
    createIfMissing: boolean,
  ): Map<string, MockDocumentData> | undefined {
    const collectionPath = ensureCollectionPath(path);
    const existing = this.collections.get(collectionPath);
    if (existing || !createIfMissing) {
      return existing;
    }
    const created = new Map<string, MockDocumentData>();
    this.collections.set(collectionPath, created);
    return created;
  }
}

let activeFirestore = new MockFirestore();

const firestoreFactoryMock = vi.fn(() => activeFirestore);
const firestoreFactory = firestoreFactoryMock as unknown as FirestoreFactory;
firestoreFactory.FieldValue = {
  serverTimestamp: createServerTimestampSentinel,
};

type FirebaseAdminMockShape = {
  firestore: FirestoreFactory;
};

const firebaseAdminMock = admin as unknown as FirebaseAdminMockShape;
firebaseAdminMock.firestore = firestoreFactory;

export function getMockFirestore(): MockFirestore {
  return activeFirestore;
}

export function resetFirestore(): void {
  activeFirestore = new MockFirestore();
  firestoreFactoryMock.mockImplementation(() => activeFirestore);
}

export function seedFirestore(data: FirestoreSeedInput): void {
  activeFirestore.seed(data);
}

