// 외부에서 서버에서 어떤 에러가 발생했는지 확인할 수 없도록 내부에서 에러가 발생했다는 응답만 주도록 한다. 
export default function (err, req, res, next) {
    console.log(err);

    res.status(500).json({message: '서버 내부에서 에러가 발생하였습니다.'});
}