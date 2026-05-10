import { db } from './firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import type { ErrorCode } from '@/types';

type Severity = 'info' | 'warn' | 'error' | 'critical';

interface LogPayload {
  code: ErrorCode;
  context?: Record<string, unknown>;
  message: string;
  userId?: string | null;
  severity: Severity;
}

const isDev = process.env.NODE_ENV === 'development';

function consoleLog(severity: Severity, code: ErrorCode, message: string, context?: Record<string, unknown>) {
  const prefix = `[CANDU:${code}]`;
  const styles: Record<Severity, string> = {
    info: 'color: #00D8FF',
    warn: 'color: #FFB800',
    error: 'color: #FF4D4D',
    critical: 'color: #FF0000; font-weight: bold',
  };
  if (typeof window !== 'undefined') {
    console.log(`%c${prefix} ${message}`, styles[severity], context ?? '');
  } else {
    console.log(`${prefix} ${message}`, context ?? '');
  }
}

export async function logError(
  code: ErrorCode,
  message: string,
  context: Record<string, unknown> = {},
  userId: string | null = null,
  severity: Severity = 'error'
): Promise<void> {
  // Always log to console in dev
  consoleLog(severity, code, message, context);

  // In production, persist critical errors to Firestore
  if (!isDev || severity === 'critical') {
    try {
      await addDoc(collection(db, '_logs'), {
        code,
        message,
        context,
        userId,
        severity,
        createdAt: serverTimestamp(),
      });
    } catch (firestoreErr) {
      // Avoid infinite logging loop — just console
      console.error('[CANDU:LOGGER_FAILED]', firestoreErr);
    }
  }
}

export function logInfo(code: ErrorCode, message: string, context?: Record<string, unknown>) {
  return logError(code, message, context ?? {}, null, 'info');
}

export function logWarn(code: ErrorCode, message: string, context?: Record<string, unknown>) {
  return logError(code, message, context ?? {}, null, 'warn');
}

export function logCritical(code: ErrorCode, message: string, context?: Record<string, unknown>, userId?: string | null) {
  return logError(code, message, context ?? {}, userId ?? null, 'critical');
}
