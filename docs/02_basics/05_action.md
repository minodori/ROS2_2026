# 5장. 액션 — 목표/피드백/결과

> **학습 목표**
> - 액션(action)이 토픽·서비스로 부족한 상황을 메우는 이유를 설명한다.
> - 목표(goal)·피드백(feedback)·결과(result)·취소(cancel)의 흐름을 이해한다.
> - `rclpy`의 액션 서버·클라이언트를 작성한다.
> - `ros2 action` CLI로 액션을 다룬다.

> **이번 장의 산출물**
> - Fibonacci 액션 서버와 클라이언트를 작성한다.
> - goal, feedback, result, cancel의 전체 흐름을 실행한다.
>
> **공통 학습 흐름**: 개념 → 따라하기 → 코드 해설 → 실행 확인 → 버전/환경 체크 → 트러블슈팅 → 연습문제 → 마무리 점검

---

## 5.1 왜 액션인가 — 서비스로는 부족할 때

서비스는 "요청→응답" 한 방이라, **오래 걸리는 작업**에는 부적합하다. 로봇을 10m 전진시키는
명령을 서비스로 보내면, 도착할 때까지(수십 초) 응답이 막혀 있고 중간 상황도 알 수 없다.

액션은 이를 해결한다.

- **목표(goal)** 를 보낸다 → 서버가 받아 *비동기로* 수행
- 수행 중 **피드백(feedback)** 을 주기적으로 보낸다 (예: "현재 3m 전진")
- 끝나면 **결과(result)** 를 보낸다
- 도중에 **취소(cancel)** 할 수 있다

```text
[클라이언트] --goal-->        [서버]
            <--feedback--   (수행 중 여러 번)
            <--feedback--
            <--result--     (완료 시 1회)
   (필요 시 --cancel-->)
```

내부적으로 액션은 토픽+서비스의 조합으로 구현되지만, 사용자는 위 개념만 알면 된다.

---

## 5.2 액션 타입 — .action

`.action`은 `---` 두 개로 **goal / result / feedback** 세 부분을 나눈다.
표준 예제 `example_interfaces/Fibonacci`(개념용):

```text
int32 order        # goal: 몇 번째까지
---
int32[] sequence   # result: 최종 수열
---
int32[] partial    # feedback: 진행 중 수열
```

> 📌 커스텀 액션 타입을 만드는 법은 6장(커스텀 인터페이스)에서 다룬다. 여기서는 제공되는
> 타입으로 흐름부터 익힌다.

---

## 5.3 [따라하기] 액션 서버 (Python)

```python
import time
import rclpy
from rclpy.node import Node
from rclpy.action import ActionServer
from example_interfaces.action import Fibonacci


class FibonacciServer(Node):
    def __init__(self):
        super().__init__("fibonacci_server")
        self.server_ = ActionServer(
            self, Fibonacci, "fibonacci", execute_callback=self.execute)
        self.get_logger().info("액션 서버 시작")

    def execute(self, goal_handle):
        order = goal_handle.request.order
        sequence = [0, 1]
        feedback = Fibonacci.Feedback()
        for i in range(2, order):
            sequence.append(sequence[i - 1] + sequence[i - 2])
            feedback.partial = sequence
            goal_handle.publish_feedback(feedback)     # 피드백 전송
            time.sleep(0.5)                            # 오래 걸리는 작업 흉내
        goal_handle.succeed()                          # 목표 성공 처리
        result = Fibonacci.Result()
        result.sequence = sequence
        return result


def main(args=None):
    rclpy.init(args=args)
    node = FibonacciServer()
    rclpy.spin(node)
    node.destroy_node()
    rclpy.shutdown()
```

CLI로 목표를 보내며 피드백을 본다:

```bash
ros2 action send_goal /fibonacci example_interfaces/action/Fibonacci "{order: 8}" --feedback
```

---

## 5.4 [따라하기] 액션 클라이언트 (Python)

목표 전송 → 수락 여부 확인 → 피드백 수신 → 결과 수신, 네 콜백으로 이어진다.

```python
import rclpy
from rclpy.node import Node
from rclpy.action import ActionClient
from example_interfaces.action import Fibonacci


class FibonacciClient(Node):
    def __init__(self):
        super().__init__("fibonacci_client")
        self.client_ = ActionClient(self, Fibonacci, "fibonacci")
        self.send_goal(8)

    def send_goal(self, order):
        self.client_.wait_for_server()
        goal = Fibonacci.Goal()
        goal.order = order
        future = self.client_.send_goal_async(
            goal, feedback_callback=self.on_feedback)
        future.add_done_callback(self.on_goal_response)

    def on_goal_response(self, future):
        goal_handle = future.result()
        if not goal_handle.accepted:
            self.get_logger().warn("목표 거부됨")
            return
        goal_handle.get_result_async().add_done_callback(self.on_result)

    def on_feedback(self, msg):
        self.get_logger().info(f"피드백: {list(msg.feedback.partial)}")

    def on_result(self, future):
        result = future.result().result
        self.get_logger().info(f"결과: {list(result.sequence)}")


def main(args=None):
    rclpy.init(args=args)
    node = FibonacciClient()
    rclpy.spin(node)
    node.destroy_node()
    rclpy.shutdown()
```

---

## 5.5 취소(cancel) 다루기

서버에서 취소 요청을 받아들이려면 `goal_handle.is_cancel_requested`를 검사하고
`goal_handle.canceled()`로 종료한다.

```python
    def execute(self, goal_handle):
        ...
        for i in range(2, order):
            if goal_handle.is_cancel_requested:
                goal_handle.canceled()
                self.get_logger().warn("목표 취소됨")
                return Fibonacci.Result()
            ...
```

> 💡 취소는 "장애물을 발견해 즉시 멈춰야 할 때"처럼 안전과 직결된다. 실로봇에서 특히 중요.

---

## 5.6 디버깅 CLI

```bash
ros2 action list                           # 액션 목록
ros2 action info /fibonacci                # 서버/클라이언트 정보
ros2 action send_goal /fibonacci example_interfaces/action/Fibonacci "{order: 5}" --feedback
ros2 interface show example_interfaces/action/Fibonacci
```

---

## 5.7 미리 보기 — 실전 액션(2권 11장)

11장 "미로 탈출" 프로젝트에서 액션이 빛난다. "미로를 빠져나가라"는 **목표**를 보내고,
로봇이 이동하는 동안 **피드백**(현재 위치·진행률)을 받으며, 막히면 **취소**한다. 오래
걸리고·진행을 알아야 하고·중단 가능해야 하는 — 액션의 교과서적 사례다.

---

## 코드 해설 · 실행 확인 · 버전 체크

- **코드 해설 포인트**: `.action` 정의, goal/feedback/result/cancel callback의 책임을 해설한다.
- **실행 확인 포인트**: `ros2 action list/info/send_goal --feedback`와 cancel 동작을 확인한다.
- **버전/환경 체크**: Jazzy의 action client/server API와 cancel 처리 흐름을 기준으로 정리한다.

## 5.8 트러블슈팅

| 증상 | 원인 | 해결 |
|---|---|---|
| `wait_for_server` 무한 대기 | 서버 미실행/이름 불일치 | `ros2 action list` 확인 |
| 피드백이 안 옴 | `feedback_callback` 미지정 | `send_goal_async(..., feedback_callback=)` |
| 결과를 못 받음 | `get_result_async` 누락 | 수락 후 결과 future 등록 |
| import 오류 | 의존성 누락 | `package.xml`에 `example_interfaces`, `rclpy` |

---

## 5.9 연습문제

1. 피보나치 서버의 `time.sleep`을 1초로 늘리고 `--feedback`으로 진행을 관찰하라.
2. 클라이언트가 목표를 보낸 뒤 2초 후 자동 취소하도록 만들어라.
3. 토픽·서비스·액션을 한 표로 비교 정리하라(방향/횟수/피드백/취소 가능 여부).
4. (생각해보기) "맵 저장"은 서비스가 맞을까 액션이 맞을까? 근거를 대라.

---

## 5.10 마무리 점검

- [ ] 액션이 필요한 상황(오래 걸림·진행 보고·취소)을 설명할 수 있다.
- [ ] goal/feedback/result/cancel의 흐름을 안다.
- [ ] 액션 서버·클라이언트를 작성하고 실행했다.
- [ ] `ros2 action` 명령으로 목표를 보내고 피드백을 관찰했다.

> **다음 장 예고** — 6장에서 **파라미터**(노드를 유연하게)와 **커스텀 인터페이스**(나만의
> msg/srv/action 타입 만들기)를 다룬다. 2부 통신의 마지막 퍼즐이다.

---

## 5.11 통신 3종 한눈에 비교

2부의 핵심을 한 표로 정리한다. 이 표를 외우면 "무엇으로 모델링할지"가 분명해진다.

| 기준 | 토픽 | 서비스 | 액션 |
|---|---|---|---|
| 방향 | 단방향 | 요청→응답 | 목표→(피드백)→결과 |
| 응답 | 없음 | 1회 | 결과 1회 + 진행 피드백 |
| 지속성 | 계속 흐름 | 1회성 | 장시간 |
| 취소 | — | 어려움 | **가능** |
| 대표 예 | `/scan`, `/cmd_vel` | 두 수 더하기 | 목적지까지 주행(Nav2) |

## 5.12 [워크드 예제] 2초 후 자동 취소하는 클라이언트

액션의 진짜 가치는 **취소**다. 목표를 보낸 뒤 타이머로 일정 시간 후 취소를 요청하는
클라이언트를 만든다(안전 정지의 기본형).

```python
class TimedClient(Node):
    def __init__(self):
        super().__init__("timed_client")
        self.client_ = ActionClient(self, Fibonacci, "fibonacci")
        self.goal_handle_ = None
        self.send(15)
        self.create_timer(2.0, self.cancel_once)   # 2초 후 취소

    def send(self, order):
        self.client_.wait_for_server()
        goal = Fibonacci.Goal(); goal.order = order
        self.client_.send_goal_async(goal).add_done_callback(self.on_goal)

    def on_goal(self, future):
        self.goal_handle_ = future.result()

    def cancel_once(self):
        if self.goal_handle_ is not None:
            self.get_logger().warn("2초 경과 → 목표 취소 요청")
            self.goal_handle_.cancel_goal_async()
            self.goal_handle_ = None
```

서버는 5.5절처럼 `is_cancel_requested`를 검사해 `canceled()`로 멈춘다. 이 구조가 11장 미로
탈출에서 "막히면 멈춤", 15장 Nav2에서 "목표 변경"으로 확장된다.

## 5.13 연습문제 해설(요약)

- **1번** `time.sleep(1.0)`으로 늘리면 피드백 간격이 1초가 되어 `partial` 수열이 천천히 쌓인다.
- **2번** 위 5.12 `TimedClient`가 정답. 서버에 취소 검사(5.5)가 있어야 실제로 멈춘다.
- **3번** 5.11 표 참고.
- **4번** "맵 저장"은 보통 **서비스**(짧고 1회·즉시 완료). 단, 대용량 맵을 오래 처리하며 진행을
  보고해야 한다면 액션이 더 맞다. "오래 걸리고 진행을 봐야 하는가"가 분기점이다.

---

### 참고 자료
- ROS 2 Jazzy — Writing an action server and client (Python)
- 대조 코드(MIT): `gcamp_ros2_basic` py/cpp_action_pkg, `ROS-2-from-Scratch` ch7
