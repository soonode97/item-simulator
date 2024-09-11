import express from 'express';
import { prisma } from '../utils/prisma/index.js';
import { Prisma } from '@prisma/client';
import authMiddleware from '../../middlewares/auth.middleware.js';

const router = express.Router();

/** 캐릭터 장착 API */
router.post('/equipments/equip/:charactersId', authMiddleware, async (req, res, next) => {
    const { accountsId } = req.user;
    const { charactersId } = req.params;
    const { item_code } = req.body;

    if(isNaN(charactersId) || !Number.isInteger(Number(charactersId))) {
        return res.status(400).json({ errorMessage: '데이터의 형식이 올바르지 않습니다.' });
    }

    // 동일한 계정 권한 인증 절차
    const character = await prisma.characters.findFirst({
        where: { charactersId: +charactersId },
    });

    if (!character) {
        return res.status(400).json({ errorMessage: '캐릭터가 존재하지 않습니다.' });
    }

    if (character.accountsId !== accountsId) {
        return res.status(401).json({ errorMessage: '계정 권한이 없어 장비 장착이 불가합니다.' });
    }

    // 아이템이 DB에 존재하는지 확인
    const item = await prisma.items.findFirst({ where: { item_code } });
    if (!item) {
        return res.status(400).json({ errorMessage: '해당 아이템이 존재하지 않습니다.' });
    }

    // 장착 가능한 아이템인지 확인
    if (item.item_part === 'none' || item.item_part === 'consumable') {
        return res.status(400).json({ errorMessage: '해당 아이템은 장착 불가능한 아이템입니다.' });
    }

    // 인증을 받은 캐릭터의 인벤토리에서 아이템 존재 여부 확인
    const inventory = await prisma.inventories.findFirst({ where: { charactersId: character.charactersId } });
    const inventoryItem = await prisma.inventoryItems.findFirst({
        where: { inventoriesId: inventory.inventoriesId, item_code: item_code },
    });
    if (!inventoryItem) {
        return res.status(404).json({ errorMessage: '인벤토리에 해당 아이템이 존재하지 않습니다.' });
    }

    // 캐릭터의 장비 착용 여부 확인
    const isEquipped = await prisma.equipments.findFirst({
        where: { charactersId: character.charactersId, item_part: item.item_part },
    });

    if (isEquipped) {
        return res.status(500).json({ errorMessage: '이미 장착된 아이템이 있습니다.' });
    }

    await prisma.$transaction(
        async (tx) => {
            // 캐릭터의 equipments 테이블에 아이템 부위에 해당 아이템을 장착하도록 한다.
            await tx.equipments.create({
                data: {
                    item_part: item.item_part,
                    item_code: item.item_code,
                    item_name: item.item_name,
                    charactersId: character.charactersId,
                },
            });

            // 캐릭터의 inventoryItems 테이블에서 해당 아이템의 item_quantity(개수)를 -1 줄여준다.
            await tx.inventoryItems.update({
                data: { item_quantity: { decrement: 1 } },
                where: { inventoryItemsId: inventoryItem.inventoryItemsId },
            });

            // 캐릭터의 characterInfos 테이블에서 item_stat에 맞게 health와 power를 증가시켜준다.
            await tx.characterInfos.update({
                data: {
                    health: { increment: item.item_health },
                    power: { increment: item.item_power },
                },
                where: { charactersId: +charactersId },
            });
        },
        {
            isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
        },
    );

    return res.status(201).json({ message: `캐릭터에 ${item.item_name}을 장착하였습니다.` });
});

/** 캐릭터 아이템 탈착 API */
router.post('/equipments/unequip/:charactersId', authMiddleware, async (req, res, next) => {
    const { accountsId } = req.user;
    const { charactersId } = req.params;
    const { item_code } = req.body;

    if(isNaN(charactersId) || !Number.isInteger(Number(charactersId))) {
        return res.status(400).json({ errorMessage: '데이터의 형식이 올바르지 않습니다.' });
    }

    // 동일한 계정 권한 인증 절차
    const character = await prisma.characters.findFirst({
        where: { charactersId: +charactersId },
    });

    if (!character) {
        return res.status(400).json({ errorMessage: '캐릭터가 존재하지 않습니다.' });
    }

    if (character.accountsId !== accountsId) {
        return res.status(401).json({ errorMessage: '계정 권한이 없어 장비 해제가 불가합니다.' });
    }

    // 아이템이 DB에 존재하는지 확인
    const item = await prisma.items.findFirst({ where: { item_code } });
    if (!item) {
        return res.status(400).json({ errorMessage: '해당 아이템이 존재하지 않습니다.' });
    }

    // 인증을 받은 캐릭터의 인벤토리에서 아이템 존재 여부 확인
    const inventory = await prisma.inventories.findFirst({ where: { charactersId: character.charactersId } });
    const inventoryItem = await prisma.inventoryItems.findFirst({
        where: { inventoriesId: inventory.inventoriesId, item_code: item_code },
    });

    // 캐릭터의 장비 착용 여부 확인
    const isEquipped = await prisma.equipments.findFirst({
        where: { charactersId: character.charactersId, item_code: item.item_code },
    });

    if (!isEquipped) {
        return res.status(500).json({ errorMessage: '장착된 아이템이 아닙니다.' });
    }

    await prisma.$transaction(
        async (tx) => {
            // 캐릭터의 equipments 테이블에 장착한 아이템의 데이터를 삭제한다.
            await tx.equipments.delete({
                where: {equipmentsId: isEquipped.equipmentsId}
            });

            // 캐릭터의 inventoryItems 테이블에서 해당 아이템의 item_quantity(개수)를 +1 늘려준다.
            await tx.inventoryItems.update({
                data: { item_quantity: { increment: 1 } },
                where: { inventoryItemsId: inventoryItem.inventoryItemsId },
            });

            // 캐릭터의 characterInfos 테이블에서 item_stat에 맞게 health와 power를 감소시켜준다.
            await tx.characterInfos.update({
                data: {
                    health: { decrement: item.item_health },
                    power: { decrement: item.item_power },
                },
                where: { charactersId: +charactersId },
            });
        },
        {
            isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
        },
    );

    return res.status(201).json({ message: `캐릭터에 ${item.item_name}을 해제하였습니다.` });
})

/** 캐릭터 장비 조회 API */
router.get('/equipments/:charactersId', async (req, res, next) => {
    const { charactersId } = req.params;
    
    if(isNaN(charactersId) || !Number.isInteger(Number(charactersId))) {
        return res.status(400).json({ errorMessage: '데이터의 형식이 올바르지 않습니다.' });
    }

    const character = await prisma.characters.findFirst({
        where: { charactersId: +charactersId },
    });

    if(!character) {
        return res.status(400).json({ errorMessage: '캐릭터가 존재하지 않습니다.' });
    }

    const equipments = await prisma.equipments.findMany({
        where: { charactersId: +charactersId },
        select: {
            item_code: true,
            item_name: true,
            item_part: true
        }
    });

    if(!equipments) {
        return res.status(400).json({ errorMessage: '캐릭터의 장비 목록이 존재하지 않습니다.' });
    }

    return res.status(200).json({data : equipments});
})

export default router;
