# 6장. 파라미터와 커스텀 인터페이스

> **학습 목표**
> - 파라미터(parameter)로 노드를 재컴파일 없이 설정하는 법을 익힌다.
> - YAML로 파라미터를 한꺼번에 불러온다.
> - 나만의 메시지/서비스/액션 타입(`.msg`/`.srv`/`.action`)을 만들고 빌드한다.

> **이번 장의 산출물**
> - 파라미터로 동작을 바꾸는 노드와 YAML 설정을 작성한다.
> - 커스텀 인터페이스 패키지를 빌드하고 다른 패키지에서 사용한다.
>
> **공통 학습 흐름**: 개념 → 따라하기 → 코드 해설 → 실행 확인 → 버전/환경 체크 → 트러블슈팅 → 연습문제 → 마무리 점검

---

## 6.1 파라미터란 — 코드를 안 고치고 바꾸기

파라미터는 노드의 **설정값**이다. 발행 주기, 로봇 이름, 속도 한계처럼 *바뀔 수 있는 값*을
코드에 박지 않고 밖에서 주입한다. 같은 노드를 다른 설정으로 재사용할 수 있다.

### [따라하기] 파라미터 선언·사용 (Python)

```python
import rclpy
from rclpy.node import Node
from std_msgs.msg import Int64


class ConfigurablePublisher(Node):
    def __init__(self):
        super().__init__("configurable_publisher")
        self.declare_parameter("publish_period", 1.0)   # 기본값과 함께 선언
        self.declare_parameter("robot_name", "turtle")

        period = self.get_parameter("publish_period").value
        name = self.get_parameter("robot_name").value
        self.get_logger().info(f"{name} / 주기 {period}s")

        self.pub_ = self.create_publisher(Int64, "number", 10)
        self.create_timer(period, self.tick)
        self.counter_ = 0

    def tick(self):
        msg = Int64(); msg.data = self.counter_
        self.pub_.publish(msg); self.counter_ += 1
```

실행할 때 값을 주입한다:

```bash
ros2 run my_py_pkg configurable_publisher --ros-args -p publish_period:=0.5 -p robot_name:=bot
```

런타임 조회·변경:

```bash
ros2 param list
ros2 param get /configurable_publisher publish_period
ros2 param set /configurable_publisher robot_name bot2
```

### YAML로 한꺼번에 불러오기

`config/params.yaml`:

```yaml
configurable_publisher:
  ros__parameters:
    publish_period: 0.2
    robot_name: "fast_bot"
```

```bash
ros2 run my_py_pkg configurable_publisher --ros-args --params-file config/params.yaml
```

> 💡 파라미터가 많아지면 YAML이 정답이다. 7장 런치 파일에서 이 YAML을 자동으로 물려
> 노드를 띄우는 법을 배운다.

---

## 6.2 커스텀 인터페이스 — 나만의 타입

지금까지는 `std_msgs`, `example_interfaces` 같은 *남이 만든* 타입을 썼다. 실제 프로젝트는
도메인에 맞는 타입이 필요하다(예: "로봇 회전 명령", "미로 목표"). 이를 위해 **인터페이스
전용 패키지**를 따로 만드는 것이 관례다.

### [따라하기] 인터페이스 패키지 생성

```bash
cd ~/ros2_ws/src
ros2 pkg create my_robot_interfaces --build-type ament_cmake
cd my_robot_interfaces
mkdir msg srv action
```

> 📌 인터페이스 패키지는 **항상 `ament_cmake`** 로 만든다(Python 패키지여도). 메시지 코드
> 생성이 CMake 기반이기 때문이다.

### 메시지 정의 — msg/HardwareStatus.msg

```text
float64 temperature
bool are_motors_ready
string debug_message
```

### 서비스 정의 — srv/TurnRobot.srv

```text
float64 angle_deg      # 요청: 몇 도 회전
---
bool success           # 응답
```

### 액션 정의 — action/Navigate.action

```text
float64 x              # goal: 목표 좌표
float64 y
---
bool reached           # result
---
float64 distance_left  # feedback
```

### CMakeLists.txt / package.xml 설정

`CMakeLists.txt`에 추가:

```cmake
find_package(rosidl_default_generators REQUIRED)

rosidl_generate_interfaces(${PROJECT_NAME}
  "msg/HardwareStatus.msg"
  "srv/TurnRobot.srv"
  "action/Navigate.action"
)
```

`package.xml`에 추가:

```xml
<buildtool_depend>rosidl_default_generators</buildtool_depend>
<exec_depend>rosidl_default_runtime</exec_depend>
<member_of_group>rosidl_interface_packages</member_of_group>
```

빌드 후 확인:

```bash
cd ~/ros2_ws && colcon build --packages-select my_robot_interfaces
source install/setup.bash
ros2 interface show my_robot_interfaces/msg/HardwareStatus
```

---

## 6.3 커스텀 타입 사용하기

다른 패키지(`my_py_pkg`)에서 쓰려면 그 패키지의 `package.xml`에 의존성을 추가한다:

```xml
<depend>my_robot_interfaces</depend>
```

코드에서 import:

```python
from my_robot_interfaces.msg import HardwareStatus
```

> ⚠️ **빌드 순서 주의**: 인터페이스 패키지를 *먼저* 빌드해야 그것을 쓰는 패키지가 빌드된다.
> `colcon`은 의존성(`<depend>`)을 보고 순서를 자동 결정하므로, 의존성만 제대로 적으면 된다.

---

## 코드 해설 · 실행 확인 · 버전 체크

- **코드 해설 포인트**: `declare_parameter`, YAML 로딩, `rosidl_generate_interfaces`, `package.xml` 의존성을 해설한다.
- **실행 확인 포인트**: `ros2 param list/get/set`과 커스텀 인터페이스 빌드 결과를 확인한다.
- **버전/환경 체크**: Jazzy의 인터페이스 패키지 빌드 규칙과 Python import 경로를 점검한다.

## 6.4 트러블슈팅

| 증상 | 원인 | 해결 |
|---|---|---|
| `ros2 interface show`에 안 보임 | 빌드/소싱 안 함 | 재빌드 + `source install/setup.bash` |
| `No module named ...msg` | 사용 패키지에 의존성 누락 | `package.xml`에 `<depend>my_robot_interfaces</depend>` |
| 인터페이스 빌드 실패 | `rosidl` 설정 누락 | CMake `rosidl_generate_interfaces` + package.xml 그룹 |
| 파라미터 미선언 오류 | `declare_parameter` 안 함 | 사용 전 선언 |

---

## 6.5 연습문제

1. `configurable_publisher`에 `max_count` 파라미터를 추가해 그 수까지만 발행하고 멈춰라.
2. `HardwareStatus` 메시지를 발행하는 노드를 만들어 `ros2 topic echo`로 확인하라.
3. `TurnRobot.srv`를 사용하는 서비스 서버를 작성하라(각도를 받아 success 반환).
4. params.yaml에 두 노드의 설정을 함께 적고 런치 없이 각각 불러와 보라.

---

## 6.6 마무리 점검

- [ ] 파라미터로 노드를 외부에서 설정하고 런타임에 변경할 수 있다.
- [ ] YAML로 파라미터를 일괄 주입할 수 있다.
- [ ] `.msg`/`.srv`/`.action`을 정의하고 인터페이스 패키지를 빌드했다.
- [ ] 커스텀 타입을 다른 패키지에서 import해 사용할 수 있다.

> **다음 장 예고** — 7장 **런치**. 지금까지 노드를 하나씩 손으로 켰지만, 실제 시스템은
> 노드 수십 개다. 런치 파일로 한 번에 띄우고 파라미터까지 묶는다.

---

## 6.7 [워크드 예제] 파라미터로 멈추는 발행자

파라미터를 "켜고 끄는 스위치"로도 쓸 수 있다. `max_count`까지만 발행하고 멈추는 노드:

```python
class LimitedPublisher(Node):
    def __init__(self):
        super().__init__("limited_publisher")
        self.declare_parameter("max_count", 5)
        self.max_ = self.get_parameter("max_count").value
        self.pub_ = self.create_publisher(Int64, "number", 10)
        self.create_timer(1.0, self.tick)
        self.n_ = 0

    def tick(self):
        if self.n_ >= self.max_:
            self.get_logger().info("최대치 도달 → 발행 중지")
            return
        msg = Int64(); msg.data = self.n_
        self.pub_.publish(msg); self.n_ += 1
```

```bash
ros2 run my_py_pkg limited_publisher --ros-args -p max_count:=3   # 0,1,2 만 발행
```

## 6.8 커스텀 인터페이스 — 흔한 실수 체크리스트

인터페이스 패키지는 설정이 까다로워 입문자가 가장 많이 막힌다. 빌드 실패 시 아래를 점검:

- [ ] 패키지를 `--build-type ament_cmake`로 만들었나? (Python 패키지로 만들면 안 됨)
- [ ] `CMakeLists.txt`에 `find_package(rosidl_default_generators REQUIRED)` + `rosidl_generate_interfaces`가 있나?
- [ ] `package.xml`에 `<member_of_group>rosidl_interface_packages</member_of_group>`가 있나?
- [ ] `.msg`/`.srv`/`.action` 파일명을 `rosidl_generate_interfaces`에 빠짐없이 적었나?
- [ ] 사용하는 패키지의 `package.xml`에 `<depend>my_robot_interfaces</depend>`를 넣었나?
- [ ] 인터페이스 패키지를 **먼저** 빌드했나? (colcon이 의존성 순서를 자동 처리하지만, 의존성 선언이 있어야 함)

## 6.9 연습문제 해설(요약)

- **1번** 위 6.7 `LimitedPublisher`가 정답.
- **2번** `HardwareStatus` 메시지를 채워 발행 후 `ros2 topic echo /status`로 확인. 필드는
  `temperature`,`are_motors_ready`,`debug_message`.
- **3번** `TurnRobot.srv`로 서버 작성: 콜백에서 `request.angle_deg`를 받아 처리하고
  `response.success = True` 반환. 4장 서비스 서버 구조 그대로.
- **4번** YAML 최상위 키를 각 노드 이름과 일치시켜야 파라미터가 적용된다(노드명 불일치가 흔한 실수).

---

### 참고 자료
- ROS 2 Jazzy — Using parameters / Creating custom msg and srv files
- 대조 코드(MIT): `gcamp_ros2_basic` cpp_param_pkg·custom_interfaces, `ROS-2-from-Scratch` ch8
