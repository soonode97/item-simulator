import express from 'express';
import { prisma } from '../utils/prisma/index.js';
import { Prisma } from '@prisma/client';
import authMiddleware from '../../middlewares/auth.middleware.js';

const router = express.Router();

/** 캐릭터 생성 API */
router.post('/characters', authMiddleware, async (req, res, next) => {
    const { nickname } = req.body;
    const { accountsId } = req.user;

    const isExistCharacter = await prisma.characterInfos.findFirst({
        where: { nickname: nickname },
    });

    if (isExistCharacter) {
        return res.status(409).json({ errorMessage: '이미 존재하는 캐릭터명입니다.' });
    }

    await prisma.$transaction(
        async (tx) => {
            const character = await tx.characters.create({
                data: {
                    accountsId: +accountsId,
                },
            });

            const characterInfo = await tx.characterInfos.create({
                data: {
                    charactersId: character.charactersId,
                    nickname: nickname,
                },
            });

            const inventory = await tx.inventories.create({
                data: {
                    charactersId: character.charactersId,
                },
            });

            const inventoryInfo = await tx.inventoryInfos.create({
                data: {
                    inventoriesId: inventory.inventoriesId,
                    name: 'Basic_Inventory',
                    size: 100,
                },
            });
        },
        {
            isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
        },
    );

    return res.status(201).json({ message: `${nickname} 캐릭터 생성이 완료되었습니다.` });
});

/** 캐릭터 상세 조회 API */
router.get('/characters/:charactersId', authMiddleware, async (req, res, next) => {
    try {
        const { accountsId } = req.user;
        const { charactersId } = req.params;

        if(isNaN(charactersId) || !Number.isInteger(Number(charactersId))) {
            return res.status(400).json({ errorMessage: '데이터의 형식이 올바르지 않습니다.' });
        }
        
        const character = await prisma.characters.findFirst({
            where: { charactersId: +charactersId },
        });

        if (!character) {
            return res.status(401).json({ errorMessage: '캐릭터가 존재하지 않습니다.' });
        }

        const characterInfo = await prisma.characterInfos.findFirst({
            where: { charactersId: +charactersId },
        });

        if (character.accountsId !== +accountsId) {
            return res.status(200).json({
                character: {
                    charactersId: character.charactersId,
                },
                characterInfo: {
                    nickname: characterInfo.nickname,
                    health: characterInfo.health,
                    power: characterInfo.power,
                },
            });
        }

        return res.status(200).json({
            character: {
                charactersId: character.charactersId,
            },
            characterInfo: {
                nickname: characterInfo.nickname,
                health: characterInfo.health,
                power: characterInfo.power,
                money: characterInfo.money,
            },
        });
    } catch (err) {
        next(err);
    }
});

/** 캐릭터 삭제 API */
router.delete('/characters/:charactersId', authMiddleware, async (req, res, next) => {
    try {
        const { charactersId } = req.params;
        const { accountsId } = req.user;

        if(isNaN(charactersId) || !Number.isInteger(Number(charactersId))) {
            return res.status(400).json({ errorMessage: '데이터의 형식이 올바르지 않습니다.' });
        }

        const character = await prisma.characters.findFirst({
            where: { charactersId: +charactersId },
        });

        if (!character) {
            return res.status(400).json({ errorMessage: '캐릭터가 존재하지 않습니다.' });
        }

        if (character.accountsId !== accountsId) {
            return res.status(401).json({ errorMessage: '계정 권한이 없어 캐릭터 삭제가 불가합니다.' });
        }

        await prisma.characters.delete({
            where: {
                charactersId: +charactersId,
            },
        });

        return res.status(201).json({ message: `캐릭터가 정상적으로 삭제되었습니다.` });
    } catch (err) {
        next(err);
    }
});

export default router;
