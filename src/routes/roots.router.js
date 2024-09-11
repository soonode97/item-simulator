// 각종 획득에 관련된 API를 제공하는 라우터입니다.
import express from 'express';
import { prisma } from '../utils/prisma/index.js';
import authMiddleware from '../../middlewares/auth.middleware.js';

const router = express.Router();

router.get('/roots/:charactersId', authMiddleware, async (req, res, next) => {
    const { charactersId } = req.params;
    const { accountsId } = req.user;

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
        return res.status(403).json({ errorMessage: '계정 권한이 없어 획득이 불가합니다.' });
    }

    await prisma.characterInfos.update({
        where: { charactersId: character.charactersId },
        data: { money: { increment: 1000 } },
    });

    return res.status(200).json({ message: '캐릭터에 1000 골드가 지급되었습니다.'});
});

export default router;