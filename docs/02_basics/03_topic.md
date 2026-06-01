# 3장. 토픽 — 발행/구독

> **학습 목표**
> - 토픽(topic)의 발행(publish)/구독(subscribe) 모델을 설명할 수 있다.
> - `rclpy`/`rclcpp`로 퍼블리셔·서브스크라이버 노드를 직접 작성한다.
> - `setup.py`의 `console_scripts`로 노드를 실행 명령으로 등록한다.
> - `ros2 topic` CLI로 토픽을 들여다보고 디버깅한다.

> **이번 장의 산출물**
> - Python publisher/subscriber와 C++ publisher를 작성한다.
> - `/number` 토픽의 메시지 흐름을 CLI와 그래프로 확인한다.
>
> **공통 학습 흐름**: 개념 → 따라하기 → 코드 해설 → 실행 확인 → 버전/환경 체크 → 트러블슈팅 → 연습문제 → 마무리 점검

2장에서 만든 `my_py_pkg`/`my_cpp_pkg`에 **첫 노드**를 넣는다. ROS 2 통신의 가장 기본이자
가장 많이 쓰이는 방식이 토픽이다.

---

## 3.1 토픽이란 — 단방향 스트림

토픽은 **이름이 붙은 통로**다. 한쪽(퍼블리셔)이 메시지를 흘려보내면, 그 토픽을 구독하는
모든 노드(서브스크라이버)가 받는다.

```text
[퍼블리셔] --(/chatter, String)--> [서브스크라이버 1]
                              └----> [서브스크라이버 2]
```

특징:
- **단방향**: 보내는 쪽은 받는 쪽의 응답을 기대하지 않는다.
- **다대다**: 한 토픽에 퍼블리셔·서브스크라이버가 여럿일 수 있다.
- **비동기**: 보내는 쪽과 받는 쪽이 서로의 존재를 몰라도 된다(느슨한 결합).
- **타입이 있다**: 토픽마다 메시지 타입(예: `std_msgs/String`)이 정해져 있다.

센서 데이터(라이다, 카메라), 속도 명령(`cmd_vel`) 등 *계속 흐르는 데이터*에 적합하다.

---

## 3.2 [따라하기] Python 퍼블리셔

`my_py_pkg/my_py_pkg/` 안에 `number_publisher.py`를 만든다.

```python
import rclpy
from rclpy.node import Node
from std_msgs.msg import Int64


class NumberPublisher(Node):
    def __init__(self):
        super().__init__("number_publisher")          # 노드 이름
        self.counter_ = 0
        self.publisher_ = self.create_publisher(Int64, "number", 10)
        self.timer_ = self.create_timer(1.0, self.publish_number)  # 1초마다
        self.get_logger().info("Number publisher 시작")

    def publish_number(self):
        msg = Int64()
        msg.data = self.counter_
        self.publisher_.publish(msg)
        self.counter_ += 1


def main(args=None):
    rclpy.init(args=args)
    node = NumberPublisher()
    rclpy.spin(node)            # 노드를 살아 있게 유지(콜백 처리)
    node.destroy_node()
    rclpy.shutdown()


if __name__ == "__main__":
    main()
```

핵심 4단계는 모든 rclpy 노드가 공유한다: **init → 노드 생성 → spin → shutdown**.

**`setup.py`에 실행 등록** (2.6절에서 위치만 봤던 곳):

```python
entry_points={
    'console_scripts': [
        'number_publisher = my_py_pkg.number_publisher:main',
    ],
},
```

**빌드·실행**:

```bash
cd ~/ros2_ws && colcon build --packages-select my_py_pkg
source install/setup.bash
ros2 run my_py_pkg number_publisher
```

---

## 3.3 [따라하기] Python 서브스크라이버

같은 패키지에 `number_subscriber.py`:

```python
import rclpy
from rclpy.node import Node
from std_msgs.msg import Int64


class NumberSubscriber(Node):
    def __init__(self):
        super().__init__("number_subscriber")
        self.subscriber_ = self.create_subscription(
            Int64, "number", self.callback_number, 10)

    def callback_number(self, msg):
        self.get_logger().info("받음: " + str(msg.data))


def main(args=None):
    rclpy.init(args=args)
    node = NumberSubscriber()
    rclpy.spin(node)
    node.destroy_node()
    rclpy.shutdown()


if __name__ == "__main__":
    main()
```

`setup.py`에 한 줄 더 등록 후 재빌드:

```python
'number_subscriber = my_py_pkg.number_subscriber:main',
```

터미널 둘을 열어 퍼블리셔/서브스크라이버를 각각 실행하면, 0,1,2,… 가 흘러가는 것을 본다.

---

## 3.4 [따라하기] C++ 퍼블리셔 (요약)

`my_cpp_pkg/src/number_publisher.cpp`:

```cpp
#include "rclcpp/rclcpp.hpp"
#include "std_msgs/msg/int64.hpp"

class NumberPublisher : public rclcpp::Node {
public:
    NumberPublisher() : Node("number_publisher"), counter_(0) {
        publisher_ = this->create_publisher<std_msgs::msg::Int64>("number", 10);
        timer_ = this->create_wall_timer(std::chrono::seconds(1),
                    std::bind(&NumberPublisher::publishNumber, this));
    }
private:
    void publishNumber() {
        auto msg = std_msgs::msg::Int64();
        msg.data = counter_++;
        publisher_->publish(msg);
    }
    rclcpp::Publisher<std_msgs::msg::Int64>::SharedPtr publisher_;
    rclcpp::TimerBase::SharedPtr timer_;
    int counter_;
};

int main(int argc, char **argv) {
    rclcpp::init(argc, argv);
    rclcpp::spin(std::make_shared<NumberPublisher>());
    rclcpp::shutdown();
    return 0;
}
```

C++은 `CMakeLists.txt`에 빌드·설치 규칙을 추가해야 한다:

```cmake
find_package(rclcpp REQUIRED)
find_package(std_msgs REQUIRED)

add_executable(number_publisher src/number_publisher.cpp)
ament_target_dependencies(number_publisher rclcpp std_msgs)

install(TARGETS number_publisher DESTINATION lib/${PROJECT_NAME})
```

> 📌 Python은 `console_scripts`, C++은 `CMakeLists.txt`의 `add_executable`+`install`.
> 등록 위치가 다를 뿐, 개념(노드 생성→spin)은 동일하다.

---

## 3.5 토픽 디버깅 CLI

코드 없이 토픽을 들여다보는 명령들. **디버깅의 90%가 여기서 끝난다.**

```bash
ros2 topic list                 # 살아 있는 토픽 목록
ros2 topic echo /number         # 토픽으로 흐르는 메시지 출력
ros2 topic info /number         # 타입·퍼블리셔/서브스크라이버 수
ros2 topic hz /number           # 발행 주기(Hz) 측정
ros2 topic pub /number std_msgs/msg/Int64 "{data: 42}"   # CLI로 직접 발행
ros2 interface show std_msgs/msg/Int64                    # 메시지 구조 확인
rqt_graph                       # 노드-토픽 연결을 그래프로 시각화
```

> 💡 노드끼리 통신이 안 될 때: `ros2 topic info`로 **양쪽이 같은 토픽 이름·같은 타입**인지
> 먼저 확인하라. 오타 하나로 다른 토픽이 만들어지는 일이 흔하다.

---

## 3.6 미리 보기 — 실전 토픽(2권 9장)

지금은 `Int64`를 주고받았지만, 실제 로봇에서는 의미 있는 타입을 쓴다. 2권 9장 "주차
프로젝트"에서 다룰 두 토픽을 미리 본다.

- **구독**: `/scan` (`sensor_msgs/LaserScan`) — 라이다 거리 데이터
- **발행**: `/cmd_vel` (`geometry_msgs/Twist`) — 로봇 속도 명령

즉 "라이다를 *구독*해 거리를 보고, 속도를 *발행*해 움직인다" — 토픽 두 개로 자율주행의
뼈대가 만들어진다. 지금 익힌 패턴이 그대로 쓰인다.

---

## 코드 해설 · 실행 확인 · 버전 체크

- **코드 해설 포인트**: `create_publisher`, `create_subscription`, timer callback, `console_scripts`, `CMakeLists.txt` 등록 흐름을 해설한다.
- **실행 확인 포인트**: `ros2 topic list/info/echo/hz`와 `rqt_graph`로 토픽 동작을 확인한다.
- **버전/환경 체크**: Jazzy에서도 기본 API는 유사하지만 QoS 기본값과 패키지 등록 방식 차이를 점검한다.

## 3.7 트러블슈팅

| 증상 | 원인 | 해결 |
|---|---|---|
| `ros2 run`이 노드를 못 찾음 | `console_scripts` 미등록/재빌드 안 함 | 등록 후 `colcon build` + 소싱 |
| echo는 되는데 콜백이 안 옴 | 토픽 이름/타입 불일치 | `ros2 topic info`로 대조 |
| `No module named 'std_msgs'` | 의존성 누락 | `package.xml`에 `<depend>std_msgs</depend>` |
| C++ 링크 에러 | `ament_target_dependencies` 누락 | CMake에 의존성 추가 |

---

## 3.8 연습문제

1. `number_publisher`의 발행 주기를 0.5초로 바꿔 `ros2 topic hz`로 확인하라.
2. 서브스크라이버가 받은 값을 2배로 만들어 새 토픽 `/number_x2`로 다시 발행하라(구독+발행 동시).
3. `ros2 topic pub`로 `/number`에 직접 100을 발행해 서브스크라이버가 받는지 보라.
4. (C++) `number_subscriber.cpp`를 작성해 Python 퍼블리셔와 통신시켜라.

---

## 3.9 마무리 점검

- [ ] 토픽의 발행/구독·단방향·다대다 특성을 설명할 수 있다.
- [ ] Python으로 퍼블리셔·서브스크라이버를 작성하고 실행했다.
- [ ] `console_scripts`(Py) / `add_executable`(C++) 등록 위치를 안다.
- [ ] `ros2 topic` 명령으로 토픽을 디버깅할 수 있다.

> **다음 장 예고** — 4장에서는 *질문하고 답을 받는* **서비스**를 다룬다. 토픽이 일방적
> 방송이라면, 서비스는 요청–응답 대화다.

---

## 3.10 [워크드 예제] 구독하며 다시 발행하는 노드

토픽은 *받아서 가공해 다시 흘려보내는* 중간 노드로 자주 쓰인다. `/number`를 구독해 2배로
만들어 `/number_x2`로 발행하는 노드를 처음부터 끝까지 만들어 본다.

`my_py_pkg/my_py_pkg/number_doubler.py`:

```python
import rclpy
from rclpy.node import Node
from std_msgs.msg import Int64


class NumberDoubler(Node):
    def __init__(self):
        super().__init__("number_doubler")
        self.pub_ = self.create_publisher(Int64, "number_x2", 10)
        self.sub_ = self.create_subscription(
            Int64, "number", self.on_number, 10)

    def on_number(self, msg):
        out = Int64()
        out.data = msg.data * 2
        self.pub_.publish(out)
        self.get_logger().info(f"{msg.data} → {out.data}")


def main(args=None):
    rclpy.init(args=args)
    node = NumberDoubler()
    rclpy.spin(node)
    node.destroy_node()
    rclpy.shutdown()
```

`setup.py`에 `number_doubler = my_py_pkg.number_doubler:main` 등록 후 빌드. 세 터미널에서:

```bash
ros2 run my_py_pkg number_publisher     # /number 발행
ros2 run my_py_pkg number_doubler       # /number 구독 → /number_x2 발행
ros2 topic echo /number_x2              # 2배 값이 흐른다
```

한 노드가 **구독자이자 퍼블리셔**다. 이 패턴이 9장 주차(LaserScan 구독 → Twist 발행)의
구조와 정확히 같다.

## 3.11 메시지 타입 고르는 법

처음엔 어떤 타입을 써야 할지 막막하다. 표준 메시지 패키지부터 살핀다.

| 패키지 | 대표 타입 | 쓰임 |
|---|---|---|
| `std_msgs` | `String`, `Int64`, `Bool` | 단순 값(학습·신호용) |
| `geometry_msgs` | `Twist`, `Pose`, `Point` | 속도·자세·좌표 |
| `sensor_msgs` | `LaserScan`, `Image`, `Imu` | 센서 데이터 |
| `nav_msgs` | `Odometry`, `Path`, `OccupancyGrid` | 주행·지도 |

```bash
ros2 interface list | grep msg          # 설치된 메시지 전체
ros2 interface show geometry_msgs/msg/Twist   # 구조 확인
```

표준에 맞는 게 없을 때만 커스텀 타입을 만든다(6장).

## 3.12 연습문제 해설(요약)

- **1번** `create_timer(0.5, ...)` 로 바꾸면 `ros2 topic hz /number`가 약 2.0Hz를 보인다.
- **2번** 위 3.10의 `NumberDoubler`가 정답 구조다.
- **3번** `ros2 topic pub --once /number std_msgs/msg/Int64 "{data: 100}"` → 구독자가 100 출력.
- **4번** C++은 3.4의 퍼블리셔를 참고해 `create_subscription`으로 작성, 콜백에서 `RCLCPP_INFO`.
  언어가 달라도 **같은 토픽 이름·타입**이면 Python 퍼블리셔와 그대로 통신한다.

---

### 참고 자료
- ROS 2 Jazzy — Writing a simple publisher/subscriber (Python/C++)
- 대조 코드(MIT): `gcamp_ros2_basic` py/cpp_topic_pkg, `ROS-2-from-Scratch` ch5
