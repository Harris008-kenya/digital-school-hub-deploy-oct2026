import { prisma } from "@/lib/prisma";

const MAX_FAILED_ATTEMPTS = 5;
const MAX_IP_FAILED_ATTEMPTS = 20;

const WINDOW_MS = 15 * 60 * 1000;
const BLOCK_DURATION_MS = 15 * 60 * 1000;

export type LoginType =
  | "STUDENT"
  | "PARENT"
  | "TEACHER"
  | "ADMINISTRATOR";

function normalizeIdentifier(identifier: string) {
  return identifier.trim().toLowerCase();
}

export function getClientIp(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for");

  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }

  const realIp = request.headers.get("x-real-ip");

  if (realIp) {
    return realIp.trim();
  }

  return "unknown";
}

export async function checkLoginRateLimit(
  loginType: LoginType,
  identifier: string,
  ipAddress: string
) {
  const normalizedIdentifier =
    normalizeIdentifier(identifier);

  const now = new Date();

  const existing = await prisma.loginAttempt.findUnique({
    where: {
      loginType_identifier_ipAddress: {
        loginType,
        identifier: normalizedIdentifier,
        ipAddress,
      },
    },
  });

  const existingIp = await prisma.loginIpAttempt.findUnique({
    where: {
      ipAddress,
    },
  });

  if (
    existingIp?.blockedUntil &&
    existingIp.blockedUntil > now
  ) {
    const retryAfterSeconds = Math.ceil(
      (existingIp.blockedUntil.getTime() - now.getTime()) /
        1000
    );

    return {
      allowed: false,
      retryAfterSeconds,
    };
  }

  if (
    existingIp &&
    now.getTime() -
      existingIp.windowStart.getTime() >=
      WINDOW_MS
  ) {
    await prisma.loginIpAttempt.update({
      where: {
        id: existingIp.id,
      },
      data: {
        failedCount: 0,
        windowStart: now,
        blockedUntil: null,
      },
    });
  }

  if (
    existing?.blockedUntil &&
    existing.blockedUntil > now
  ) {
    const retryAfterSeconds = Math.ceil(
      (existing.blockedUntil.getTime() - now.getTime()) /
        1000
    );

    return {
      allowed: false,
      retryAfterSeconds,
    };
  }

  if (
    existing &&
    now.getTime() -
      existing.windowStart.getTime() >=
      WINDOW_MS
  ) {
    await prisma.loginAttempt.update({
      where: {
        id: existing.id,
      },
      data: {
        failedCount: 0,
        windowStart: now,
        blockedUntil: null,
      },
    });
  }

  return {
    allowed: true,
    retryAfterSeconds: 0,
  };
}

export async function recordFailedLogin(
  loginType: LoginType,
  identifier: string,
  ipAddress: string
) {
  const normalizedIdentifier =
    normalizeIdentifier(identifier);

  const now = new Date();

  const existing = await prisma.loginAttempt.findUnique({
    where: {
      loginType_identifier_ipAddress: {
        loginType,
        identifier: normalizedIdentifier,
        ipAddress,
      },
    },
  });

  if (
    !existing ||
    now.getTime() -
      existing.windowStart.getTime() >=
      WINDOW_MS
  ) {
    await prisma.loginAttempt.upsert({
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
        failedCount: 1,
        windowStart: now,
        blockedUntil: null,
      },
      update: {
        failedCount: 1,
        windowStart: now,
        blockedUntil: null,
      },
    });
  } else {
    const newFailedCount =
      existing.failedCount + 1;

    const shouldBlock =
      newFailedCount >= MAX_FAILED_ATTEMPTS;

    const blockedUntil = shouldBlock
      ? new Date(now.getTime() + BLOCK_DURATION_MS)
      : null;

    await prisma.loginAttempt.update({
      where: {
        id: existing.id,
      },
      data: {
        failedCount: newFailedCount,
        blockedUntil,
      },
    });
  }

  const existingIp = await prisma.loginIpAttempt.findUnique({
    where: {
      ipAddress,
    },
  });

  if (
    !existingIp ||
    now.getTime() -
      existingIp.windowStart.getTime() >=
      WINDOW_MS
  ) {
    await prisma.loginIpAttempt.upsert({
      where: {
        ipAddress,
      },
      create: {
        ipAddress,
        failedCount: 1,
        windowStart: now,
        blockedUntil: null,
      },
      update: {
        failedCount: 1,
        windowStart: now,
        blockedUntil: null,
      },
    });

    return {
      blocked: false,
      failedCount: 1,
      retryAfterSeconds: 0,
    };
  }

  const newIpFailedCount =
    existingIp.failedCount + 1;

  const shouldBlockIp =
    newIpFailedCount >= MAX_IP_FAILED_ATTEMPTS;

  const blockedUntil = shouldBlockIp
    ? new Date(now.getTime() + BLOCK_DURATION_MS)
    : null;

  await prisma.loginIpAttempt.update({
    where: {
      id: existingIp.id,
    },
    data: {
      failedCount: newIpFailedCount,
      blockedUntil,
    },
  });

  return {
    blocked: shouldBlockIp,
    failedCount: newIpFailedCount,
    retryAfterSeconds: shouldBlockIp
      ? Math.ceil(BLOCK_DURATION_MS / 1000)
      : 0,
  };
}

export async function clearFailedLogins(
  loginType: LoginType,
  identifier: string,
  ipAddress: string
) {
  const normalizedIdentifier =
    normalizeIdentifier(identifier);

  await prisma.loginAttempt.deleteMany({
    where: {
      loginType,
      identifier: normalizedIdentifier,
      ipAddress,
    },
  });
}

export async function cleanupOldLoginAttempts() {
  const cutoff = new Date(
    Date.now() - 24 * 60 * 60 * 1000
  );

  await prisma.loginAttempt.deleteMany({
    where: {
      updatedAt: {
        lt: cutoff,
      },
    },
  });

  await prisma.loginIpAttempt.deleteMany({
    where: {
      updatedAt: {
        lt: cutoff,
      },
    },
  });
}