# 17장. Lifecycle 노드와 Component

> **학습 목표**
> - 일반 노드와 **Lifecycle 노드**의 차이를 이해한다.
> - Lifecycle의 상태(미설정/비활성/활성/종료)와 전이를 안다.
> - **Component**로 여러 노드를 한 프로세스에 담는 이점을 안다.
> - 언제 이 기능들을 써야 하는지 판단한다.

> **이번 장의 산출물**
> - Lifecycle node의 상태 전이를 CLI로 제어한다.
> - Component container에 노드를 올리는 개념을 확인한다.
>
> **공통 학습 흐름**: 개념 → 따라하기 → 코드 해설 → 실행 확인 → 버전/환경 체크 → 트러블슈팅 → 연습문제 → 마무리 점검

---

## 17.1 왜 Lifecycle인가

일반 노드는 켜지면 곧바로 동작한다. 그런데 실제 시스템에서는 "켜되 아직 작동은 말고,
준비가 끝나면 동시에 시작"이 필요하다(예: 모든 센서가 준비된 뒤에 제어 시작). **Lifecycle
노드(관리형 노드)** 는 노드의 상태를 외부에서 통제하게 해 준다.

상태와 전이:

```text
[Unconfigured] --configure--> [Inactive] --activate--> [Active]
      ▲                            │                       │
      └------- cleanup ------------┘ <----- deactivate ----┘
                          (shutdown → Finalized)
```

- **Unconfigured**: 막 생성됨, 리소스 없음
- **Inactive**: 설정 완료(리소스 잡음), 아직 콜백 처리 안 함
- **Active**: 실제로 발행/구독/처리
- 전이마다 콜백(`on_configure`, `on_activate` …)에서 할 일을 정의

---

## 17.2 [따라하기] Lifecycle 노드 (Python 골격)

```python
import rclpy
from rclpy.lifecycle import LifecycleNode, TransitionCallbackReturn, State


class SensorDriver(LifecycleNode):
    def __init__(self):
        super().__init__("sensor_driver")

    def on_configure(self, state: State):
        self.get_logger().info("설정: 리소스 준비")
        self.pub_ = self.create_lifecycle_publisher(/* ... */)
        return TransitionCallbackReturn.SUCCESS

    def on_activate(self, state: State):
        self.get_logger().info("활성화: 발행 시작")
        return super().on_activate(state)

    def on_deactivate(self, state: State):
        self.get_logger().info("비활성화: 발행 중지")
        return super().on_deactivate(state)

    def on_cleanup(self, state: State):
        self.get_logger().info("정리: 리소스 해제")
        return TransitionCallbackReturn.SUCCESS
```

> 📌 위 `create_lifecycle_publisher(...)`의 인자는 메시지 타입·토픽·depth로, 일반 퍼블리셔와
> 같다. Lifecycle 퍼블리셔는 **Active 상태에서만 실제로 발행**한다.

상태를 CLI로 전이시킨다:

```bash
ros2 lifecycle set /sensor_driver configure
ros2 lifecycle set /sensor_driver activate
ros2 lifecycle get /sensor_driver           # 현재 상태
ros2 lifecycle list /sensor_driver          # 가능한 전이
```

---

## 17.3 언제 Lifecycle을 쓰나

- 여러 노드의 **시작 순서·동시성**을 통제해야 할 때
- 센서/하드웨어 초기화가 끝난 뒤에만 동작시켜야 할 때
- 런타임에 노드를 **안전하게 재설정**해야 할 때(cleanup→configure)

Nav2의 많은 노드가 Lifecycle로 구현되어, 매니저가 일괄 기동·정지한다.

---

## 17.4 Component — 한 프로세스에 여러 노드

기본적으로 노드 하나당 프로세스 하나다(`ros2 run`). 노드가 많아지면 프로세스 간 통신
오버헤드가 커진다. **Component**(컴포저블 노드)는 여러 노드를 **한 프로세스에 적재**해,
같은 프로세스 안에서는 메시지를 복사 없이 주고받는(intra-process) 효율을 얻는다.

```bash
# 컨테이너 실행
ros2 run rclcpp_components component_container
# 컨테이너에 컴포넌트 적재
ros2 component load /ComponentManager my_pkg my_pkg::MyComponent
ros2 component list
```

> 💡 Component는 C++(`rclcpp_components`)에서 가장 효과적이다. 카메라→처리→표시처럼 대용량
> 데이터가 노드 사이를 흐를 때 intra-process 통신으로 큰 이득을 본다.

> 🔁 **Foxy → Jazzy 메모**: Lifecycle/Component의 개념과 API 큰 틀은 Foxy와 같다. `rclpy`의
> Lifecycle 지원은 버전이 오르며 다듬어졌으니, import 경로는 Jazzy 문서를 기준으로 한다.

---

## 코드 해설 · 실행 확인 · 버전 체크

- **코드 해설 포인트**: lifecycle callback과 component loading 구조를 해설한다.
- **실행 확인 포인트**: `ros2 lifecycle set/get`과 component load 명령으로 상태와 로딩 결과를 확인한다.
- **버전/환경 체크**: Jazzy의 lifecycle CLI와 component package 이름을 기준으로 정리한다.

## 17.5 트러블슈팅

| 증상 | 원인 | 해결 |
|---|---|---|
| 활성화해도 발행 안 됨 | 일반 퍼블리셔 사용 | `create_lifecycle_publisher` 사용 |
| 전이 실패 | 콜백이 SUCCESS 반환 안 함 | 반환값 확인 |
| 컴포넌트 적재 실패 | 등록 매크로 누락(C++) | `RCLCPP_COMPONENTS_REGISTER_NODE` |
| 상태 확인 불가 | 노드명 오타 | `ros2 lifecycle nodes`로 목록 |

---

## 17.6 연습문제

1. Lifecycle 노드를 만들어 configure→activate→deactivate를 CLI로 전이시켜 로그를 관찰하라.
2. Active일 때만 발행되고 Inactive면 멈추는지 `ros2 topic hz`로 확인하라.
3. (C++) 간단한 컴포넌트를 만들어 컨테이너에 적재하라.
4. (생각해보기) 12장 TurtleBot3 bringup의 어떤 노드를 Lifecycle로 만들면 좋을지 논하라.

---

## 17.7 마무리 점검

- [ ] Lifecycle 노드의 상태와 전이를 설명할 수 있다.
- [ ] CLI로 상태를 전이시키고 Active에서만 동작함을 확인했다.
- [ ] Component가 intra-process로 효율을 얻는 원리를 안다.
- [ ] 두 기능을 언제 써야 하는지 판단할 수 있다.

> **다음 장 예고** — 18장(마지막) **로깅·CLI·rqt**: 만든 시스템을 들여다보고 디버깅하는
> 도구들로 책을 마무리한다.

---

## 17.8 [워크드 예제] 런치에서 Lifecycle 자동 전이

CLI로 매번 `configure`/`activate`를 치는 대신, 런치에서 자동으로 전이시키는 패턴이다.
Nav2가 내부적으로 쓰는 방식의 축소판이다.

```python
from launch import LaunchDescription
from launch.actions import RegisterEventHandler, EmitEvent
from launch.event_handlers import OnProcessStart
from launch_ros.actions import LifecycleNode
from launch_ros.events.lifecycle import ChangeState
import lifecycle_msgs.msg

def generate_launch_description():
    node = LifecycleNode(package="my_py_pkg", executable="sensor_driver",
                         name="sensor_driver", namespace="")
    # 노드가 뜨면 → configure → (이어서) activate 로 전이시키는 이벤트를 건다
    return LaunchDescription([node, /* 전이 이벤트 핸들러들 */])
```

핵심 개념만 잡자: **여러 Lifecycle 노드를 매니저가 일괄로 configure→activate** 시켜, 모든
준비가 끝난 뒤 동시에 동작을 시작한다. 실로봇에서 "센서 다 켜진 뒤 제어 시작"을 보장한다.

## 17.9 Lifecycle vs Component — 헷갈리지 않기

이름이 비슷해 섞이기 쉽다. 둘은 **다른 축**의 개념이다.

| | Lifecycle | Component |
|---|---|---|
| 무엇을 다루나 | 노드의 **상태**(켜짐/동작 통제) | 노드의 **배치**(프로세스 적재) |
| 목적 | 시작 순서·안전한 재설정 | intra-process 효율(복사 없는 통신) |
| 함께 쓰나 | **예** — Lifecycle 노드를 Component로 적재 가능 | |

즉 "언제 동작시킬지"는 Lifecycle, "어디에 담을지"는 Component다. Nav2는 둘을 함께 쓴다.

## 17.10 연습문제 해설(요약)

- **1번** 17.2 골격으로 노드를 만들고 `ros2 lifecycle set /sensor_driver configure|activate|deactivate`
  로 전이, 각 콜백의 로그로 확인.
- **2번** Active에서만 `create_lifecycle_publisher`가 발행 → `ros2 topic hz`가 Active일 때만 값.
- **3번** C++ 컴포넌트는 `RCLCPP_COMPONENTS_REGISTER_NODE(클래스)` 등록 후 컨테이너에 `load`.
- **4번** 예: 라이다 드라이버를 Lifecycle로 두면, 라이다 준비(configure) 후 활성화(activate)해
  "센서 미준비 상태에서 제어가 시작되는" 사고를 막을 수 있다.

---

### 참고 자료
- ROS 2 Jazzy — Managed (Lifecycle) Nodes / Composition
- 표윤석 교재 3부(Lifecycle·Component)
