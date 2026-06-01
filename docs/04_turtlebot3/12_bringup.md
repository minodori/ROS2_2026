# 12장. TurtleBot3 구성과 Bringup

> **학습 목표**
> - TurtleBot3의 하드웨어/소프트웨어 구성을 이해한다.
> - 실로봇과 PC의 네트워크(같은 `ROS_DOMAIN_ID`)를 맞춘다.
> - `turtlebot3_bringup`으로 로봇을 기동(bringup)하고 센서·구동 토픽을 확인한다.

> **이번 장의 산출물**
> - TurtleBot3 bringup을 실행하고 `/scan`, `/odom`, `/tf`를 확인한다.
> - 실로봇 네트워크와 환경 변수를 점검하는 체크리스트를 만든다.
>
> **공통 학습 흐름**: 개념 → 따라하기 → 코드 해설 → 실행 확인 → 버전/환경 체크 → 트러블슈팅 → 연습문제 → 마무리 점검

2권 3부까지는 시뮬레이션이었다. 4부는 **실제 로봇** TurtleBot3로 옮겨, 시뮬에서 검증한
개념(토픽·SLAM·내비)을 하드웨어에서 돌린다.

> 🔁 이 책의 turtlebot3 패키지는 **Jazzy + Gazebo Harmonic**으로 검증된 포크를 쓴다.
> 원본 ROBOTIS e-Manual의 Jazzy 탭과 항상 대조한다.

---

## 12.1 TurtleBot3 한눈에

TurtleBot3(Burger/Waffle)는 교육·연구용 표준 이동 로봇이다.

```text
[원격 PC]  ── Wi-Fi ──  [TurtleBot3(SBC: 라즈베리파이 등)]
  RViz/Nav2/SLAM            OpenCR(모터제어) + LDS(라이다)
```

- **SBC**(라즈베리파이): ROS 2 노드 실행, 라이다 처리
- **OpenCR**: 모터·IMU 제어 보드(펌웨어)
- **LDS-02**: 360° 라이다 → `/scan`
- 바퀴 엔코더 → `/odom`

핵심 토픽은 9~11장에서 시뮬로 다룬 것과 **동일**하다: `/scan`, `/odom`, `/cmd_vel`.
즉 코드가 거의 그대로 옮겨진다.

---

## 12.2 설치 — PC와 로봇 양쪽

원격 PC(Ubuntu 24.04 + Jazzy)에 TurtleBot3 패키지 설치:

```bash
sudo apt install ros-jazzy-turtlebot3 ros-jazzy-turtlebot3-msgs
# (시뮬레이션용)
sudo apt install ros-jazzy-turtlebot3-simulations
```

모델 지정(쉘마다 또는 `~/.bashrc`):

```bash
export TURTLEBOT3_MODEL=burger
```

로봇 SBC에는 ROBOTIS 가이드대로 SBC 이미지/패키지를 설치하고 OpenCR 펌웨어를 올린다
(하드웨어별 절차는 e-Manual의 Jazzy 탭 참조).

---

## 12.3 네트워크 — DOMAIN_ID 맞추기

ROS 2는 마스터가 없으므로(1장), **PC와 로봇이 같은 `ROS_DOMAIN_ID`** 이고 같은 네트워크에
있으면 서로의 노드를 자동 발견한다.

```bash
# PC와 로봇 양쪽 모두 동일하게
export ROS_DOMAIN_ID=30
```

> ⚠️ 강의실처럼 여러 팀이 한 네트워크를 쓰면 팀마다 다른 DOMAIN_ID를 써야 토픽이 섞이지
> 않는다(1.5.3절). 통신이 안 되면 ① 같은 ID인지 ② 같은 서브넷인지부터 본다.

---

## 12.4 [따라하기] Bringup

로봇 SBC에 접속(ssh)해 기동:

```bash
# (로봇 SBC에서)
ros2 launch turtlebot3_bringup robot.launch.py
```

원격 PC에서 토픽이 보이는지 확인:

```bash
# (PC에서)
ros2 topic list
# /scan  /odom  /cmd_vel  /tf  /battery_state ...
ros2 topic echo /scan --once
ros2 topic hz /odom
```

`/scan`·`/odom`이 흐르면 로봇이 정상 기동된 것이다.

---

## 12.5 시뮬레이션으로 미리 연습

실로봇이 없거나 준비 전이라면, 동일 인터페이스의 Gazebo 시뮬로 연습할 수 있다.

```bash
ros2 launch turtlebot3_gazebo turtlebot3_world.launch.py
```

> 💡 이 책의 권장 흐름: **시뮬에서 12~15장을 먼저 끝까지 돌려보고**, 그다음 실로봇으로
> 옮긴다. 토픽 이름이 같아 코드 수정이 거의 없다. (맥 VM 사용자는 부록 A 참고)

---

## 코드 해설 · 실행 확인 · 버전 체크

- **코드 해설 포인트**: bringup launch, `TURTLEBOT3_MODEL`, `ROS_DOMAIN_ID`, 네트워크 설정의 의미를 해설한다.
- **실행 확인 포인트**: `ros2 launch turtlebot3_bringup robot.launch.py`, topic list/echo, TF 확인을 수행한다.
- **버전/환경 체크**: Jazzy 패키지명, TurtleBot3 모델 환경 변수, 실로봇 네트워크 조건을 기준으로 정리한다.

## 12.6 트러블슈팅

| 증상 | 원인 | 해결 |
|---|---|---|
| PC에서 토픽 안 보임 | DOMAIN_ID/서브넷 불일치 | 양쪽 ID·네트워크 확인 |
| `/scan` 없음 | 라이다 미기동 | bringup 로그·라이다 전원 확인 |
| 모델 오류 | `TURTLEBOT3_MODEL` 미설정 | `export TURTLEBOT3_MODEL=burger` |
| 기동은 되나 안 움직임 | OpenCR 펌웨어/배선 | 펌웨어 재업로드, `/cmd_vel` 테스트 |

`/cmd_vel`로 직접 움직임 테스트:

```bash
ros2 topic pub /cmd_vel geometry_msgs/msg/Twist "{linear: {x: 0.1}}" --once
```

---

## 12.7 연습문제

1. PC·로봇의 `ROS_DOMAIN_ID`를 일부러 다르게 해 통신 단절을 재현하고, 원인을 설명하라.
2. bringup 후 `ros2 topic list`로 토픽을 분류하라(센서/구동/상태).
3. 9장 주차 노드를 토픽 수정 없이 TurtleBot3(또는 시뮬)에 적용해 보라.
4. `/battery_state`를 echo해 배터리 상태를 모니터링하라.

---

## 12.8 마무리 점검

- [ ] TurtleBot3의 SBC/OpenCR/LDS 구성을 설명할 수 있다.
- [ ] PC·로봇의 DOMAIN_ID·네트워크를 맞췄다.
- [ ] bringup으로 `/scan`·`/odom`을 확인했다.
- [ ] 시뮬과 실로봇의 토픽이 동일함을 이해했다.

> **다음 장 예고** — 13장 텔레오퍼레이션으로 직접 조종하고, 시뮬레이션 월드에서 주행한다.

---

## 12.9 [워크드 예제] 통신 진단 루틴

실로봇이 PC와 통신하는지 확인하는 표준 순서다. 시뮬에서도 동일하게 쓴다.

```bash
# ① 같은 도메인인지 (PC·로봇 양쪽에서)
echo $ROS_DOMAIN_ID
# ② 노드가 보이나
ros2 node list                 # /turtlebot3_node 등이 보여야 함
# ③ 핵심 토픽이 흐르나
ros2 topic hz /scan            # 라이다 주기(보통 5Hz 내외)
ros2 topic hz /odom            # 오도메트리 주기
# ④ 움직임 테스트(짧게)
ros2 topic pub --once /cmd_vel geometry_msgs/msg/Twist "{linear: {x: 0.1}}"
ros2 topic pub --once /cmd_vel geometry_msgs/msg/Twist "{linear: {x: 0.0}}"   # 정지
```

①~③이 모두 통과하면 SLAM(14장)·Nav2(15장)로 넘어갈 준비가 됐다.

## 12.10 시뮬 ↔ 실로봇 — 무엇이 같고 다른가

| 항목 | 시뮬레이션 | 실로봇 |
|---|---|---|
| 토픽(`/scan`,`/odom`,`/cmd_vel`) | 동일 | 동일 |
| `use_sim_time` | **True** | False(생략) |
| 기동 | `turtlebot3_gazebo` 런치 | `turtlebot3_bringup` (로봇 SBC) |
| 네트워크 | 불필요 | DOMAIN_ID·서브넷 일치 필요 |
| 코드 | — | **거의 그대로 이식** |

> 📌 토픽이 같기 때문에, 시뮬에서 검증한 9~11장 노드를 실로봇에 올릴 때 **코드 수정이
> 거의 없다.** 이것이 "시뮬 먼저, 실로봇 다음" 전략의 핵심 이점이다.

## 12.11 연습문제 해설(요약)

- **1번** PC·로봇 ID를 다르게 두면 `ros2 node list`에 상대가 안 보인다 — 디스커버리가 도메인으로
  격리되기 때문(1.8절).
- **2번** 센서(`/scan`,`/imu`), 구동(`/cmd_vel`,`/odom`), 상태(`/battery_state`,`/tf`)로 분류.
- **3번** 9장 주차 노드는 `/scan` 구독·`/cmd_vel` 발행이라 TB3에서 토픽 수정 없이 동작.
- **4번** `ros2 topic echo /battery_state`로 전압·퍼센트 확인.

---

### 참고 자료
- ROBOTIS TurtleBot3 e-Manual(Jazzy 탭) — https://emanual.robotis.com/docs/en/platform/turtlebot3/overview/
- 패키지: `turtlebot3`(이 포크), `turtlebot3_simulations`
