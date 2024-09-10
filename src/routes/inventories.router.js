import express from 'express';
import { prisma } from '../utils/prisma/index.js';
import { Prisma } from '@prisma/client';
import authMiddleware from '../../middlewares/auth.middleware.js';

const router = express.Router();

/** 아이템 구입 API */

router.post('/inventories/purchase/:charactersId', authMiddleware, async (req, res, next) => {
    const { accountsId } = req.user;
    const { charactersId } = req.params;
    const { item_code, item_quantity } = req.body;
  
    // 캐릭터가 현재 접속한 계정인지 검사
    const character = await prisma.characters.findUnique({
      where: { charactersId: +charactersId },
    });
    if(!character) {
        return res.status(401).json({ errorMessage: '캐릭터가 존재하지 않습니다.'});
    }
    if (character.accountsId !== accountsId) {
      return res.status(401).json({ errorMessage: '아이템을 구매할 권한이 없습니다.' });
    }
  
    // 인벤토리 여부 확인
    const inventory = await prisma.inventories.findFirst({ where: { charactersId: +charactersId } });
    if (!inventory) {
      return res.status(401).json({ errorMessage: '인벤토리가 존재하지 않습니다.' });
    }
  
    // 존재하는 아이템인지 확인
    const item = await prisma.items.findFirst({ where: { item_code: +item_code } });
    if (!item) {
      return res.status(401).json({ errorMessage: '존재하지 않는 아이템입니다.' });
    }
  
    // 소지한 금액 확인
    const characterInfo = await prisma.characterInfos.findFirst({ where: { charactersId: +charactersId } });
    if (characterInfo.money < item.item_price) {
      return res.status(401).json({ errorMessage: '소지하고 있는 골드가 부족합니다.' });
    }
  
    // 인벤토리에 아이템을 보유하는지 확인하고 여부에 따라 create와 update를 수행하도록 함
    const inventoryItem = await prisma.inventoryItems.findFirst({
      where: {
        inventoriesId: inventory.inventoriesId,
        item_code: +item_code,
      },
    });
  
    if (!inventoryItem) {
      await prisma.$transaction(
        async (tx) => {
          await tx.inventoryItems.create({
            data: {
              item_code: +item_code,
              item_name: item.item_name,
              item_quantity: +item_quantity,
              inventoriesId: inventory.inventoriesId,
            },
          });
  
          await tx.characterInfos.update({
            data: { money: { decrement: item.item_price } },
            where: { charactersId: +charactersId },
          });
        },
        {
          isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
        },
      );
    } else {
      await prisma.$transaction(
        async (tx) => {
          await tx.inventoryItems.update({
            data: { item_quantity: { increment: +item_quantity } },
            where: { inventoryItemsId: inventoryItem.inventoryItemsId, item_code: +item_code },
          });
  
          await tx.characterInfos.update({
            data: { money: { decrement: item.item_price } },
            where: { charactersId: +charactersId },
          });
        },
        {
          isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
        },
      );
    }
  
    return res.status(201).json({ message: '아이템 구매에 성공하였습니다.' });
  });
  
  
  router.post('/inventories/sell/:charactersId', authMiddleware, async (req, res, next) => {
    const { accountsId } = req.user;
    const { charactersId } = req.params;
    const { item_code, item_quantity } = req.body;
  
    // 캐릭터가 현재 접속한 계정인지 검사
    const character = await prisma.characters.findUnique({
      where: { charactersId: +charactersId },
    });
  
    if (character.accountsId !== accountsId) {
      return res.status(401).json({ errorMessage: '아이템을 판매할 권한이 없습니다.' });
    }
  
    // 인벤토리 여부 확인
    const inventory = await prisma.inventories.findFirst({ where: { charactersId: +charactersId } });
    if (!inventory) {
      return res.status(401).json({ errorMessage: '인벤토리가 존재하지 않습니다.' });
    }
  
    const characterInfo = await prisma.characterInfos.findFirst({ where: { charactersId: +charactersId } });
    const item = await prisma.items.findFirst({ where: { item_code: +item_code } });
  
    // 존재하는 아이템인지 확인
    if (!item) {
      return res.status(401).json({ errorMessage: '존재하지 않는 아이템입니다.' });
    }
  
    // 판매할 아이템 개수 초과 확인 + 판매할 아이템 보유 여부 확인
    const inventoryItem = await prisma.inventoryItems.findFirst({
      where: {
        inventoriesId: inventory.inventoriesId,
        item_code: +item_code,
      },
    });
  
    if(!inventoryItem) {
      return res.status(500).json({errorMessage: '인벤토리에 판매할 아이템이 존재하지 않습니다.'})
    }
  
    if(inventoryItem.item_quantity < +item_quantity) {
      return res.status(500).json({errorMessage: '판매할 아이템의 개수가 초과되었습니다.'});
    }
  
    // 아이템 판매 로직 수행
    // 판매 가격은 원가의 60%로 적용
    const sellPrice = (item.item_price * 0.6) * item_quantity;
    await prisma.$transaction(
      async (tx) => {
        await tx.inventoryItems.update({
          data: { item_quantity: { decrement: +item_quantity } },
          where: { inventoryItemsId: inventoryItem.inventoryItemsId, item_code: +item_code },
        });
  
        await tx.characterInfos.update({
          data: { money: { increment: sellPrice } },
          where: { charactersId: +charactersId },
        });
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
      },
    );
  
    return res.status(201).json({message: '아이템이 판매되었습니다.',
      '보유 잔액': characterInfo.money+sellPrice
    })
  });

/** 인벤토리에 있는 아이템 목록 조회 API */
router.get('/inventories/:charactersId', authMiddleware, async (req, res, next) => {
    const {charactersId} = req.params;
    const {accountsId} = req.user;

    // 파라미터로 전달한 캐릭터가 접속한 캐릭터인지 확인
    const character = await prisma.characters.findFirst({
        where: {charactersId: +charactersId}
    });
    
    if(!character) {
        return res.status(401).json({errorMessage: '캐릭터가 존재하지 않습니다.'});
    }

    if(character.accountsId !== +accountsId) {
        return res.status(401).json({errorMessage: '계정 권한이 없습니다.'});
    }

    const inventory = await prisma.inventories.findFirst({where: {charactersId: +charactersId}});

    if(!inventory) {
        return res.status(401).json({errorMessage: '인벤토리가 존재하지 않습니다.'});
    }

    const inventoryItems = await prisma.inventoryItems.findMany({
        where: {inventoriesId: inventory.inventoriesId},
        select: {
            item_code :true,
            item_name : true,
            item_quantity: true
        }
    })

    return res.status(200).json({data : inventoryItems});
})

export default router;