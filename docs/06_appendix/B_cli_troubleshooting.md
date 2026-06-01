# 부록 B. ROS 2 명령어 치트시트 & 트러블슈팅 총정리

> 본문 전반에서 쓴 `ros2` 명령과 문제 해결을 한곳에 모았다. 실습 중 옆에 펼쳐 두는 용도다.

---

## B.1 명령어 치트시트

### 노드 / 그래프
```bash
ros2 node list                 # 실행 중 노드
ros2 node info /노드           # 노드의 토픽/서비스/액션
rqt_graph                      # 노드-토픽 연결 그래프(GUI)
```

### 토픽
```bash
ros2 topic list                # 토픽 목록
ros2 topic echo /토픽          # 메시지 출력
ros2 topic info /토픽 --verbose # 타입·QoS·연결 수
ros2 topic hz /토픽            # 발행 주기(Hz)
ros2 topic bw /토픽            # 대역폭
ros2 topic pub /토픽 타입 "{...}"  # CLI 직접 발행
ros2 topic pub --once /토픽 타입 "{...}"  # 한 번만
```

### 서비스 / 액션
```bash
ros2 service list                       # 서비스 목록
ros2 service type /서비스               # 타입
ros2 service call /서비스 타입 "{...}"   # 호출
ros2 action list                        # 액션 목록
ros2 action info /액션                  # 정보
ros2 action send_goal /액션 타입 "{...}" --feedback  # 목표 전송+피드백
```

### 인터페이스 / 파라미터
```bash
ros2 interface show 타입       # msg/srv/action 구조
ros2 interface list            # 전체 인터페이스
ros2 param list                # 파라미터 목록
ros2 param get /노드 파라미터   # 값 조회
ros2 param set /노드 파라미터 값 # 값 변경
ros2 param dump /노드          # YAML로 덤프
```

### 실행 / 빌드 / 패키지
```bash
ros2 run 패키지 실행파일                     # 노드 실행
ros2 run 패키지 실행파일 --ros-args -p 키:=값 # 파라미터 주입
ros2 launch 패키지 파일.launch.py            # 런치
ros2 pkg create 이름 --build-type ament_python --dependencies rclpy
ros2 pkg list                                # 패키지 목록
ros2 pkg executables 패키지                  # 실행 가능 노드
colcon build                                 # 전체 빌드
colcon build --packages-select 패키지        # 일부만
colcon build --symlink-install               # 심볼릭 링크(Python 편의)
source install/setup.bash                    # 오버레이 소싱
```

### Lifecycle / 진단 / 기록
```bash
ros2 lifecycle set /노드 configure|activate|deactivate
ros2 lifecycle get /노드
ros2 run tf2_tools view_frames               # TF 트리 PDF
ros2 run tf2_ros tf2_echo 프레임1 프레임2    # 변환 출력
ros2 bag record /토픽1 /토픽2                # 기록
ros2 bag play 디렉터리                        # 재생
ros2 doctor                                  # 환경 점검
```

---

## B.2 환경 변수 빠른 참조

```bash
echo $ROS_DISTRO            # jazzy
echo $ROS_DOMAIN_ID         # 통신 격리(같은 값끼리만 통신)
echo $RMW_IMPLEMENTATION    # DDS 구현(기본 Fast DDS)
export TURTLEBOT3_MODEL=burger  # TB3 모델(4부)
```

---

## B.3 트러블슈팅 — 증상별 총정리

### 통신이 안 될 때 (가장 흔함)
| 증상 | 점검 순서 |
|---|---|
| 노드가 안 보임 | ① 소싱(`source install/setup.bash`) ② `ROS_DOMAIN_ID` 동일 ③ 같은 네트워크 |
| 토픽 echo는 되는데 콜백 안 옴 | ① 토픽 이름·타입(`topic info`) ② **QoS 호환**(16장, `--verbose`) |
| 센서(`/scan`) 콜백 없음 | `qos_profile_sensor_data`(BEST_EFFORT)로 구독 |
| 늦게 켠 노드가 지도/상태 못 받음 | 발행측 `TRANSIENT_LOCAL`(래치) |

### 빌드/실행
| 증상 | 해결 |
|---|---|
| `ros2 run`이 노드 못 찾음 | `console_scripts`(Py)/`add_executable`(C++) 등록 + 재빌드 + 소싱 |
| `colcon: command not found` | `sudo apt install ros-dev-tools` |
| `No module named ...` | `package.xml`에 `<depend>` 추가 |
| 노란 경고 다발(빌드는 됨) | Ubuntu 24.04/Python 3.12 setuptools 경고 — 무시 가능 |
| 빌드 캐시 꼬임 | `rm -rf build install log` 후 재빌드 |

### 시뮬레이션(Gazebo Harmonic)
| 증상 | 해결 |
|---|---|
| `gz sim` 실행 안 됨 | `sudo apt install ros-jazzy-ros-gz` |
| 스폰 실패 | Foxy `spawn_entity.py` → `ros_gz_sim`의 `create` |
| cmd_vel/scan이 ROS에 안 옴 | `ros_gz_bridge`로 토픽 매핑(`@`) |
| 화면 느림(맥 VM) | 부록 A — 단순 월드·headless+RViz |

### SLAM / Nav2
| 증상 | 해결 |
|---|---|
| 지도 깨짐 | `use_sim_time`(시뮬=True, 실로봇=False) 일관 |
| 지도 안 그려짐 | `/scan`·`/tf` 확인, `view_frames`로 TF 트리 점검 |
| 로봇이 엉뚱히 감 | RViz `2D Pose Estimate` 재설정 |
| 목표 출발 안 함 | 자유 공간에 목표 재지정, costmap 확인 |

---

## B.4 디버깅 황금 순서

> "코드부터 의심"하지 말고 **바깥(CLI)부터** 좁혀라.

1. 노드가 떴나? → `ros2 node list`
2. 토픽이 흐르나? → `ros2 topic hz / echo`
3. 이름·타입 맞나? → `ros2 topic info --verbose`
4. QoS 호환되나? → `--verbose`의 Reliability/Durability
5. 시간·좌표 맞나? → `use_sim_time`, TF 트리
6. 그래도면 → `--log-level debug`, `rqt_graph`, `ros2 bag`로 재현

대부분의 문제는 1~4에서 해결된다.

---

## B.5 참고 링크 모음

- ROS 2 Jazzy 문서: https://docs.ros.org/en/jazzy/
- Gazebo Harmonic: https://gazebosim.org/docs/harmonic
- Nav2: https://docs.nav2.org
- TurtleBot3 e-Manual: https://emanual.robotis.com/docs/en/platform/turtlebot3/overview/
- 오로카(한글 커뮤니티): https://cafe.naver.com/openrt
