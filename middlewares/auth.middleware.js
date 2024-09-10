import {prisma} from '../src/utils/prisma/index.js';
import { createAccessToken, validateToken } from '../src/utils/tokens/tokens.js';

export default async function (req, res, next) {
    try {
        // request 헤더로 전달받은 authorization 쿠키를 받아온다.
        const authorization = req.headers["authorization"];
        
        // access token이 만료되어 authorization의 값이 없다면 token 재발급을 요청한다.
        // 만약 refresh token도 만료되었다면 사용자 인증 만료 에러메시지를 발생시킨다.
        if(!authorization) {

            const {authorization} = async function (req, res, next) {
                const {refreshToken} = req.cookies;
                
                if(!refreshToken) {
                    throw new Error('사용자 인증이 만료되어 로그인이 필요합니다.');
                }

                // 리프레시 토큰의 값이 유효한지 확인
                const payload = validateToken(refreshToken, process.env.MY_SECRET_REFRESH_KEY);
                
                if(payload === null) {
                    throw new Error('유효한 토큰이 아닙니다.');
                }

                const userInfo = prisma.tokenStorage.findFirst({
                    where: {accountsId: accountsId,
                        expiredAt: {
                            gt: Date.now()
                        }
                    }
                });

                if(!userInfo) {
                    throw new Error('유효한 refresh token이 없습니다.');
                }

                const newAccessToken = createAccessToken(userInfo.userId);

                // res.cookie('authorization', `Bearer ${newAccessToken}`);
                
                console.log('message: Access Token을 정상적으로 새롭게 발급했습니다.');
            }
        }

        // authorization header 값에서 토큰 타입과 토큰을 분리한다.
        const [tokenType, token] = authorization.split(' ');
        
        // 토큰 타입이 Bearer 형태가 아니라면 토큰 타입 에러메시지를 발생시킨다.
        if(tokenType !== 'Bearer') {
            throw new Error('토큰의 타입이 Bearer가 아닙니다.');
        }

        // 액세스 토큰의 값이 유효한지 확인 후 Payload를 반환한다.
        const decodedToken = validateToken(token, process.env.MY_SECRET_ACCESS_KEY);

        // 반환받은 Payload가 값이 없다면 유효하지 않은 토큰 에러메시지를 발생시킨다.
        if(!decodedToken) {
            throw new Error('유효하지 않은 토큰입니다.')
        }

        // 반환받은 Payload에서 유저의 아이디를 저장한다.
        const accountsId = decodedToken.accountsId;

        // Payload의 유저아이디를 DB 유저에서 조회되는지 검색한다.
        const user = await prisma.accounts.findFirst({where:{accountsId:accountsId}})

        // DB에서 유저가 조회되지 않는 경우 사용자 ID가 존재하지 않는다는 에러메시지를 발생시킨다.
        if(!user) {
            throw new Error('사용자 ID가 존재하지 않습니다.');
        }

        // req.user에 DB에서 조회된 유저를 저장하여 다음 미들웨어에 보낸다.
        req.user = user;

        // 인증을 마친 후 다음 미들웨어 수행하도록 한다.
        next();
    }
    catch(err) {
        if(err.name === 'TokenExpiredError')
            return res.status(401).json({errorMessage: '토큰이 만료되었습니다. 로그인 해주세요.'});
        if(err.name === 'JsonWebTokenError')
            return res.status(401).json({errorMessage: '유효한 토큰이 아닙니다.'});
        return res.status(400).json({errorMessage: err.message});
    }
}