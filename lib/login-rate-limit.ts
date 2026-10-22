
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const MAX_FAILED_ATTEMPTS = 5;
const MAX_IP_FAILED_ATTEMPTS = 20;

const WINDOW_MS = 15 * 60 * 1000;
const BLOCK_DURATION_MS = 15 * 60 * 1000;
const MAX_TRANSACTION_RETRIES = 3;

export type LoginType =
  | "STUDENT"
  | "PARENT"
  | "TEACHER"
  | "ADMINISTRATOR";

function normalizeIdentifier(identifier: string) {
  return identifier.trim().toLowerCase();
}

function getPrismaErrorCode(error: unknown): string | null {
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof error.code === "string"
  ) {
    return error.code;
  }

  return null;
}

async function serializableTransaction<T>(
  operation: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  for (let attempt = 1; attempt <= MAX_TRANSACTION_RETRIES; attempt++) {
    try {
      return await prisma.$transaction(operation, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      });
    } catch (error) {
      const code = getPrismaErrorCode(error);
      const retryable = code === "P2034" || code === "P2002";

      if (!retryable || attempt === MAX_TRANSACTION_RETRIES) {
        throw error;
      }
    }
  }

  throw new Error("Login rate-limit transaction failed.");
}

export function getClientIp(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for");

  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim() || "unknown";
  }

  const realIp = request.headers.get("x-real-ip");

  if (realIp) {
    return realIp.trim() || "unknown";
  }

  return "unknown";
}

export async function checkLoginRateLimit(
  loginType: LoginType,
  identifier: string,
  ipAddress: string,
) {
  const normalizedIdentifier = normalizeIdentifier(identifier);
  const now = new Date();

  const [existing, existingIp] = await Promise.all([
    prisma.loginAttempt.findUnique({
      where: {
        loginType_identifier_ipAddress: {
          loginType,
          identifier: normalizedIdentifier,
          ipAddress,
        },
      },
    }),
    prisma.loginIpAttempt.findUnique({
      where: { ipAddress },
    }),
  ]);

  const ipWindowExpired =
    existingIp !== null &&
    now.getTime() - existingIp.windowStart.getTime() >= WINDOW_MS;

  if (
    existingIp?.blockedUntil &&
    existingIp.blockedUntil > now &&
    !ipWindowExpired
  ) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(
        1,
        Math.ceil(
          (existingIp.blockedUntil.getTime() - now.getTime()) / 1000,
        ),
      ),
    };
  }

  const identifierWindowExpired =
    existing !== null &&
    now.getTime() - existing.windowStart.getTime() >= WINDOW_MS;

  if (
    existing?.blockedUntil &&
    existing.blockedUntil > now &&
    !identifierWindowExpired
  ) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(
        1,
        Math.ceil(
          (existing.blockedUntil.getTime() - now.getTime()) / 1000,
        ),
      ),
    };
  }

  return {
    allowed: true,
    retryAfterSeconds: 0,
  };
}

export async function recordFailedLogin(
  loginType: LoginType,
  identifier: string,
  ipAddress: string,
) {
  const normalizedIdentifier = normalizeIdentifier(identifier);
  const now = new Date();

  return serializableTransaction(async (tx) => {
    const existing = await tx.loginAttempt.findUnique({
      where: {
        loginType_identifier_ipAddress: {
          loginType,
          identifier: normalizedIdentifier,
          ipAddress,
        },
      },
    });

    let failedCount: number;
    let identifierBlocked = false;

    if (
      !existing ||
      now.getTime() - existing.windowStart.getTime() >= WINDOW_MS
    ) {
      failedCount = 1;

      await tx.loginAttempt.upsert({
        where: {
          loginType_identifier_ipAddress: {
            loginType,
            identifier: normalizedIdentifier,
            ipAddress,
          },
        },
        create: {
          loginType,
          identifier: normalizedIdentifier,
          ipAddress,
          failedCount,
          windowStart: now,
          blockedUntil: null,
        },
        update: {
          failedCount,
          windowStart: now,
          blockedUntil: null,
        },
      });
    } else {
      failedCount = existing.failedCount + 1;
      identifierBlocked = failedCount >= MAX_FAILED_ATTEMPTS;

      await tx.loginAttempt.update({
        where: { id: existing.id },
        data: {
          failedCount: { increment: 1 },
          blockedUntil: identifierBlocked
            ? new Date(now.getTime() + BLOCK_DURATION_MS)
            : null,
        },
      });
    }

    const existingIp = await tx.loginIpAttempt.findUnique({
      where: { ipAddress },
    });

    let ipFailedCount: number;

    if (
      !existingIp ||
      now.getTime() - existingIp.windowStart.getTime() >= WINDOW_MS
    ) {
      ipFailedCount = 1;

      await tx.loginIpAttempt.upsert({
        where: { ipAddress },
        create: {
          ipAddress,
          failedCount: ipFailedCount,
          windowStart: now,
          blockedUntil: null,
        },
        update: {
          failedCount: ipFailedCount,
          windowStart: now,
          blockedUntil: null,
        },
      });
    } else {
      ipFailedCount = existingIp.failedCount + 1;

      await tx.loginIpAttempt.update({
        where: { id: existingIp.id },
        data: {
          failedCount: { increment: 1 },
          blockedUntil:
            ipFailedCount >= MAX_IP_FAILED_ATTEMPTS
              ? new Date(now.getTime() + BLOCK_DURATION_MS)
              : null,
        },
      });
    }

    const ipBlocked = ipFailedCount >= MAX_IP_FAILED_ATTEMPTS;
    const blocked = identifierBlocked || ipBlocked;

    return {
      blocked,
      failedCount,
      retryAfterSeconds: blocked
        ? Math.ceil(BLOCK_DURATION_MS / 1000)
        : 0,
    };
  });
}

export async function clearFailedLogins(
  loginType: LoginType,
  identifier: string,
  ipAddress: string,
) {
  const normalizedIdentifier = normalizeIdentifier(identifier);

  await prisma.loginAttempt.deleteMany({
    where: {
      loginType,
      identifier: normalizedIdentifier,
      ipAddress,
    },
  });
}

export async function cleanupOldLoginAttempts() {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);

  await prisma.loginAttempt.deleteMany({
    where: {
      updatedAt: { lt: cutoff },
    },
  });

  await prisma.loginIpAttempt.deleteMany({
    where: {
      updatedAt: { lt: cutoff },
    },
  });
}
