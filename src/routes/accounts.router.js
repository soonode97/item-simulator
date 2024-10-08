import express from 'express';
import { prisma } from '../utils/prisma/index.js';
import { Prisma } from '@prisma/client';
import bcrypt from 'bcrypt';
import { createAccessToken } from '../utils/tokens/tokens.js';

const router = express.Router();

/** 계정 생성 API */
router.post('/accounts/regist', async (req, res, next) => {
    try {
        // 유저의 아이디와 패스워드를 받아온다
        const { userId, password, confirmPassword, name, age } = req.body;

        // 유저아이디에 영어소문자와 숫자만 포함되어 있는지 체크하기 위한 정규표현식
        const regex = /^[a-z0-9]+$/;

        // 유저아이디가 영어 소문자와 숫자 외에 입력되어 있다면 error
        if (!regex.exec(userId)) {
            return res.status(400).json({ errorMessage: '아이디는 영어 소문자와 숫자만 포함할 수 있습니다.' });
        }

        if (password.length < 6) {
            return res.status(400).json({ errorMessage: '비밀번호는 6자 이상으로 설정해야 합니다.' });
        }

        if (password !== confirmPassword) {
            return res.status(400).json({ errorMessage: '비밀번호가 서로 일치하지 않습니다.' });
        }

        // userId가 이미 존재하는지 확인한다
        const isExistUser = await prisma.accounts.findFirst({ where: { userId: userId } });

        if (isExistUser) {
            return res
                .status(409)
                .json({ errorMessage: '이미 존재하는 유저의 아이디입니다. 다른 아이디를 입력해주세요.' });
        }

        // bcrypt를 이용하여 hashedPassword를 통해 전달받은 Password를 인코딩하여 저장한다
        const hashedPassword = await bcrypt.hash(password, 10);

        // account 혹은 accountInfo가 제대로 생성되지 않았을 경우 생성되지 않도록 트랜잭션을 걸어준다.
        // 만약 제대로 생성되지 않았을 경우 err를 반환하게끔 되어있어 catch에서 받게 된다.
        const [account, accountInfo] = await prisma.$transaction(
            async (tx) => {
                const account = await tx.accounts.create({
                    data: {
                        userId: userId,
                        password: hashedPassword,
                    },
                });

                const accountInfo = await tx.accountInfos.create({
                    data: {
                        accountsId: +account.accountsId,
                        name: name,
                        age: age,
                    },
                });

                return [account, accountInfo];
            },
            {
                // ReadCommitted로 격리 수준을 정해준다
                isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
            },
        );

        return res
            .status(201)
            .json({
                message: '회원가입이 완료되었습니다.',
                data: { userId: account.userId, name: accountInfo.name, age: accountInfo.age },
            });
    } catch (err) {
        next(err);
    }
});

/** 계정 로그인 및 JWT 발급 API */
router.post('/accounts/log-in', async (req, res, next) => {
    // 아이디와 패스워드를 body 데이터로 받습니다
    const { userId, password } = req.body;

    // userId의 계정이 있는지 조회합니다
    const account = await prisma.accounts.findFirst({ where: { userId } });

    // userId가 없다면 존재하지 않는 계정으로 응답해줍니다
    if (!account) {
        return res.status(401).json({ errorMessage: '아이디가 존재하지 않습니다.' });
    }

    // bcrypt로 인코딩한 password를 디코딩하여 받은 password와 일치하는지 확인합니다
    if (!(await bcrypt.compare(password, account.password))) {
        return res.status(401).json({ errorMessage: '비밀번호가 일치하지 않습니다.' });
    }

    // .env에 저장한 액세스 키를 가져와 액세스 토큰을 생성한다.
    const accessToken = createAccessToken(account.accountsId);

    // res.cookie('authorization', `Bearer ${accessToken}`); // Access Token을 Cookie에 전달한다.

    return res.status(200).json({ message: '로그인에 성공하였습니다.', data: { userId }, accessToken: accessToken });
});

/** 계정 로그아웃 API */
/** 클라이언트에서 쿠키를 전달하지 않으면서 작동의미가 없어진 API */
// router.get('/accounts/log-out', (req, res, next) => {
//     // 이미 로그인 중이라면 로그아웃을 하여 쿠키를 삭제하도록 한다.
//     // 쿠키가 남아있으면 인증 인가 하는 부분에서 계정아이디가 혼동될 수 있기 때문이다
//     res.clearCookie('refreshToken');
//     res.clearCookie('authorization');

//     return res.status(200).json({ message: '로그아웃 하였습니다.' });
// });

export default router;
