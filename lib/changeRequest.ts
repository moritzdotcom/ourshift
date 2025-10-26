import { ChangeStatus, Prisma } from '@/generated/prisma';
import prisma from '@/lib/prismadb';
import { failureResp, successResp } from './apiResponse';

export function isValidStatus(s: any): s is ChangeStatus {
  if (typeof s == 'string') {
    if (['PENDING', 'APPROVED', 'REJECTED'].includes(s)) return true;
  }
  return false;
}

export function validStatus(s: any): ChangeStatus {
  return isValidStatus(s) ? s : 'PENDING';
}

export async function approveChangeRequest(id: string) {
  const req = await prisma.changeRequest.findFirst({ where: { id } });
  if (!req) return failureResp('changeRequest', undefined, 'Invalid ID');
  const updated = await prisma.changeRequest.update({
    where: { id },
    data: {
      status: 'APPROVED',
      shift: {
        update: {
          clockIn: req.clockIn,
          clockOut: req.clockOut,
        },
      },
    },
    include: {
      shift: true,
    },
  });
  return successResp('changeRequest', updated);
}

export async function rejectChangeRequest(id: string) {
  const updated = await prisma.changeRequest.update({
    where: { id },
    data: {
      status: 'REJECTED',
    },
    include: {
      shift: true,
    },
  });
  return successResp('changeRequest', updated);
}
