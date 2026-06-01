# 9장. 프로젝트 1 — 주차(Parking)

> **학습 목표 / 통합 개념**: 토픽(3장)
> - 라이다(`LaserScan`)를 **구독**해 거리를 읽는다.
> - 속도(`Twist`)를 **발행**해 로봇을 제어한다.
> - "센서 입력 → 판단 → 구동 출력"의 제어 루프를 코드로 완성한다.

> **이번 장의 산출물**
> - 주차 노드가 `/scan`을 구독하고 `/cmd_vel`을 발행하게 만든다.
> - 장애물 거리 조건에 따라 로봇이 정지하는 프로젝트를 완성한다.
>
> **공통 학습 흐름**: 개념 → 따라하기 → 코드 해설 → 실행 확인 → 버전/환경 체크 → 트러블슈팅 → 연습문제 → 마무리 점검

2권의 첫 프로젝트. 3장에서 익힌 토픽 두 개(`/scan` 구독, `/cmd_vel` 발행)만으로 "벽 앞에서
멈추는 주차"를 만든다. 자율주행의 가장 작은 완성형이다.

---

## 9.1 무엇을 만드나

로봇이 직진하다가, 전방 거리가 임계값 이하로 가까워지면 멈춘다(주차). 필요 토픽:

```text
구독: /scan     sensor_msgs/LaserScan   ← 전방 장애물 거리
발행: /cmd_vel  geometry_msgs/Twist     ← 선속도/각속도 명령
```

---

## 9.2 LaserScan 이해하기

`LaserScan`은 한 바퀴 스캔의 거리 배열이다. 핵심 필드:

```text
float32 angle_min, angle_max, angle_increment   # 각도 범위/간격
float32 range_min, range_max                    # 유효 거리
float32[] ranges                                # 각도별 거리(m)
```

전방 거리는 보통 `ranges`의 가운데 인덱스 부근이다(센서 장착·드라이버에 따라 다름).
실제로는 `ros2 topic echo /scan`으로 배열 길이와 전방 인덱스를 먼저 확인한다.

---

## 9.3 [따라하기] 주차 노드 (Python)

`my_py_pkg/my_py_pkg/parking.py`:

```python
import rclpy
from rclpy.node import Node
from sensor_msgs.msg import LaserScan
from geometry_msgs.msg import Twist


class Parking(Node):
    def __init__(self):
        super().__init__("parking")
        self.declare_parameter("stop_distance", 0.5)   # 멈출 거리(m)
        self.declare_parameter("forward_speed", 0.2)   # 직진 속도(m/s)
        self.stop_dist_ = self.get_parameter("stop_distance").value
        self.speed_ = self.get_parameter("forward_speed").value

        self.cmd_pub_ = self.create_publisher(Twist, "cmd_vel", 10)
        self.scan_sub_ = self.create_subscription(
            LaserScan, "scan", self.on_scan, 10)
        self.get_logger().info("주차 노드 시작")

    def on_scan(self, scan: LaserScan):
        # 전방(스캔 중앙) 거리 추정
        front_index = len(scan.ranges) // 2
        front = scan.ranges[front_index]

        cmd = Twist()
        if front > self.stop_dist_:
            cmd.linear.x = self.speed_          # 안전: 직진
        else:
            cmd.linear.x = 0.0                  # 임계 이하: 정지(주차)
            self.get_logger().info(f"정지: 전방 {front:.2f}m")
        self.cmd_pub_.publish(cmd)


def main(args=None):
    rclpy.init(args=args)
    node = Parking()
    rclpy.spin(node)
    node.destroy_node()
    rclpy.shutdown()
```

`setup.py`의 `console_scripts`에 `parking = my_py_pkg.parking:main` 등록 후 빌드.

---

## 9.4 [따라하기] 실행

Gazebo(8장 방식)로 로봇과 라이다를 띄우고, 브리지로 `/scan`·`/cmd_vel`을 연결한 뒤:

```bash
ros2 run my_py_pkg parking --ros-args -p stop_distance:=0.6 -p forward_speed:=0.15
```

확인:

```bash
ros2 topic echo /cmd_vel        # 직진 중엔 linear.x>0, 벽 앞에선 0
ros2 topic hz /scan             # 라이다가 흐르는지
```

> 🔁 **Foxy → Jazzy 포팅 메모**: gcamp 원본 `parking.py`는 동일한 토픽 구조지만 Gazebo
> Classic에서 `/scan`·`/cmd_vel`이 바로 나왔다. Harmonic에서는 8.5절의 **브리지**로 두
> 토픽을 ROS 측에 노출해야 노드가 데이터를 받는다. 노드 코드 자체는 거의 그대로 쓰인다.

---

## 9.5 한 걸음 더 — 비례 감속

급정지 대신, 가까워질수록 부드럽게 줄이면 더 자연스럽다(비례 제어의 맛보기).

```python
        if front > self.stop_dist_:
            # 거리에 비례해 속도 조절(최대 speed_)
            cmd.linear.x = min(self.speed_, 0.4 * (front - self.stop_dist_))
        else:
            cmd.linear.x = 0.0
```

---

## 코드 해설 · 실행 확인 · 버전 체크

- **코드 해설 포인트**: LaserScan 전방 인덱스 계산, Twist 발행, 파라미터화할 값을 해설한다.
- **실행 확인 포인트**: `ros2 topic hz /scan`, `/cmd_vel` echo, Gazebo에서 정지 동작을 확인한다.
- **버전/환경 체크**: Gazebo Harmonic에서는 scan/cmd_vel bridge 구성이 먼저 맞아야 함을 표시한다.

## 9.6 트러블슈팅

| 증상 | 원인 | 해결 |
|---|---|---|
| 로봇이 안 움직임 | `/cmd_vel` 브리지 없음 | `ros_gz_bridge`로 Twist 매핑 |
| 콜백이 안 옴 | `/scan` 미발행/브리지 없음 | `ros2 topic hz /scan` 확인 |
| 항상 0으로 정지 | 전방 인덱스 잘못 | `echo`로 ranges 길이·전방 위치 확인 |
| `inf`/`nan` 거리 | 측정 범위 밖 | `range_max`·`math.isinf` 처리 추가 |

---

## 9.7 연습문제

1. `stop_distance`를 파라미터로 바꿔 0.3/0.8에서 동작 차이를 비교하라.
2. 전방 한 점 대신 중앙 ±10개 인덱스의 **최솟값**으로 판단하도록 바꿔라(더 안전).
3. `inf`/`nan`을 거르는 방어 코드를 추가하라.
4. 9.5의 비례 감속을 적용하고 정지 직전 거동을 관찰하라.

---

## 9.8 마무리 점검

- [ ] LaserScan 구독으로 전방 거리를 읽을 수 있다.
- [ ] Twist 발행으로 로봇을 직진·정지시킬 수 있다.
- [ ] 센서→판단→구동 루프를 코드로 설명할 수 있다.
- [ ] Harmonic 브리지로 `/scan`·`/cmd_vel`을 연결하는 포인트를 안다.

> **다음 장 예고** — 10장 **로봇 복제(Spawn)**: 서비스(4장)를 써서 시뮬레이션에 로봇을
> 동적으로 생성한다.

---

## 9.10 [워크드 예제] 방어 코드와 전방 구간 평균

9.3의 기본 노드는 전방 한 점만 본다. 실제 라이다는 `inf`·`nan`이 섞이고 한 점은 노이즈에
취약하다. 전방 구간의 **유효값 최솟값**으로 판단하도록 보강한다.

```python
import math

def on_scan(self, scan):
    n = len(scan.ranges)
    mid = n // 2
    window = scan.ranges[mid - 10: mid + 10]          # 전방 ±10
    valid = [r for r in window if not math.isinf(r) and not math.isnan(r)]
    front = min(valid) if valid else float("inf")     # 유효값 최솟값

    cmd = Twist()
    if front > self.stop_dist_:
        cmd.linear.x = min(self.speed_, 0.4 * (front - self.stop_dist_))  # 비례 감속
    else:
        cmd.linear.x = 0.0
    self.cmd_pub_.publish(cmd)
```

핵심 두 가지: ① `inf`/`nan` 필터링(센서 측정 범위 밖) ② 한 점이 아닌 구간 최솟값(노이즈·튀는
값에 강함). 실로봇으로 갈수록 이런 방어 코드가 안정성을 좌우한다.

## 9.11 디버깅 — 값이 이상할 때

```bash
ros2 topic echo /scan --once     # ranges 배열 길이·전방 인덱스·inf 여부 확인
ros2 topic hz /scan              # 라이다가 실제로 흐르는지
ros2 topic echo /cmd_vel         # 직진 중 linear.x>0, 벽 앞 0 인지
```

"항상 0으로 멈춘다"면 전방 인덱스가 틀렸을 가능성이 크다 — `echo`로 배열을 직접 보고
중앙 인덱스를 맞춘다(센서·드라이버마다 0도 방향이 다르다).

## 9.12 연습문제 해설(요약)

- **1번** `-p stop_distance:=0.3/0.8`로 실행해 정지 거리 차이를 관찰.
- **2번** 위 9.10의 `window`+`min(valid)` 방식이 정답.
- **3번** 9.10의 `math.isinf/isnan` 필터가 방어 코드.
- **4번** `0.4 * (front - stop_dist_)`로 거리에 비례 감속 → 급정지 대신 부드럽게 멈춘다.

---

### 참고 자료
- `sensor_msgs/LaserScan`, `geometry_msgs/Twist` 인터페이스 문서
- 대조 코드(MIT): `gcamp_ros2_basic` py/cpp_topic_pkg `parking`
