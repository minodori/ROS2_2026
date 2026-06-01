# 4장. 서비스 — 요청/응답

> **학습 목표**
> - 서비스(service)의 요청–응답(request/response) 모델을 토픽과 구분해 설명한다.
> - `rclpy`/`rclcpp`로 서비스 서버·클라이언트를 작성한다.
> - 비동기 호출(`call_async`)의 흐름을 이해한다.
> - `ros2 service` CLI로 서비스를 호출·점검한다.

> **이번 장의 산출물**
> - 서비스 서버와 클라이언트를 작성한다.
> - 요청-응답 모델이 토픽과 어떻게 다른지 실행으로 확인한다.
>
> **공통 학습 흐름**: 개념 → 따라하기 → 코드 해설 → 실행 확인 → 버전/환경 체크 → 트러블슈팅 → 연습문제 → 마무리 점검

---

## 4.1 서비스란 — 한 번의 질문과 답

토픽이 *방송*이라면, 서비스는 *전화 통화*다. 클라이언트가 **요청**을 보내면, 서버가
처리해 **응답**을 돌려준다. 한 번의 요청에 한 번의 응답.

```text
[클라이언트] --요청(request)-->  [서버]
[클라이언트] <--응답(response)-- [서버]
```

| | 토픽 | 서비스 |
|---|---|---|
| 방향 | 단방향 | 양방향(요청·응답) |
| 횟수 | 계속 흐름 | 호출할 때 1회 |
| 용도 | 센서·명령 스트림 | 계산 요청, 상태 변경, 설정 |

**언제 서비스를 쓰나**: "이 값 더해줘", "맵 저장해줘", "LED 켜줘"처럼 *요청하고 결과를
받아야 하는* 일. 단, 오래 걸리는 작업은 5장의 **액션**이 더 낫다.

---

## 4.2 서비스 타입 — .srv

서비스 타입은 `---`로 요청부와 응답부를 나눈다. 표준 예제 `example_interfaces/AddTwoInts`:

```text
int64 a          # 요청(request)
int64 b
---
int64 sum        # 응답(response)
```

```bash
ros2 interface show example_interfaces/srv/AddTwoInts
```

---

## 4.3 [따라하기] Python 서비스 서버

`my_py_pkg/my_py_pkg/add_two_ints_server.py`:

```python
import rclpy
from rclpy.node import Node
from example_interfaces.srv import AddTwoInts


class AddTwoIntsServer(Node):
    def __init__(self):
        super().__init__("add_two_ints_server")
        self.server_ = self.create_service(
            AddTwoInts, "add_two_ints", self.callback_add)
        self.get_logger().info("서비스 서버 준비 완료")

    def callback_add(self, request, response):
        response.sum = request.a + request.b
        self.get_logger().info(f"{request.a} + {request.b} = {response.sum}")
        return response


def main(args=None):
    rclpy.init(args=args)
    node = AddTwoIntsServer()
    rclpy.spin(node)
    node.destroy_node()
    rclpy.shutdown()
```

`setup.py`에 등록 → 빌드. 서버는 호출을 기다린다. CLI로 바로 테스트할 수 있다:

```bash
ros2 service call /add_two_ints example_interfaces/srv/AddTwoInts "{a: 3, b: 5}"
# response: sum=8
```

---

## 4.4 [따라하기] Python 서비스 클라이언트

서버를 코드로 호출한다. 핵심은 **서버가 켜졌는지 기다리고**, **비동기로 호출**하는 것.

```python
import rclpy
from rclpy.node import Node
from example_interfaces.srv import AddTwoInts


class AddTwoIntsClient(Node):
    def __init__(self):
        super().__init__("add_two_ints_client")
        self.client_ = self.create_client(AddTwoInts, "add_two_ints")
        while not self.client_.wait_for_service(timeout_sec=1.0):
            self.get_logger().warn("서버 대기 중...")
        self.call_add(3, 5)

    def call_add(self, a, b):
        request = AddTwoInts.Request()
        request.a = a
        request.b = b
        future = self.client_.call_async(request)
        future.add_done_callback(self.callback_response)

    def callback_response(self, future):
        response = future.result()
        self.get_logger().info(f"결과: {response.sum}")


def main(args=None):
    rclpy.init(args=args)
    node = AddTwoIntsClient()
    rclpy.spin(node)
    node.destroy_node()
    rclpy.shutdown()
```

> ⚠️ **동기 호출의 함정**: `rclpy.spin_until_future_complete` 안에서 또 spin하는 구조로
> 잘못 짜면 교착(deadlock)이 난다. 입문 단계에서는 위처럼 **`call_async` + done_callback**
> 패턴을 권장한다.

---

## 4.5 C++ 서비스 서버 (요약)

```cpp
#include "rclcpp/rclcpp.hpp"
#include "example_interfaces/srv/add_two_ints.hpp"

class AddTwoIntsServer : public rclcpp::Node {
public:
    AddTwoIntsServer() : Node("add_two_ints_server") {
        server_ = this->create_service<example_interfaces::srv::AddTwoInts>(
            "add_two_ints",
            std::bind(&AddTwoIntsServer::callbackAdd, this,
                      std::placeholders::_1, std::placeholders::_2));
    }
private:
    void callbackAdd(
        const example_interfaces::srv::AddTwoInts::Request::SharedPtr req,
        const example_interfaces::srv::AddTwoInts::Response::SharedPtr res) {
        res->sum = req->a + req->b;
    }
    rclcpp::Service<example_interfaces::srv::AddTwoInts>::SharedPtr server_;
};
```

CMake에 `find_package(example_interfaces REQUIRED)` + `add_executable`/`install` 추가.

---

## 4.6 서비스 디버깅 CLI

```bash
ros2 service list                        # 서비스 목록
ros2 service type /add_two_ints          # 서비스 타입
ros2 service call /add_two_ints example_interfaces/srv/AddTwoInts "{a: 10, b: 20}"
ros2 interface show example_interfaces/srv/AddTwoInts
```

---

## 4.7 미리 보기 — 실전 서비스(2권 10장)

10장 "로봇 복제(Spawn)" 프로젝트에서는 **Gazebo의 스폰 서비스**(`/spawn_entity` 류)를
호출해 시뮬레이션에 로봇을 새로 띄운다. "요청하고 결과를 받는" 지금의 패턴이 그대로다 —
요청에 로봇 이름·좌표·URDF를 담아 보내면, 서버(Gazebo)가 로봇을 생성한다.

---

## 코드 해설 · 실행 확인 · 버전 체크

- **코드 해설 포인트**: `.srv`, `create_service`, `create_client`, `call_async`, callback의 역할을 해설한다.
- **실행 확인 포인트**: `ros2 service list/type/call`로 서비스 타입과 호출 결과를 확인한다.
- **버전/환경 체크**: Jazzy의 비동기 future 처리와 인터페이스 의존성 선언 방식을 기준으로 정리한다.

## 4.8 트러블슈팅

| 증상 | 원인 | 해결 |
|---|---|---|
| 클라이언트가 영원히 대기 | 서버 미실행/이름 불일치 | `ros2 service list`로 확인 |
| `call_async` 후 결과 없음 | spin 안 함 / 콜백 미등록 | `rclpy.spin` + `add_done_callback` |
| 타입 불일치 오류 | request 필드 오타 | `ros2 interface show`로 필드 확인 |
| 호출 시 멈춤(deadlock) | 콜백 내부 동기 호출 | 비동기 패턴으로 변경 |

---

## 4.9 연습문제

1. `AddTwoInts` 서버를 곱셈으로 바꾼 새 서비스를 만들어 보라(타입 그대로, 의미만 변경).
2. 클라이언트가 인자 두 개를 명령줄에서 받아 호출하도록 고쳐라(`sys.argv`).
3. `ros2 service call`로 서버를 직접 호출하고 응답을 확인하라.
4. 토픽과 서비스 중 무엇을 써야 하는 상황인지 5가지 예를 분류하라.

---

## 4.10 마무리 점검

- [ ] 서비스의 요청–응답 모델을 토픽과 비교해 설명할 수 있다.
- [ ] `.srv`의 `---` 구분 구조를 안다.
- [ ] 서버·클라이언트를 작성하고 `call_async` 흐름을 이해했다.
- [ ] `ros2 service` 명령으로 서비스를 호출·점검할 수 있다.

> **다음 장 예고** — 5장 **액션**. 오래 걸리는 작업을, 진행 상황(피드백)을 받으며,
> 중간에 취소도 할 수 있게 다룬다.

---

## 4.11 토픽 vs 서비스 — 선택 기준 정리

입문자가 가장 자주 헷갈리는 결정이다. 한 표로 못박아 둔다.

| 질문 | 토픽 | 서비스 |
|---|---|---|
| 응답이 필요한가? | 아니오 | 예 |
| 계속 흐르는 데이터인가? | 예(센서·명령) | 아니오(가끔 요청) |
| 오래 걸리는 작업인가? | — | **아니오**(오래 걸리면 액션) |
| 예시 | `/scan`, `/cmd_vel` | "두 수 더하기", "LED 켜기", "맵 저장" |

> 📌 판단 한 줄: **"한 번 묻고 곧 답을 받는다" → 서비스**, "계속 흐른다" → 토픽,
> "오래 걸리고 진행을 봐야 한다" → 액션(5장).

## 4.12 [워크드 예제] 곱셈 서비스 직접 만들기

`AddTwoInts` 타입(요청 a,b / 응답 sum)을 그대로 쓰되 동작만 곱셈으로 바꾼 서버를 만든다.
타입은 같으니 클라이언트·CLI 호출 방식도 동일하다.

```python
class MultiplyServer(Node):
    def __init__(self):
        super().__init__("multiply_server")
        self.create_service(AddTwoInts, "multiply", self.cb)

    def cb(self, request, response):
        response.sum = request.a * request.b      # 더하기 대신 곱하기
        self.get_logger().info(f"{request.a} * {request.b} = {response.sum}")
        return response
```

```bash
ros2 service call /multiply example_interfaces/srv/AddTwoInts "{a: 6, b: 7}"
# sum=42
```

같은 타입을 의미만 바꿔 재사용하는 감각 — 인터페이스와 구현이 분리돼 있기 때문에 가능하다.

## 4.13 연습문제 해설(요약)

- **1번** 위 4.12 `MultiplyServer`가 정답. 타입은 그대로, 콜백의 연산만 변경.
- **2번** 클라이언트 `main`에서 `import sys` 후 `a=int(sys.argv[1]); b=int(sys.argv[2])`로 받아
  `call_add(a, b)`. 실행: `ros2 run my_py_pkg client 3 5`.
- **3번** `ros2 service call /add_two_ints example_interfaces/srv/AddTwoInts "{a: 2, b: 9}"` → sum=11.
- **4번** 예: 센서 스트림(토픽)/맵 저장(서비스)/장거리 이동(액션)/LED 토글(서비스)/속도 명령(토픽).

---

### 참고 자료
- ROS 2 Jazzy — Writing a simple service and client (Python/C++)
- 대조 코드(MIT): `gcamp_ros2_basic` py/cpp_service_pkg, `ROS-2-from-Scratch` ch6
