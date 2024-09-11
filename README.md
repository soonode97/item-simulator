# item-simulator
REST API를 활용한 CRUD 아이템 시뮬레이터

## 1. 프로젝트 기능과 목적
해당 프로젝트는 Node.js 기반으로 express.js의 REST API를 활용하여 계정, 캐릭터, 아이템을 생성하고 장착하여 장착 시뮬레이션을 할 수 있습니다.

## 2. 설치 방법

### 2-1. 패키지 설치

## 3. 질의 응답
### 3-1. 암호화 방식

#### 비밀번호를 DB에 저장할 때 Hash를 이용했는데, Hash는 단방향 암호화와 양방향 암호화 중 어떤 암호화 방식에 해당할까요?

Hash는 단방향 암호화 방식에 해당합니다. 어떠한 값을 암호화된 문장으로 변환해주며 복호화가 불가합니다.

양방향 암호화는 암호화된 문장으로 변환도 해주지만 다시 원래 문장으로 되돌려주는 복호화기능도 수행하는 점이 다릅니다.

이 프로젝트에서는 bcrypt를 통해 단방향 암호화를 하였지만 bcrypt의 compare()라는 메서드를 통해 사용자가 전달한 비밀번호와 서버에 저장된 비밀번호가 일치하는지 확인하였습니다.


#### 비밀번호를 그냥 저장하지 않고 Hash 한 값을 저장 했을 때의 좋은 점은 무엇인가요?

비밀번호는 사용자만 알고 있어야 하는 중요한 값입니다. 

비밀번호를 그대로 저장할 경우 외부에서 보거나 가로챘을 경우 알기 쉽기 때문에 Hash 같은 암호화 기법을 사용하여 값을 감추어줘야 더 안전해집니다.


### 3-2. 인증 방식

#### JWT(Json Web Token)을 이용해 인증 기능을 했는데, 만약 Access Token이 노출되었을 경우 발생할 수 있는 문제점은 무엇일까요?

Access Token이 노출되었을 경우에는 다른 사용자가 클라이언트에 접속하여 권한을 받을 수 있는 치명적인 문제가 발생할 수 있습니다.

때문에 jwt 토큰을 발급할 때에는 2번째 파라미터로 전달한 비밀 키를 반드시 감춰놓을 필요가 있으며 해당 키를 통해 인증확인을 거치도록 합니다.


### 3-3. 인증과 인가

#### 인증과 인가가 무엇인지 각각 설명해 주세요.

1. 인증

인증은 요청을 하는 클라이언트인 애플리케이션에서 특정 API에 접속하려고 할 때, 유효한 사용자인지 확인하는 것을 의미합니다. 

여기서 유효함은 사용자의 아이디와 비밀번호가 맞는지, 유효한 데이터인지 확인하는 과정을 거칩니다.

2. 인가

인가는 애플리케이션에서 특정 API에 요청하여 응답을 받으려고 할 때 권한이 있는지 확인하는 과정을 의미합니다.

여기서는 보내는 사용자의 세션과 토큰이 유효한지 확인하고, 서버에 저장된 사용자의 정보와 확인하여 유효성을 검증합니다.


#### 위 API 구현 명세에서 인증을 필요로 하는 API와 그렇지 않은 API의 차이가 뭐라고 생각하시나요?

인증을 필요로하는 API의 경우 특정 사용자의 데이터를 변경하거나 민감한 데이터를 조회하는 부분이라고 생각합니다.

캐릭터 검색은 누구나 할 수 있지만 해당 캐릭터의 창고에 돈이 얼마나 있는지, 캐릭터 개수가 몇개인지처럼 민감한 부분은 사용자 인증을 거쳐서 숨길 수 있고,

사용자의 장착, 판매, 구매 등 특정 데이터의 변경이 필요한 경우에도 다른 사용자가 함부로 조작할 수 없도록 인가 과정을 거쳐야 합니다.

#### 아이템 생성, 수정 API는 인증을 필요로 하지 않는다고 했지만 사실은 어느 API보다도 인증이 필요한 API입니다. 왜 그럴까요?

아이템 생성, 수정 API의 경우 게임 내 경제 시스템에 직접적인 영향을 끼칠 수 있는 민감한 API입니다.
함부로 조작되거나 사용이 될 경우 게임 내의 전체적인 밸런스가 무너지기 때문에 현재는 별도의 인증이 없이 생성 및 수정을 하였지만 반드시 조작 권한 인증 및 인가를 받아서 실행될 수 있도록 구현되어야 합니다. 

### 3-4. Http Status Code

#### 과제를 진행하면서 사용한 Http Status Code를 모두 나열하고, 각각이 의미하는 것과 어떤 상황에 사용했는지 작성해 주세요.

1. 200 - 데이터 변경 없이 정상적인 응답을 받아온 경우에 사용했습니다.
2. 201 - 데이터의 변경이 이루어지고 정상적인 응답을 받아온 경우에 사용했습니다.
3. 400 - 요청 시 특정 데이터의 값이 서버에 존재하지 않거나 구문이 잘못된 경우에 사용했습니다.
4. 401 - 요청 시 사용자 인증이 유효하지 않을 경우에 사용했습니다.
5. 404 - 요청한 리소스를 찾을 수 없을 때 사용했습니다.
6. 409 - 요청한 리소스가 이미 존재하여 충돌이 일어난 경우 사용했습니다.
7. 500 - 내부적으로 서버 처리 중 오류가 발생한 경우 사용했습니다.

### 3-5. 게임 경제

#### 현재는 간편한 구현을 위해 캐릭터 테이블에 money라는 게임 머니 컬럼만 추가하였습니다. 어떤 단점과 다른 구현방법은 어떤게 있을까요?

1. 재화의 다양성 부족
현재 money라는 게임 머니만 사용하다보니 플레이어의 선택이 제한되어 전략성이 줄어들고 단조로워질 수 있습니다. 강화를 위한 강화석, 던전 입장을 위한 입장권처럼 게임 머니는 아니지만 게임 머니로 가치를 환산할 수 있는 다른 재화의 종류를 늘려주면 선택의 자유도를 높여 몰입감을 높일 수 있을 것 같습니다.

2. 밸런스 문제
게임 머니로만 운영되는 게임은 게임 머니를 많이 획득하는 특정 유저가 상대적으로 쉽게 성장하고 이는 공정성에서 문제가 될 수 있다고 생각합니다.

3. 인플레이션 문제
게임 머니를 얻기 쉬워질수록 게임 머니의 가치가 떨어질 수 있는 우려가 있습니다. 이는 게임 내 경제에서 사용할 수 있는 재화의 단순화에서도 문제점을 잡을 수 있을 거 같습니다. 게임 머니로만 경제가 이루어진다면 단순한 만큼 게임 밸런스도 쉽게 무너질 수 있다고 생각합니다.


#### 아이템 구입 시에 가격을 클라이언트에서 입력하게 하면 어떠한 문제점이 있을 수 있을까요?

1. 예외 처리 문제
클라이언트에서 요청한 가격대로 응답을 주게 된다면 실수로 요청한 사용자 혹은 다른 사용자의 공격에 문제가 될 수 있습니다.

2. 불필요한 요청
클라이언트에서 아이템의 가격까지 요청할 필요는 없다고 생각합니다. 그러기 위해 필요한 리소스를 최대한 줄이고 서버에 저장된 데이터를 불러 자동으로 계산할 수 있도록 하는게 좋을 것 같습니다.
또한 클라이언트에서 요청한 가격과 실제 서버에서 저장된 아이템의 가격*수량을 계산하는 과정도 생략할 수 있기 때문에 불필요하다고 생각합니다.

## 4. 어려웠던 점

1. API 요청과 응답을 보낼 때, 어떤 데이터를 요청하고 그 데이터를 기준으로 어떠한 비즈니스 로직을 처리하는게 효율적일지 고민하는 과정이 어려웠습니다.

머리로는 이런 방향으로 하면되겠다! 싶은 부분이 있어도 중간에 수정한 부분이 있고, 효율적인 비즈니스 로직을 어느정도는 머리로 알고 있어야 스키마 작업도 수월하다고 생각이 들었습니다.

데이터의 저장 방식도 서버 성능에 영향을 많이 주기 때문에 실제 구현보다는 설계하는 부분에서 제일 고민하고 어려움을 느꼈습니다.

2. 명세서에서 인증 미들웨어 부분에 대해 정확한 이해가 어려웠습니다.

Authorization 헤더로만 JWT를 전달한다는 의미가 어떤 방식으로 전달이 되는 것인지, 또한 insomnia API 클라이언트를 통해 테스트를 계속 했지만 이 insomnia가 작동하는 방식 자체도 이해를 못하고 있어서 어떻게 전달해야 Authorization 헤더로만 전달할 수 있을까??

라는 의문점이 계속 들었습니다. 지금은 해결했지만 이렇게 하는게 맞는지 궁금하면서도 어려웠던 부분이었습니다.