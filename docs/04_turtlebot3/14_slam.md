# 14장. Cartographer로 SLAM

> **학습 목표**
> - SLAM이 무엇이고 왜 필요한지 설명한다.
> - Cartographer로 실시간 지도를 작성한다.
> - 완성된 지도를 저장해 다음 장(Nav2)에서 재사용한다.

> **이번 장의 산출물**
> - Cartographer SLAM을 실행해 지도를 만든다.
> - 완성된 map 파일을 저장하고 다음 장 Nav2 입력으로 준비한다.
>
> **공통 학습 흐름**: 개념 → 따라하기 → 코드 해설 → 실행 확인 → 버전/환경 체크 → 트러블슈팅 → 연습문제 → 마무리 점검

---

## 14.1 SLAM이란

**SLAM(Simultaneous Localization And Mapping)** 은 "지도를 모르는 환경에서, **지도를 만들며
동시에 내 위치를 추정**"하는 기술이다. 닭과 달걀 문제 — 위치를 알아야 지도를 그리고, 지도가
있어야 위치를 안다 — 를 라이다·오도메트리를 결합해 푼다.

입력과 출력:

```text
입력: /scan(라이다) + /odom(주행거리) + /tf(좌표변환)
출력: /map (nav_msgs/OccupancyGrid)  ← 점유 격자 지도
```

TurtleBot3는 SLAM 백엔드로 **Cartographer**(구글)를 표준으로 쓴다.

---

## 14.2 [따라하기] SLAM 실행

세 가지를 동시에 띄운다: ① 로봇/시뮬 ② SLAM ③ 텔레옵(돌아다니며 지도 채우기).

```bash
# 터미널 1 — 시뮬(또는 실로봇 bringup)
export TURTLEBOT3_MODEL=burger
ros2 launch turtlebot3_gazebo turtlebot3_world.launch.py

# 터미널 2 — Cartographer SLAM
ros2 launch turtlebot3_cartographer cartographer.launch.py use_sim_time:=True

# 터미널 3 — 텔레옵
ros2 run turtlebot3_teleop teleop_keyboard
```

RViz가 자동으로 떠 지도가 실시간으로 그려진다. 텔레옵으로 **빈 곳을 천천히 빠짐없이**
돌면 벽(검은 선)과 자유 공간(흰색)이 채워진다.

> ⚠️ `use_sim_time:=True`는 **시뮬레이션일 때만**. 실로봇에서는 생략(또는 False). 이걸
> 잘못 두면 TF 시간 불일치로 지도가 깨진다 — 흔한 실수다.

---

## 14.3 좋은 지도를 위한 요령

- **천천히** 움직인다. 급회전은 오도메트리 오차를 키운다.
- 같은 곳을 다시 지나면(루프 클로저) 지도가 보정된다 — 한 바퀴 돌아 출발점에 복귀.
- 라이다 사거리를 넘는 넓은 공간은 가까이 가서 채운다.

---

## 14.4 [따라하기] 지도 저장

지도가 충분히 채워지면 저장한다. `nav2_map_server`의 저장 도구를 쓴다.

```bash
ros2 run nav2_map_server map_saver_cli -f ~/maps/my_world
```

두 파일이 생긴다:

- `my_world.pgm` — 점유 격자 이미지
- `my_world.yaml` — 해상도·원점 등 메타데이터

이 `.yaml`을 15장 Nav2에서 불러 자율주행의 바탕 지도로 쓴다.

> 🔁 **Foxy → Jazzy 메모**: `cartographer.launch.py`·`map_saver_cli`의 사용법은 큰 틀이
> 같으나, 패키지가 Jazzy로 갱신되며 일부 파라미터·실행 인자가 바뀌었을 수 있다. 실행이
> 막히면 ROBOTIS e-Manual의 Jazzy SLAM 절과 대조한다.

---

## 14.5 SLAM의 동작 직관

Cartographer는 라이다 스캔들을 차곡차곡 맞춰 붙이며(스캔 매칭) 지도를 키운다. 오도메트리는
대략의 이동을, 라이다는 정밀한 형상을 제공해 서로 보완한다. 루프 클로저로 누적 오차를
교정한다. 깊은 수학은 심화 주제이고, 여기서는 "스캔을 정렬해 붙이고, 다시 만난 지점에서
보정한다"는 직관이면 충분하다.

---

## 코드 해설 · 실행 확인 · 버전 체크

- **코드 해설 포인트**: SLAM launch가 사용하는 `/scan`, `/odom`, `/tf`와 map saver 흐름을 해설한다.
- **실행 확인 포인트**: RViz에서 map이 확장되는지 보고 `map_saver_cli` 결과 파일을 확인한다.
- **버전/환경 체크**: `use_sim_time`, TF frame, Jazzy에서의 Cartographer 패키지 availability를 점검한다.

## 14.6 트러블슈팅

| 증상 | 원인 | 해결 |
|---|---|---|
| 지도가 깨짐/겹침 | `use_sim_time` 불일치 | 시뮬=True, 실로봇=False |
| 지도가 안 그려짐 | `/scan`·`/tf` 누락 | 토픽·TF 트리 확인(`ros2 run tf2_tools view_frames`) |
| 회전 시 크게 틀어짐 | 너무 빠른 주행 | 천천히 이동 |
| 저장 실패 | 경로/패키지 문제 | `~/maps` 디렉터리 생성, `nav2_map_server` 설치 |

---

## 14.7 연습문제

1. 시뮬 월드 전체 지도를 완성해 저장하라. `.pgm`을 이미지 뷰어로 열어 확인하라.
2. 빠르게 돌 때와 천천히 돌 때 지도 품질을 비교하라.
3. 루프 클로저(출발점 복귀) 전후의 지도 보정을 관찰하라.
4. `/map` 토픽을 `ros2 topic echo --once`로 떠서 메타데이터(해상도·크기)를 확인하라.

---

## 14.8 마무리 점검

- [ ] SLAM의 입력(`/scan`,`/odom`,`/tf`)과 출력(`/map`)을 안다.
- [ ] Cartographer로 실시간 지도를 작성했다.
- [ ] `use_sim_time`의 의미와 주의점을 안다.
- [ ] 지도를 `.pgm`/`.yaml`로 저장했다.

> **다음 장 예고** — 15장 **Nav2**: 방금 만든 지도 위에서 목표점을 찍으면 로봇이 스스로
> 경로를 만들어 찾아간다. 2권의 피날레다.

---

## 14.9 [워크드 예제] SLAM부터 저장까지 전체 흐름

처음 끝까지 한 번에 따라 하는 체크리스트다. 시뮬 기준.

```bash
# ① 시뮬 + ② SLAM + ③ 텔레옵 (각각 다른 터미널)
export TURTLEBOT3_MODEL=burger
ros2 launch turtlebot3_gazebo turtlebot3_world.launch.py
ros2 launch turtlebot3_cartographer cartographer.launch.py use_sim_time:=True
ros2 run turtlebot3_teleop teleop_keyboard

# ④ 천천히 전 구역을 돌아 지도를 채운다(RViz에서 실시간 확인)
#    출발점으로 복귀하면 루프 클로저로 지도가 보정된다

# ⑤ 지도 저장
mkdir -p ~/maps
ros2 run nav2_map_server map_saver_cli -f ~/maps/my_world
ls ~/maps                     # my_world.pgm  my_world.yaml
```

`.yaml`을 열어 `resolution`(보통 0.05 = 5cm/픽셀)과 `origin`을 확인해 두면 15장 Nav2에서
좌표 감을 잡기 쉽다.

## 14.10 지도가 잘 안 나올 때 — TF부터 본다

SLAM 문제의 대부분은 좌표 변환(TF)에서 온다.

```bash
ros2 run tf2_tools view_frames           # TF 트리를 PDF로 저장
# map → odom → base_link → base_scan 으로 이어져야 정상
ros2 topic hz /scan                       # 라이다가 흐르나
ros2 param get /cartographer_node use_sim_time   # 시뮬이면 True여야
```

`map→odom` 변환이 없으면 SLAM 노드가 안 떴거나 `use_sim_time` 불일치다. TF 트리가 끊긴
지점이 곧 문제 지점이다.

## 14.11 연습문제 해설(요약)

- **1번** 14.9 흐름대로 전 구역을 돌아 저장. `.pgm`을 이미지 뷰어로 열면 흑(벽)·백(자유)·회(미탐사).
- **2번** 빠르게 돌면 오도메트리 오차 누적으로 벽이 겹치거나 휜다 → 천천히가 품질에 직결.
- **3번** 출발점 복귀 직전·직후를 비교하면 루프 클로저로 전체가 한 번 보정되는 것을 본다.
- **4번** `ros2 topic echo /map --once`로 `info.resolution`·`width`·`height` 확인.

---

### 참고 자료
- `turtlebot3_cartographer`, Cartographer ROS — https://google-cartographer-ros.readthedocs.io
- `nav2_map_server`(map_saver) 문서
