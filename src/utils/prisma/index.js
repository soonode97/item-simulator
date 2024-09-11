/** Prisma를 모든 라우터에서 사용이 가능하도록 생성한 파일 */

import { PrismaClient } from "@prisma/client";

// PrismaClient 인스턴스를 생성
export const prisma = new PrismaClient({
    // Prisma를 이용해 데이터베이스를 접근할 때, SQL을 출력해준다.
    log: ['info', 'warn', 'error'],

    // 에러 메시지를 평문이 아닌, 개발자가 읽기 쉬운 형태로 보여준다.
    errorFormat: 'pretty',
});