import express from 'express';
import cookieParser from 'cookie-parser';
import AccountRouter from './routes/accounts.router.js';
import CharacterRouter from './routes/characters.router.js';
import ItemsRouter from './routes/items.router.js';
import InventoriesRouter from './routes/inventories.router.js';
import EquipmentsRouter from './routes/equipments.router.js';
import RootsRouter from './routes/roots.router.js';
import errorHandlingMiddleware from '../middlewares/error-handling.middleware.js'

const app = express();
const PORT = process.env.MY_PORT;

app.use(express.json());
app.use(cookieParser());

app.use('/api', [AccountRouter, CharacterRouter, ItemsRouter, InventoriesRouter, EquipmentsRouter, RootsRouter]);
// 위 API 요청 진행 중 catch(err)를 받은 경우 next() 메서드를 통해 에러 핸들링 미들웨어를 호출하도록 한다.
app.use(errorHandlingMiddleware);

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});