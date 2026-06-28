# [집필자 내부 노트] 세 참고서 추가 반영 계획

> 이 문서는 출간 본문이 아니라, `00_전자책/ROS2/ros2_2026` vault의 참고 정리를 현재
> `ROS2_2026` 원고에 어떻게 반영할지 정리한 집필 기준표다. 원문을 옮기지 않고, 집필에 필요한
> 관점과 실습 요소만 재구성한다.

## 참고 자료의 역할

| 자료 | 원고에서의 역할 | 반영 수준 |
|---|---|---|
| Francisco Martín Rico, *A Concise Introduction to Robot Programming with ROS2* | ROS 2를 이해시키는 이론 프레임: Community, Computation Graph, Workspace, TF, 반응형 행동, Behavior Tree/Nav2 | 설명 구조와 장별 관점으로 반영 |
| 桑欣, *ROS2机器人开发：从入门到实践* | Python/rclpy 중심 실습 흐름: turtlesim, 패키지, 토픽/서비스/파라미터/launch, TF, RViz, rosbag, URDF/Gazebo, Nav2, micro-ROS | 실습 순서와 누락 실습 후보로 반영 |
| *Innovative Robotics with ROS2 and Python* | AI/HRI/멀티로봇/미래 응용 아이디어 | 본문 핵심이 아니라 확장 박스·부록 후보로 제한 반영 |
| 조용환, 「서비스 로봇을 위한 ROS2 기반 소프트웨어 아키텍처」 | Python 기반 서비스 로봇 아키텍처 사례, 모듈화, 멀티프로세싱, 서비스 로봇 사례 | 17장·부록·확장 프로젝트 사례로 반영 후보 |

## 현재 원고에 이미 반영된 요소

- 8장에 좌표계/TF 기초 추가: `map -> odom -> base_link -> 센서 프레임`, `static_transform_publisher`,
  `tf2_echo`, `view_frames`, RViz Fixed Frame 기준.
- 11장에 OpenCV 출구 마커 인식 실습 확장: `cv_bridge`, HSV 마스크, `exit_marker_seen`, 액션 서버의
  `escaped()` 판정 연결.
- README 차별점에 좌표계/TF와 OpenCV 출구 마커 인식 추가.

## 추가로 반영할 핵심 요소

### 1장: ROS 2를 보는 세 가지 렌즈

Rico식 프레임을 1장 도입부에 짧게 넣는다.

- **Community**: ROS 2는 패키지·문서·GitHub·질문 문화까지 포함한 생태계다.
- **Computation Graph**: 실행 중인 시스템은 노드와 통신 관계의 그래프다.
- **Workspace**: 개발 중인 프로젝트는 패키지, 의존성, 빌드 결과, `install/setup`의 정적 구조다.

적용 방식:

- 1.1 뒤에 `ROS 2를 보는 세 가지 렌즈` 박스 추가.
- 2장으로 넘어갈 때 `실행 그래프와 파일 구조를 구분하라`는 연결 문장 추가.

### 2장: Workspace와 실행 그래프 분리

초보자는 파일 구조와 실행 중 그래프를 자주 혼동한다. 2장에 다음 비교표를 추가한다.

| 관점 | 묻는 질문 | 대표 도구 |
|---|---|---|
| Workspace | 코드는 어디에 있고 어떻게 빌드되는가? | `colcon`, `package.xml`, `setup.py`, `CMakeLists.txt` |
| Computation Graph | 지금 어떤 노드가 어떤 토픽으로 연결되는가? | `ros2 node`, `ros2 topic`, `rqt_graph` |

추가 후보:

- underlay/overlay 그림.
- `source /opt/ros/jazzy/setup.bash`와 `source install/setup.bash`의 역할 비교.

### 3~5장: 계산 그래프 먼저 그리기

토픽·서비스·액션 장은 코드 전에 매번 작은 계산 그래프를 제시한다.

- 3장 토픽: publisher -> topic -> subscriber.
- 4장 서비스: client -> service server -> response.
- 5장 액션: goal, feedback, result, cancel 흐름.

추가 후보:

- 표준 메시지를 먼저 쓰는 이유.
- 토픽/서비스/액션 선택 기준 표.
- Nav2의 `NavigateToPose`가 액션이라는 예고.

### 6~7장: Python 중심 설정 흐름 강화

중국어 책 정리에서 가져올 실습 요소:

- 파라미터 validation.
- YAML 파라미터 파일.
- launch argument, remapping, namespace를 하나의 예제로 통합.
- 같은 노드를 namespace만 바꿔 여러 번 실행하는 예.

주의:

- 현재 README는 Python과 C++ 병행을 차별점으로 둔다.
- 출간 전략을 Python-first로 좁힐 경우, C++ 예제는 비교 박스 또는 웹 보충 자료로 낮춘다.

### 8장: TF를 책 전체의 축으로 유지

이미 좌표계/TF 기초는 들어갔다. 다음 단계는 Python 실습 보강이다.

추가 후보:

- `tf2_ros.StaticTransformBroadcaster` 예제.
- `tf2_ros.TransformBroadcaster`로 움직이는 `odom -> base_link` 맛보기.
- `Buffer`와 `TransformListener`로 transform 조회.
- RViz TF 디스플레이 스크린샷 직접 제작.

### 9장: 주차 프로젝트를 반응형 행동 입문으로 확장

Rico의 Reactive Behavior/VFF 관점을 9장에 녹인다.

추가 후보:

- 전방 거리 하나만 보는 주차.
- 전방 구간 평균을 쓰는 주차.
- 좌우 거리 비교 기반 회피.
- VFF 장애물 회피 미니 프로젝트.
- RViz Marker로 전방 거리·회피 벡터 표시.

효과:

- 단순 `/scan` -> `/cmd_vel` 예제가 `센서 -> 판단 -> 행동` 구조로 격상된다.
- 11장 미로 탈출과 15장 Nav2로 자연스럽게 이어진다.

### 10장: 멀티로봇 기초 보강

Innovative 책은 깊이는 낮지만 멀티로봇 목차 아이디어로 쓸 수 있다.

추가 후보:

- namespace가 필요한 이유.
- `/robot_1/cmd_vel`, `/robot_2/cmd_vel`.
- TF frame 이름 충돌과 prefix.
- `ROS_DOMAIN_ID`로 네트워크/실습 그룹 분리.
- 멀티로봇에서 QoS와 DDS 설정이 문제가 되는 지점.

### 11장: OpenCV와 센서 동기화 확장

OpenCV 출구 마커 인식은 반영 완료. 다음 단계는 센서 동기화 맛보기다.

추가 후보:

- 카메라 이미지와 라이다/오도메트리 timestamp 차이.
- `message_filters` 개념 소개.
- rosbag으로 이미지·라이다·오도메트리를 함께 기록해 재현 테스트.

### 14~15장: SLAM/Nav2 보강

중국어 책의 자율주행 흐름과 Rico의 Nav2/Behavior Tree 관점을 결합한다.

14장 추가 후보:

- `slam_toolbox` 대안 박스.
- 지도가 안 나올 때 TF, `use_sim_time`, `/scan`을 보는 순서.

15장 추가 후보:

- Nav2 구성요소 한눈에 보기: map server, localization, planner, controller, costmap, BT navigator.
- Behavior Tree는 Nav2가 행동 흐름을 조립하는 방식이라는 설명.
- waypoint navigation과 patrol project 예고.
- recovery behavior와 costmap inflation 튜닝 박스.

### 16~18장: 고급 실행과 디버깅 보강

중국어 책의 고급 ROS 2 장에서 가져올 후보:

- executor와 callback group.
- `message_filters`.
- DDS/RMW vendor와 LAN 통신 설정.
- rosbag 기반 재현 테스트.
- 디버깅 황금 순서: topic -> graph -> params -> TF -> time -> QoS -> bag.

17장에는 조용환 논문의 서비스 로봇 아키텍처 사례를 박스로 넣을 수 있다.

- Python AI 모듈: STT, TTS, Object Detection.
- GIL 때문에 multiprocessing이 필요한 경우.
- control board와 app board 분리.
- 서빙 로봇/사람 팔로잉 로봇 사례.

## 우선순위

| 우선순위 | 반영 항목 | 이유 |
|---|---|---|
| P0 | 1장 세 가지 렌즈, 2장 Workspace/Graph 비교, 15장 Nav2 구성요소/BT | 책의 설명 축이 또렷해짐 |
| P1 | 9장 VFF+Marker, 10장 멀티로봇 namespace/TF prefix, 14장 slam_toolbox 대안 | 실습 차별점 강화 |
| P2 | 11장 message_filters, 16~18장 DDS/RMW/LAN, micro-ROS 부록 | 고급 독자용 확장 |
| P3 | AI/HRI/STT/TTS, 미래 로봇 응용 | 본문보다는 부록/에필로그 적합 |

## 저작권·검증 원칙

- 참고서 원문·코드·그림은 복제하지 않는다.
- 목차 수준의 사실 정보와 집필 관점만 사용한다.
- 모든 명령과 코드는 ROS 2 Jazzy, Ubuntu 24.04, Gazebo Harmonic 기준으로 재검증한다.
- 스크린샷과 다이어그램은 직접 제작한다.
- AI/HRI/멀티로봇 같은 일반론은 실제 ROS 2 실습으로 검증 가능한 경우에만 본문에 넣는다.
