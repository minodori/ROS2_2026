# 7장. 런치 시스템

> **학습 목표**
> - 런치 파일이 왜 필요한지 설명한다.
> - Python 런치 파일로 여러 노드를 한 번에 띄운다.
> - 노드 리매핑·파라미터·인자(arguments)를 런치에서 다룬다.
> - **Foxy → Jazzy 런치 문법 차이**를 정확히 안다(이 책의 포팅 핵심).

> **이번 장의 산출물**
> - 여러 노드를 한 번에 실행하는 launch 파일을 작성한다.
> - 파라미터, remap, launch argument를 한 흐름으로 다룬다.
>
> **공통 학습 흐름**: 개념 → 따라하기 → 코드 해설 → 실행 확인 → 버전/환경 체크 → 트러블슈팅 → 연습문제 → 마무리 점검

---

## 7.1 왜 런치인가

지금까지 노드 하나당 터미널 하나를 열어 `ros2 run`으로 켰다. 노드가 2~3개면 괜찮지만,
실제 로봇 시스템은 센서·구동·SLAM·내비게이션까지 수십 개 노드가 동시에 떠야 한다. 매번
손으로 켤 수는 없다.

**런치(launch)** 는 "어떤 노드들을, 어떤 설정으로, 한꺼번에 실행하라"를 파일 하나로
기술한다. ROS 2는 **Python 런치 파일**(`.launch.py`)을 기본으로 쓴다(XML/YAML도 가능).

---

## 7.2 [따라하기] 첫 런치 파일

런치 파일은 보통 별도의 *bringup* 패키지에 둔다.

```bash
cd ~/ros2_ws/src
ros2 pkg create my_robot_bringup --build-type ament_cmake
cd my_robot_bringup && mkdir launch
```

`launch/number_app.launch.py`:

```python
from launch import LaunchDescription
from launch_ros.actions import Node


def generate_launch_description():
    ld = LaunchDescription()

    publisher = Node(
        package="my_py_pkg",
        executable="number_publisher",
    )
    subscriber = Node(
        package="my_py_pkg",
        executable="number_subscriber",
    )

    ld.add_action(publisher)
    ld.add_action(subscriber)
    return ld
```

`CMakeLists.txt`에 launch 폴더 설치 추가:

```cmake
install(DIRECTORY launch DESTINATION share/${PROJECT_NAME})
```

빌드 후 실행 — **노드 둘이 한 번에** 뜬다:

```bash
cd ~/ros2_ws && colcon build --packages-select my_robot_bringup
source install/setup.bash
ros2 launch my_robot_bringup number_app.launch.py
```

---

## 7.3 리매핑·파라미터·이름 바꾸기

런치는 노드를 *조립*하는 곳이다. 이름을 바꾸고, 토픽을 갈아끼우고, 파라미터를 주입한다.

```python
    publisher = Node(
        package="my_py_pkg",
        executable="number_publisher",
        name="my_number_publisher",                 # 노드 이름 변경
        remappings=[("number", "my_number")],       # 토픽 number → my_number
        parameters=[{"publish_period": 0.5}],        # 파라미터 주입
    )
```

YAML 파라미터 파일을 통째로 물릴 수도 있다:

```python
import os
from ament_index_python.packages import get_package_share_directory

config = os.path.join(
    get_package_share_directory("my_robot_bringup"), "config", "params.yaml")

publisher = Node(
    package="my_py_pkg", executable="configurable_publisher",
    parameters=[config],
)
```

---

## 7.4 런치 인자(arguments)

실행 시점에 값을 받는다(예: 로봇 이름).

```python
from launch import LaunchDescription
from launch.actions import DeclareLaunchArgument
from launch.substitutions import LaunchConfiguration
from launch_ros.actions import Node


def generate_launch_description():
    robot_name = LaunchConfiguration("robot_name")
    return LaunchDescription([
        DeclareLaunchArgument("robot_name", default_value="turtle"),
        Node(
            package="my_py_pkg", executable="configurable_publisher",
            parameters=[{"robot_name": robot_name}],
        ),
    ])
```

```bash
ros2 launch my_robot_bringup number_app.launch.py robot_name:=racer
```

---

## 7.5 ⚠️ Foxy → Jazzy 런치 차이 (포팅 핵심)

> 이 책이 기반으로 삼는 gcamp 예제는 **Foxy**로 작성되었다. 런치는 배포판 간 변화가 가장
> 큰 영역이라, Jazzy로 옮길 때 아래를 반드시 점검한다.

1. **시뮬레이터 실행 방식이 완전히 바뀜**: Foxy는 Gazebo **Classic**(`gazebo_ros`의
   `gzserver`/`gzclient`, `spawn_entity.py`)을 런치에서 직접 호출했다. Jazzy는 **Gazebo
   Harmonic**을 `ros_gz_sim`으로 띄운다. 즉 gcamp의 `gazebo.launch.py` 류는 그대로 안 돌고,
   `ros_gz_sim`의 `gz_sim.launch.py` 포함 + `create`(스폰)로 재작성해야 한다(8·10장).
2. **브리지**: Classic의 `gazebo_ros` 플러그인 → Harmonic은 `ros_gz_bridge`로 토픽을
   ROS↔Gazebo 연결. 런치에 브리지 노드가 추가된다.
3. **substitutions/패키지 경로 API**는 대체로 호환되나, deprecated된 임포트 경로가 있으면
   경고가 뜬다 — 최신 `launch`/`launch_ros` import로 정리한다.
4. **권장 작업법**: 런치는 처음부터 다시 쓴다는 마음으로 접근하고, Jazzy에서 검증된 구조
   (`ROS-2-from-Scratch` ch9·ch13)와 대조한다.

---

## 7.6 디버깅

```bash
ros2 launch <pkg> <file>.launch.py        # 실행
ros2 launch <pkg> <file>.launch.py -d     # 디버그 로그
ros2 node list                            # 런치로 뜬 노드 확인
```

런치가 노드를 못 띄우면: ① 패키지·실행파일 이름 오타 ② 빌드/소싱 누락 ③ launch 폴더가
`install/`에 설치됐는지(CMake `install(DIRECTORY launch ...)`)를 차례로 의심한다.

---

## 코드 해설 · 실행 확인 · 버전 체크

- **코드 해설 포인트**: `LaunchDescription`, `Node`, `DeclareLaunchArgument`, substitution 사용 지점을 해설한다.
- **실행 확인 포인트**: `ros2 launch`와 argument override로 실행 결과가 달라지는지 확인한다.
- **버전/환경 체크**: Foxy에서 Jazzy로 넘어오며 달라진 launch/Gazebo 실행 관례를 표시한다.

## 7.7 트러블슈팅

| 증상 | 원인 | 해결 |
|---|---|---|
| `file not found` | launch 미설치 | CMake `install(DIRECTORY launch ...)` 후 재빌드 |
| 노드가 안 뜸 | executable 이름 오타 | `ros2 pkg executables <pkg>`로 확인 |
| 파라미터 미반영 | YAML 노드 이름 불일치 | YAML 최상위 키 = 런치의 `name`과 일치 |
| Gazebo 런치 실패 | Foxy(Classic) 문법 잔존 | §7.5대로 `ros_gz_sim`으로 재작성 |

---

## 7.8 연습문제

1. 퍼블리셔·서브스크라이버를 띄우되, 토픽을 `chatter`로 리매핑하는 런치를 작성하라.
2. 런치 인자 `period`를 받아 발행 주기에 연결하라.
3. params.yaml을 `config/`에 두고 런치에서 불러오도록 CMake 설치 규칙을 추가하라.
4. (조사) Foxy의 Gazebo 런치와 Jazzy(`ros_gz_sim`)의 차이를 세 줄로 정리하라.

---

## 7.9 마무리 점검

- [ ] 런치가 필요한 이유(다수 노드 일괄 실행)를 설명할 수 있다.
- [ ] Python 런치로 여러 노드를 띄우고 리매핑·파라미터를 적용했다.
- [ ] 런치 인자를 선언·사용할 수 있다.
- [ ] Foxy→Jazzy 런치 차이(특히 Gazebo)를 안다.

> **다음 장 예고** — 8장에서 **Gazebo Harmonic**과 **URDF**로 들어간다. 1권의 마지막이자
> 2권 시뮬레이션 프로젝트의 토대다.

---

## 7.10 [워크드 예제] 파라미터 YAML까지 묶은 런치

실무 런치는 보통 ① 노드 여러 개 ② 각자 파라미터 YAML ③ 리매핑을 한 파일에 모은다.
`my_robot_bringup`에 `config/number.yaml`을 두고 런치에서 물린다.

`config/number.yaml`:

```yaml
configurable_publisher:
  ros__parameters:
    publish_period: 0.3
    robot_name: "bringup_bot"
```

`launch/full_app.launch.py`:

```python
import os
from launch import LaunchDescription
from launch_ros.actions import Node
from ament_index_python.packages import get_package_share_directory


def generate_launch_description():
    cfg = os.path.join(
        get_package_share_directory("my_robot_bringup"), "config", "number.yaml")
    return LaunchDescription([
        Node(package="my_py_pkg", executable="configurable_publisher",
             parameters=[cfg]),
        Node(package="my_py_pkg", executable="number_subscriber",
             remappings=[("number", "number")]),
    ])
```

`CMakeLists.txt`에 `install(DIRECTORY launch config DESTINATION share/${PROJECT_NAME})`를
넣어 launch·config 둘 다 설치해야 한다(config 누락이 흔한 실수다).

## 7.11 런치 파일 형식 비교

ROS 2는 세 가지 런치 형식을 지원한다. 이 책은 **Python**을 기본으로 한다.

| 형식 | 장점 | 단점 |
|---|---|---|
| **Python**(`.launch.py`) | 조건·반복·경로계산 등 프로그래밍 가능 | 문법이 다소 장황 |
| XML(`.launch.xml`) | 간결, 정적 구성에 적합 | 동적 로직 불가 |
| YAML(`.launch.yaml`) | 가장 간결 | 동적 로직 불가 |

Gazebo 포함·좌표 계산·인자 분기처럼 **로직이 필요한 런치는 Python**이 사실상 표준이다.

## 7.12 연습문제 해설(요약)

- **1번** `Node(..., remappings=[("number", "chatter")])`를 퍼블리셔·서브스크라이버 양쪽에 동일 적용.
- **2번** `DeclareLaunchArgument("period")` + `LaunchConfiguration("period")`를
  `parameters=[{"publish_period": period}]`에 연결(7.4 참고).
- **3번** 7.10처럼 `install(DIRECTORY launch config ...)`로 config 설치 후 `parameters=[cfg]`.
- **4번** Foxy=Gazebo Classic(`gazebo_ros`, `spawn_entity.py`), Jazzy=Harmonic(`ros_gz_sim`의
  `gz_sim.launch.py` 포함 + `create`), 브리지는 `ros_gz_bridge`. 런치를 새로 쓰는 게 안전(7.5).

---

### 참고 자료
- ROS 2 Jazzy — Launch 튜토리얼 / `ros_gz_sim`
- 대조 코드(MIT): `gcamp_ros2_basic` 각 패키지 launch, `ROS-2-from-Scratch` ch9·ch13
