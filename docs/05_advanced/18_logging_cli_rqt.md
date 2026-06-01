# 18장. 로깅 · CLI · rqt 디버깅

> **학습 목표**
> - 로그 레벨을 구분해 효과적으로 로깅한다.
> - 핵심 `ros2` CLI를 한눈에 정리한다.
> - rqt·RViz·`rosbag2`·tf 도구로 시스템을 들여다본다.
> - "안 될 때 무엇부터 보는가"의 디버깅 순서를 체득한다.

> **이번 장의 산출물**
> - ROS 2 debugging CLI와 GUI 도구 사용 순서를 정리한다.
> - logging, rosbag2, tf2, rqt/RViz를 한 장의 진단 흐름으로 묶는다.
>
> **공통 학습 흐름**: 개념 → 따라하기 → 코드 해설 → 실행 확인 → 버전/환경 체크 → 트러블슈팅 → 연습문제 → 마무리 점검

마지막 장. 새 기능이 아니라, 지금까지 만든 것을 **들여다보고 고치는** 도구들을 정리한다.
실전에서 가장 오래 쓰는 기술이다.

---

## 18.1 로깅 — 레벨을 가려 쓰기

`get_logger()`는 다섯 레벨을 제공한다. 상황에 맞게 골라 써야 로그가 신호가 된다.

```python
self.get_logger().debug("세부 변수 추적용")     # 평소엔 숨김
self.get_logger().info("정상 흐름 알림")
self.get_logger().warn("이상하지만 계속 가능")
self.get_logger().error("기능 실패")
self.get_logger().fatal("치명적, 중단")
```

실행 시 레벨 조절(디버그까지 보기):

```bash
ros2 run my_py_pkg parking --ros-args --log-level debug
```

> 💡 `info`를 매 콜백마다 찍으면 로그가 폭주해 정작 중요한 게 묻힌다. 고빈도 콜백에는
> `get_logger().info(..., throttle_duration_sec=1.0)`처럼 주기 제한을 쓴다.

---

## 18.2 ros2 CLI 총정리

이 책에서 쓴 명령을 한 표로 모은다. **디버깅의 출발점**이다.

```bash
# 노드/그래프
ros2 node list                 ros2 node info /노드
# 토픽
ros2 topic list                ros2 topic echo /토픽
ros2 topic info /토픽 --verbose  ros2 topic hz /토픽
ros2 topic pub /토픽 타입 "{...}"
# 서비스 / 액션
ros2 service list / call ...    ros2 action list / send_goal ...
# 인터페이스
ros2 interface show 타입
# 파라미터
ros2 param list / get / set
# 실행
ros2 run 패키지 실행파일          ros2 launch 패키지 파일.launch.py
# 패키지
ros2 pkg list                   ros2 pkg executables 패키지
# Lifecycle
ros2 lifecycle set/get/list /노드
```

---

## 18.3 시각화·기록 도구

### rqt — GUI 도구 모음
```bash
rqt                  # 플러그인 허브(토픽 모니터, 서비스 콜러, 로그 뷰어 등)
rqt_graph            # 노드-토픽 연결 그래프(누가 누구와 통신하나)
rqt_console          # 로그를 레벨별로 필터링해 보기
```

### RViz — 3D 시각화
라이다(`/scan`), 지도(`/map`), 로봇 모델, 경로(Nav2)를 한 화면에서 본다. 14·15장에서 이미
썼다. "센서가 무엇을 보는가"를 눈으로 확인하는 1순위 도구.

### rosbag2 — 기록과 재생
```bash
ros2 bag record /scan /odom /cmd_vel     # 토픽을 파일로 기록
ros2 bag play rosbag2_2026.../           # 그대로 재생(로봇 없이 디버깅)
ros2 bag info rosbag2_2026.../
```
실로봇 주행을 한 번 기록해 두면, 로봇 없이도 알고리즘을 반복 테스트할 수 있다.

### tf2 — 좌표 변환 점검
```bash
ros2 run tf2_tools view_frames          # TF 트리를 PDF로 저장
ros2 run tf2_ros tf2_echo map base_link # 두 프레임 간 변환 출력
```
SLAM·Nav2 문제의 상당수가 TF 문제다(14·15장 트러블슈팅 참고).

---

## 18.4 디버깅 순서 — "안 될 때 무엇부터"

경험칙을 순서로 굳혀 둔다.

1. **노드가 떴나?** — `ros2 node list`
2. **토픽이 흐르나?** — `ros2 topic list` → `ros2 topic hz/echo`
3. **이름·타입이 맞나?** — `ros2 topic info --verbose` (양쪽 대조)
4. **QoS가 호환되나?** — `--verbose`의 Reliability/Durability (16장)
5. **시간/좌표가 맞나?** — `use_sim_time`, TF 트리 (14·15장)
6. **그래도?** — `--log-level debug`, `rqt_graph`로 연결 시각화, `rosbag`으로 재현

> 📌 90%는 1~4단계에서 끝난다. "코드부터 의심"하기 전에 **CLI로 바깥부터** 좁혀 간다.

---

## 코드 해설 · 실행 확인 · 버전 체크

- **코드 해설 포인트**: logger level, ros2 CLI, rqt/RViz/rosbag/tf2 사용 지점을 해설한다.
- **실행 확인 포인트**: graph 점검, rosbag record/play, TF 확인, log level 변경을 수행한다.
- **버전/환경 체크**: Jazzy의 rosbag2, rqt plugin, CLI 제공 범위를 기준으로 점검한다.

## 18.5 트러블슈팅(메타)

| 증상 | 먼저 볼 것 |
|---|---|
| 콜백이 안 옴 | 토픽 이름/타입 → QoS |
| 노드가 안 보임 | DOMAIN_ID/소싱 |
| SLAM/Nav2 이상 | `use_sim_time`, TF 트리 |
| 재현이 어려움 | `rosbag`으로 기록·재생 |
| 로그가 너무 많음 | 레벨 조정·throttle |

---

## 18.6 연습문제

1. 주차 노드의 로그를 레벨별로 정리하고, `--log-level`로 출력 범위를 바꿔 보라.
2. `rqt_graph`로 9장(또는 15장) 실행 중 노드-토픽 그래프를 캡처해 설명하라.
3. `/scan /odom /cmd_vel`을 `rosbag`으로 기록한 뒤 재생해 노드가 동작하는지 확인하라.
4. `view_frames`로 Nav2 실행 중 TF 트리를 저장해 `map→odom→base_link` 연결을 확인하라.

---

## 18.7 마무리 점검

- [ ] 로그 레벨을 구분해 사용할 수 있다.
- [ ] 핵심 `ros2` CLI로 시스템을 점검할 수 있다.
- [ ] rqt·RViz·rosbag2·tf2 도구를 용도에 맞게 쓴다.
- [ ] "안 될 때" 바깥(CLI)부터 좁혀 가는 순서를 체득했다.

---

## 책을 마치며

1권에서 ROS 2의 개념과 통신 4종·시뮬레이션 기초를 익히고, 2권에서 시뮬 프로젝트 3종과
TurtleBot3 실로봇·SLAM·Nav2, 그리고 신뢰성·운영(QoS·Lifecycle·디버깅)까지 한 사이클을
완주했다. 여기서 익힌 "토픽으로 흐름을, 서비스로 요청을, 액션으로 장기 작업을, 런치로
시스템을 조립한다"는 패턴은 어떤 ROS 2 로봇에도 그대로 적용된다.

다음 단계로는 매니퓰레이터(MoveIt 2), 다중 로봇, 행동트리(BehaviorTree)·Nav2 커스터마이징,
실제 센서 융합 등이 기다린다. 이 책의 워크스페이스가 그 출발점이 되길 바란다.

---

## 18.8 [워크드 예제] rosbag으로 로봇 없이 디버깅

실로봇·시뮬을 매번 띄우지 않고, 한 번 기록한 데이터로 알고리즘을 반복 테스트한다.

```bash
# ① 주행 한 번 기록(시뮬/실로봇 동작 중)
ros2 bag record -o run1 /scan /odom /cmd_vel /tf /tf_static
#    Ctrl+C 로 종료 → run1/ 디렉터리 생성

# ② 로봇 없이 재생
ros2 bag play run1
#    동시에 내 노드(예: 주차)를 띄우면, 기록된 /scan을 받아 동작한다

# ③ 무엇이 들었나
ros2 bag info run1
```

> 📌 알고리즘을 고칠 때마다 로봇을 다시 돌릴 필요가 없다 — 같은 입력(`run1`)으로 결과를
> 비교하면 변경의 효과가 명확히 보인다. 디버깅·튜닝의 강력한 도구다.

## 18.9 로깅을 신호로 만드는 습관

로그가 많으면 정작 중요한 게 묻힌다. 세 가지 습관:

- **레벨을 구분**: 평소 흐름은 `info`, 추적용 세부는 `debug`(평소 숨김), 문제는 `warn`/`error`.
- **고빈도 콜백엔 throttle**: 매 스캔마다 찍지 말고 주기 제한.
  ```python
  self.get_logger().info(f"front={front:.2f}", throttle_duration_sec=1.0)
  ```
- **한 번만 찍을 것은 once**: 초기화 완료 메시지 등.
  ```python
  self.get_logger().info("준비 완료", once=True)
  ```

## 18.10 연습문제 해설(요약)

- **1번** 노드에 `debug`/`info`/`warn`을 섞어 두고 `--log-level debug`와 기본을 비교하면 출력 범위가 다르다.
- **2번** `rqt_graph` 실행 → 노드(타원)·토픽(사각형) 연결을 캡처해, 누가 무엇을 발행/구독하는지 설명.
- **3번** 위 18.8의 record/play가 정답. 재생 중 노드를 띄워 동작 확인.
- **4번** `ros2 run tf2_tools view_frames` → `frames.pdf`에서 `map→odom→base_link` 사슬 확인.

---

### 참고 자료
- ROS 2 Jazzy — Logging / CLI tools / rqt / rosbag2 / tf2
- 표윤석 교재 3부(Logging·CLI), 본문 전반의 트러블슈팅 절
