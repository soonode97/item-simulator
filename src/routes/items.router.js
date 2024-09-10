import express from 'express';
import { prisma } from '../utils/prisma/index.js';
import { Prisma } from '@prisma/client';
import authMiddleware from '../../middlewares/auth.middleware.js';

const router = express.Router();

/** 아이템 생성 API */
router.post('/items', async (req, res, next) => {
  try {
    const { item_name, item_part, item_stat, item_price, item_desc } = req.body;

    const isExistItem = await prisma.items.findFirst({ where: { item_name } });

    if (isExistItem) {
      return res.status(409).json({ errorMessage: '이미 등록된 아이템입니다.' });
    }

    const item = await prisma.items.create({
      data: {
        item_name,
        item_part,
        item_stat,
        item_price,
        item_desc,
      },
    });

    return res.status(201).json({ message: '아이템 생성이 완료되었습니다.' });
  } catch (err) {
    next(err);
  }
});

/** 아이템 수정 API */
router.patch('/items/:item_code', async (req, res, next) => {
  const { item_code } = req.params;
  const updateData = req.body;

  if (updateData.money !== undefined) {
    return res.status(401).json({ errorMessage: '가격수정은 불가능합니다.' });
  }

  const curItem = await prisma.items.findUnique({
    where: { item_code: +item_code },
  });

  if (!curItem) {
    return res.status(401).json({ errorMessage: '존재하지 않는 아이템입니다.' });
  }

  await prisma.$transaction(
    async (tx) => {
      await tx.items.update({
        data: { ...updateData },
        where: { item_code: +item_code },
      });

      for (let key in updateData) {
        if (curItem[key] !== updateData[key]) {
          if (typeof updateData[key] === Object) {
            updateData[key] = JSON.stringify(updateData[key]);
          }
          await tx.itemHistories.create({
            data: {
              item_code: +item_code,
              changedField: key,
              oldValue: String(curItem[key]),
              newValue: String(updateData[key]),
            },
          });
        }
      }
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
    },
  );

  return res.status(200).json({ message: '아이템 정보 변경에 성공하였습니다.' });
});

/** 아이템 목록 조회 API */
router.get('/items', async (req, res, next) => {
  const items = await prisma.items.findMany({
    select: {
      item_code: true,
      item_name: true,
      item_price: true,
    },
  });

  if (!items.length < 0) {
    return res.status(401).json({ errorMessage: '아이템이 존재하지 않습니다.' });
  }

  return res.status(200).json({ data: items });
});

/** 아이템 상세 조회 API */
router.get('/items/:item_code', async (req, res, next) => {
  const { item_code } = req.params;
  const item = await prisma.items.findUnique({
    select: {
      item_code: true,
      item_name: true,
      item_part: true,
      item_stat: true,
      item_price: true,
      item_desc: true,
    },
    where: { item_code: +item_code },
  });

  if (!item) {
    return res.status(401).json({ errorMessage: '존재하지 않는 아이템입니다.' });
  }

  return res.status(200).json({ data: item });
});

export default router;
