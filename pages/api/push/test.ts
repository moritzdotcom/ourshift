import { getCurrentUserId } from '@/lib/auth';
import { sendPushToUser } from '@/lib/push';
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { ok, userId } = await getCurrentUserId(req);
  if (!ok) return res.status(401).end();

  setTimeout(
    async () =>
      await sendPushToUser(userId, {
        title: 'Testbenachrichtigung',
        body: 'So wird deine Schichterinnerung aussehen.',
        link: '/kiosk',
        tag: 'test-push',
      }),
    5000
  );

  res.json({ ok: true });
}
