import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prismadb';
import { getCurrentUser, hasRole } from '@/lib/auth';
import {
  approveChangeRequest,
  isValidStatus,
  rejectChangeRequest,
} from '@/lib/changeRequest';
import { isOk } from '@/lib/apiResponse';

export default async function handle(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { ok, user, error } = await getCurrentUser(req);
  if (!ok) return res.status(401).json({ error });

  if (!hasRole(user, 'MANAGER'))
    return res.status(401).json({ error: 'Not Authorized' });

  const { changeRequestId } = req.query;
  if (typeof changeRequestId !== 'string')
    return res.status(401).json({ error: 'ID required' });

  if (req.method === 'PUT') {
    await handlePUT(req, res, changeRequestId);
  } else {
    throw new Error(
      `The HTTP ${req.method} method is not supported at this route.`
    );
  }
}

async function handlePUT(
  req: NextApiRequest,
  res: NextApiResponse,
  id: string
) {
  const { status } = req.body;
  if (!isValidStatus(status))
    return res.status(401).json({ error: 'Invalid Status' });

  if (status == 'APPROVED') {
    const response = await approveChangeRequest(id);
    if (isOk(response)) {
      return res.status(201).json(response.changeRequest);
    } else {
      return res.status(401).json({ error: response.error });
    }
  } else if (status == 'REJECTED') {
    const response = await rejectChangeRequest(id);
    return res.status(201).json(response.changeRequest);
  }
}
