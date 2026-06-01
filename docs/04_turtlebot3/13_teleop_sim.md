# 13장. 텔레오퍼레이션과 시뮬레이션

> **학습 목표**
> - 키보드 텔레오퍼레이션으로 로봇을 직접 조종한다.
> - `/cmd_vel`이 텔레옵·자율주행에서 공통 인터페이스임을 이해한다.
> - TurtleBot3 Gazebo 시뮬레이션 월드에서 주행한다.
> - 텔레옵으로 수집한 감각을 다음 장(SLAM)으로 잇는다.

> **이번 장의 산출물**
> - 표준 teleop과 간단한 custom teleop을 실행한다.
> - 시뮬레이션과 실로봇에서 같은 `/cmd_vel` 흐름을 비교한다.
>
> **공통 학습 흐름**: 개념 → 따라하기 → 코드 해설 → 실행 확인 → 버전/환경 체크 → 트러블슈팅 → 연습문제 → 마무리 점검

---

## 13.1 텔레오퍼레이션이란

텔레옵(teleoperation)은 사람이 **원격으로 직접 조종**하는 것이다. 키보드·조이스틱 입력을
`/cmd_vel`(`Twist`) 명령으로 바꿔 발행한다. 자율주행 코드(9~11장)와 *출력 인터페이스가
동일*하다 — 둘 다 결국 `/cmd_vel`을 채운다.

```text
[키보드 텔레옵] ┐
                ├─→ /cmd_vel (Twist) → 로봇
[자율주행 노드] ┘
```

---

## 13.2 [따라하기] 키보드 텔레옵

표준 패키지로 바로 조종할 수 있다.

```bash
ros2 run turtlebot3_teleop teleop_keyboard
```

`w/x`(전후), `a/d`(좌우 회전), `s`(정지) 키로 움직인다. 다른 터미널에서 명령이 나가는지
확인:

```bash
ros2 topic echo /cmd_vel
```

> 💡 텔레옵을 켠 채 자율주행 노드도 켜면 **둘 다 `/cmd_vel`에 발행**해 충돌한다. 한 번에
> 하나만 쓰거나, 우선순위를 두는 먹스(twist_mux) 같은 장치를 쓴다(심화).

---

## 13.3 [따라하기] 시뮬레이션 월드 주행

TurtleBot3 Gazebo 월드를 띄우고 텔레옵으로 돌아다닌다.

```bash
export TURTLEBOT3_MODEL=burger
ros2 launch turtlebot3_gazebo turtlebot3_world.launch.py
# 다른 터미널
ros2 run turtlebot3_teleop teleop_keyboard
```

RViz로 라이다 점들을 함께 본다:

```bash
ros2 launch turtlebot3_bringup rviz2.launch.py     # 또는 rviz2 직접 실행 후 /scan 추가
```

벽 주위를 돌며 `/scan`이 어떻게 찍히는지 눈으로 익혀 두면, 14장 SLAM에서 지도가 만들어지는
원리가 직관적으로 이해된다.

> 🔁 **Foxy → Jazzy 메모**: `turtlebot3_gazebo`가 Harmonic용으로 갱신되어 월드/모델 경로가
> Classic 시절과 다르다. 실행 명령은 거의 같으나, 월드가 안 뜨면 패키지의 Jazzy 브랜치인지
> 확인한다.

---

## 13.4 직접 만든 텔레옵 (간단 버전)

원리를 이해하려면 직접 짜보는 게 좋다. 키 입력을 받아 `Twist`를 발행하는 최소 노드:

```python
import sys, termios, tty
import rclpy
from rclpy.node import Node
from geometry_msgs.msg import Twist


class MyTeleop(Node):
    def __init__(self):
        super().__init__("my_teleop")
        self.pub_ = self.create_publisher(Twist, "cmd_vel", 10)

    def get_key(self):
        fd = sys.stdin.fileno()
        old = termios.tcgetattr(fd)
        try:
            tty.setraw(fd)
            key = sys.stdin.read(1)
        finally:
            termios.tcsetattr(fd, termios.TCSADRAIN, old)
        return key

    def run(self):
        while rclpy.ok():
            key = self.get_key()
            cmd = Twist()
            if key == "w": cmd.linear.x = 0.2
            elif key == "s": cmd.linear.x = 0.0
            elif key == "a": cmd.angular.z = 0.5
            elif key == "d": cmd.angular.z = -0.5
            elif key == "\x03": break          # Ctrl+C
            self.pub_.publish(cmd)


def main(args=None):
    rclpy.init(args=args)
    node = MyTeleop()
    node.run()
    node.destroy_node()
    rclpy.shutdown()
```

---

## 코드 해설 · 실행 확인 · 버전 체크

- **코드 해설 포인트**: 키 입력을 Twist 메시지로 바꾸는 publisher loop와 안전 정지 처리를 해설한다.
- **실행 확인 포인트**: 로봇 이동, `/cmd_vel` echo, `/scan` 변화, 터미널 focus 조건을 확인한다.
- **버전/환경 체크**: 시뮬레이션과 실로봇 모두 `/cmd_vel`을 공유하지만 keyboard 입력 환경 차이를 표시한다.

## 13.5 트러블슈팅

| 증상 | 원인 | 해결 |
|---|---|---|
| 키를 눌러도 안 움직임 | 시뮬/로봇 미기동, 토픽 불일치 | `ros2 topic echo /cmd_vel`로 발행 확인 |
| 명령이 끊김 | 텔레옵 창 포커스 없음 | 텔레옵 터미널을 활성화한 채 입력 |
| 두 입력이 충돌 | 텔레옵+자율 동시 | 하나만 실행 |
| 월드가 안 뜸 | 패키지 버전(Classic) | Jazzy/Harmonic 브랜치 확인 |

---

## 13.6 연습문제

1. `turtlebot3_teleop` 사용 중 `/cmd_vel` 값을 echo해 키-속도 매핑을 표로 정리하라.
2. 13.4 노드에 속도 증가/감소 키(`+`/`-`)를 추가하라.
3. 시뮬 월드를 한 바퀴 돌며 `/odom` 위치 변화를 관찰하라.
4. 자율 주차 노드와 텔레옵이 동시에 `/cmd_vel`에 쓸 때 무슨 일이 나는지 실험·설명하라.

---

## 13.7 마무리 점검

- [ ] 텔레옵과 자율주행이 `/cmd_vel`을 공유함을 이해했다.
- [ ] 표준 텔레옵으로 로봇/시뮬을 조종했다.
- [ ] Gazebo 월드에서 주행하며 `/scan`을 관찰했다.
- [ ] 최소 텔레옵 노드를 직접 작성했다.

> **다음 장 예고** — 14장 **SLAM**: 텔레옵으로 돌아다니며 Cartographer로 **지도를 만든다.**

---

## 13.8 [워크드 예제] 속도 조절 키 추가

13.4의 최소 텔레옵에 속도 증감 키를 넣어 더 쓸 만하게 만든다.

```python
def run(self):
    lin, ang = 0.0, 0.0
    step = 0.05
    while rclpy.ok():
        key = self.get_key()
        if key == "w": lin += step
        elif key == "x": lin -= step
        elif key == "a": ang += step
        elif key == "d": ang -= step
        elif key == "s": lin, ang = 0.0, 0.0      # 정지
        elif key == "\x03": break
        cmd = Twist()
        cmd.linear.x = lin
        cmd.angular.z = ang
        self.pub_.publish(cmd)
        self.get_logger().info(f"lin={lin:.2f} ang={ang:.2f}")
```

누적식이라 키를 누를수록 빨라지고, `s`로 즉시 정지한다. 실로봇 테스트 전 **최대 속도
제한**(`min/max`)을 거는 습관을 들이면 안전하다.

## 13.9 twist_mux — 명령 충돌 해결(개념)

텔레옵과 자율주행이 동시에 `/cmd_vel`에 쓰면 명령이 뒤섞인다. 실무에서는 **twist_mux**로
여러 명령원에 우선순위를 매겨 하나만 통과시킨다(예: 사람 조종이 자율보다 우선).

```text
텔레옵  → /cmd_vel_teleop  ┐
자율    → /cmd_vel_auto    ┼─[twist_mux: 우선순위]─→ /cmd_vel → 로봇
조이스틱 → /cmd_vel_joy    ┘
```

지금은 "동시에 쓰면 충돌하니 하나만"으로 충분하고, 멀티 명령원이 필요해지면 twist_mux를
도입한다는 정도만 기억하자.

## 13.10 연습문제 해설(요약)

- **1번** `ros2 topic echo /cmd_vel` 하며 각 키를 눌러 `linear.x`/`angular.z` 매핑을 표로 정리.
- **2번** 위 13.8의 누적식 속도 조절이 정답.
- **3번** 월드 한 바퀴 돌며 `ros2 topic echo /odom`으로 `position` 변화 관찰.
- **4번** 둘 다 `/cmd_vel`에 발행하면 마지막 발행이 이기며 명령이 떨린다 → 13.9 twist_mux로 해결.

---

### 참고 자료
- `turtlebot3_teleop`, `turtlebot3_gazebo` 문서
- ROBOTIS e-Manual(Jazzy) — Simulation / Teleoperation
