/**
 * AirScribe AI — IndexedDB Database Schema (Dexie.js)
 * §4.1: "IndexedDB (Dexie.js) — Typed schema, Promise API, efficient binary storage for strokes"
 * §8.3: Data Schema Reference — all IndexedDB tables
 */

import Dexie, { type EntityTable } from 'dexie';

// ─── Table Interfaces (§8.3) ────────────────────────────────────────────────

/** §8.3: strokes table */
export interface StrokeRecord {
  strokeId: string;
  userId: string;
  points: Float32Array;
  timestamps: Uint32Array;
  complete: boolean;
  sessionId: string;
  createdAt: string;
}

/** §8.3: feedback table */
export interface FeedbackRecord {
  id?: number;
  userId: string;
  strokeId: string;
  stroke: Float32Array;
  predicted: string;
  corrected: string;
  modelId: string;
  sessionId: string;
  createdAt: string;
}

/** §8.3: models table */
export interface ModelRecord {
  modelId: string;
  parentModelId: string | null;
  status: 'candidate' | 'canary' | 'active' | 'rolled-back' | 'archived';
  trainedAt: string;
  validationAccuracy: number;
  regressionDelta: number;
  artifactUrl: string;
}

/** §8.3: sessions table */
export interface SessionDBRecord {
  sessionId: string;
  userId: string;
  startedAt: string;
  endedAt?: string;
  wordCount: number;
  accuracyEstimate: number;
}

/** §8.3: settings table */
export interface SettingsRecord {
  userId: string;
  handPreference: 'left' | 'right';
  sensitivity: number;
  language: string;
  theme: 'light' | 'dark' | 'system';
  consentGiven: boolean;
  consentAt?: string;
}

// ─── Database Class ─────────────────────────────────────────────────────────

class AirScribeDB extends Dexie {
  strokes!: EntityTable<StrokeRecord, 'strokeId'>;
  feedback!: EntityTable<FeedbackRecord, 'id'>;
  models!: EntityTable<ModelRecord, 'modelId'>;
  sessions!: EntityTable<SessionDBRecord, 'sessionId'>;
  settings!: EntityTable<SettingsRecord, 'userId'>;

  constructor() {
    super('AirScribeDB');

    this.version(1).stores({
      strokes: 'strokeId, userId, sessionId, createdAt',
      feedback: '++id, userId, strokeId, modelId, sessionId, createdAt',
      models: 'modelId, parentModelId, status, trainedAt',
      sessions: 'sessionId, userId, startedAt',
      settings: 'userId',
    });
  }
}

/** Singleton database instance */
export const db = new AirScribeDB();

// ─── §4.5: IndexedDB Garbage Collection ─────────────────────────────────────

import { STROKE_RETENTION_DAYS, FEEDBACK_RETENTION_DAYS } from '../constants';

/**
 * §4.5: "Completed strokes older than 30 days are purged automatically on app open"
 * §9.1: "Feedback strokes older than 90 days are automatically purged"
 */
export async function purgeOldData(): Promise<void> {
  const now = new Date();

  const strokeCutoff = new Date(now.getTime() - STROKE_RETENTION_DAYS * 24 * 60 * 60 * 1000);
  await db.strokes
    .where('createdAt')
    .below(strokeCutoff.toISOString())
    .delete();

  const feedbackCutoff = new Date(now.getTime() - FEEDBACK_RETENTION_DAYS * 24 * 60 * 60 * 1000);
  await db.feedback
    .where('createdAt')
    .below(feedbackCutoff.toISOString())
    .delete();
}
