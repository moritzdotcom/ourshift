import prisma from '@/lib/prismadb';
import { adminMessaging } from '@/lib/firebase/admin';
import { Role } from '@/generated/prisma';

type PushPayload = {
  title: string;
  body: string;
  link?: string;
  tag?: string;
};

export async function sendPushToUser(userId: string, payload: PushPayload) {
  const prefs = await prisma.notificationPreference.findUnique({
    where: { userId },
  });
  if (prefs && !prefs.pushEnabled) return { sent: 0, removed: 0 };

  const tokens = await prisma.pushToken.findMany({ where: { userId } });
  if (!tokens.length) return { sent: 0, removed: 0 };

  // FCM Webpush
  const res = await adminMessaging.sendEachForMulticast({
    tokens: tokens.map((t) => t.token),
    notification: { title: payload.title, body: payload.body },
    data: {
      ...(payload.link ? { link: payload.link } : {}),
      ...(payload.tag ? { tag: payload.tag } : {}),
    },
    webpush: {
      fcmOptions: payload.link ? { link: payload.link } : undefined,
      notification: {
        tag: payload.tag,
        renotify: true,
        icon: '/icons/favicon-192x192.png',
        badge: '/icons/badge-72.png',
      },
    },
  });

  // Stale Tokens entfernen
  const toDelete: string[] = [];
  res.responses.forEach((r, idx) => {
    if (!r.success) {
      const code = r.error?.code || '';
      // registration-token-not-registered, invalid-argument etc.
      if (
        code.includes('registration-token-not-registered') ||
        code.includes('invalid-argument')
      ) {
        toDelete.push(tokens[idx].token);
      }
    }
  });
  if (toDelete.length) {
    await prisma.pushToken.deleteMany({ where: { token: { in: toDelete } } });
  }

  return { sent: res.successCount, removed: toDelete.length };
}

export async function sendPushToAdmins(payload: PushPayload, role: Role) {
  const admins = await prisma.user.findMany({
    where:
      role === 'ADMIN'
        ? { role: 'ADMIN' }
        : role === 'MANAGER'
        ? { OR: [{ role: 'ADMIN' }, { role: 'MANAGER' }] }
        : { role: 'ADMIN' },
    select: { id: true },
  });
  let sent = 0,
    removed = 0;
  for (const a of admins) {
    const r = await sendPushToUser(a.id, payload);
    sent += r.sent;
    removed += r.removed;
  }
  return { sent, removed };
}

export async function trySendPushToAdmins(
  payload: PushPayload,
  userId: string,
  shiftId: string,
  kind: string,
  role: Role
) {
  const already = await prisma.shiftNotifyLog.findUnique({
    where: {
      userId_shiftId_kind: {
        userId,
        shiftId,
        kind,
      },
    },
  });
  if (!already) {
    await sendPushToAdmins(payload, role);
    await prisma.shiftNotifyLog.create({
      data: {
        userId,
        shiftId,
        kind,
      },
    });
  }
}
