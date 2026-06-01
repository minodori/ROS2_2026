# 10장. 프로젝트 2 — 로봇 복제(Spawn)

> **학습 목표 / 통합 개념**: 서비스(4장) · Gazebo(8장)
> - 시뮬레이션에 로봇을 **동적으로 생성(spawn)** 한다.
> - `ros_gz_sim`의 스폰 메커니즘을 서비스/노드 호출로 이해한다.
> - URDF를 파라미터로 넘겨 여러 대를 띄운다.

> **이번 장의 산출물**
> - Gazebo에 여러 로봇을 spawn하고 namespace로 구분한다.
> - 서비스/launch 기반 spawn 흐름을 실습 프로젝트로 정리한다.
>
> **공통 학습 흐름**: 개념 → 따라하기 → 코드 해설 → 실행 확인 → 버전/환경 체크 → 트러블슈팅 → 연습문제 → 마무리 점검

직진·정지(9장)는 로봇 한 대 이야기였다. 이번엔 *실행 중에* 로봇을 새로 등장시킨다 —
멀티 로봇·테스트 자동화의 기본기다.

---

## 10.1 무엇을 만드나

빈 월드에 로봇을 한 대 띄우고, 명령으로 **복제본을 추가 생성**한다. 핵심은 "요청을 보내면
서버가 객체를 만든다"는 4장 서비스 패턴이 시뮬레이터에도 그대로 적용된다는 점이다.

> 🔁 **Foxy → Jazzy 변화**: Classic 시절엔 `gazebo_ros`의 `/spawn_entity` 서비스를 호출했다.
> Harmonic에서는 `ros_gz_sim`의 **`create`** 실행파일(노드)이 같은 일을 한다. 런치에서
> `create`를 여러 번 호출하거나, 노드에서 스폰을 트리거한다.

---

## 10.2 [따라하기] 런치로 복제본 띄우기

가장 간단한 방법: 같은 URDF를 이름·좌표만 달리해 여러 번 스폰한다.

```python
# launch/spawn_clones.launch.py (요지)
from launch import LaunchDescription
from launch.actions import IncludeLaunchDescription
from launch.launch_description_sources import PythonLaunchDescriptionSource
from launch_ros.actions import Node
from ament_index_python.packages import get_package_share_directory
import os


def make_spawn(name, x, y):
    return Node(
        package="ros_gz_sim", executable="create",
        arguments=["-topic", "robot_description",
                   "-name", name, "-x", str(x), "-y", str(y)],
        output="screen",
    )


def generate_launch_description():
    gz = IncludeLaunchDescription(
        PythonLaunchDescriptionSource(os.path.join(
            get_package_share_directory("ros_gz_sim"),
            "launch", "gz_sim.launch.py")),
        launch_arguments={"gz_args": "empty.sdf"}.items())

    return LaunchDescription([
        gz,
        make_spawn("robot_a", 0.0, 0.0),
        make_spawn("robot_b", 1.5, 0.0),
        make_spawn("robot_c", 0.0, 1.5),
    ])
```

세 대가 서로 다른 위치에 생성된다.

---

## 10.3 [따라하기] 노드에서 동적 스폰 트리거

실행 중 임의 시점에 스폰하려면, 스폰을 수행하는 노드를 둔다. 개념적으로는 4장의
서비스 클라이언트와 같다 — "스폰 요청"을 보내는 것이다. 간단히는 노드가 새 좌표로
`create` 프로세스를 실행하도록 구성하거나, 커스텀 서비스(`SpawnRobot.srv`)를 정의해
서버가 스폰을 수행하게 한다.

커스텀 서비스 예 — `my_robot_interfaces/srv/SpawnRobot.srv`(6장 방식):

```text
string name
float64 x
float64 y
---
bool success
```

서버는 요청을 받아 해당 좌표에 로봇을 생성하고 `success`를 돌려준다. 클라이언트는
4.4절의 `call_async` 패턴 그대로 호출한다.

```bash
ros2 service call /spawn_robot my_robot_interfaces/srv/SpawnRobot \
  "{name: robot_d, x: 2.0, y: 2.0}"
```

> 💡 "런치로 정적 생성"(10.2)은 시작 시 고정 대수에, "서비스로 동적 생성"(10.3)은 실행 중
> 가변 생성에 쓴다. 두 방식의 쓰임새를 구분하는 게 이 장의 핵심 학습 포인트다.

---

## 10.4 여러 로봇과 네임스페이스

여러 대가 같은 토픽(`/cmd_vel`)을 쓰면 충돌한다. 각 로봇을 **네임스페이스**로 분리한다.

```python
Node(package="my_py_pkg", executable="parking",
     namespace="robot_a")     # → /robot_a/cmd_vel, /robot_a/scan
```

이렇게 하면 9장의 주차 노드를 로봇마다 하나씩 띄워 **멀티 로봇 주차**로 확장된다.

---

## 코드 해설 · 실행 확인 · 버전 체크

- **코드 해설 포인트**: entity spawn 명령, launch 인자, namespace와 토픽 분리 구조를 해설한다.
- **실행 확인 포인트**: `ros_gz_sim create` 실행, robot별 topic namespace, Gazebo 모델 생성을 확인한다.
- **버전/환경 체크**: Foxy의 `/spawn_entity` 예제와 Jazzy/Harmonic의 `ros_gz_sim create` 방식을 구분한다.

## 10.5 트러블슈팅

| 증상 | 원인 | 해결 |
|---|---|---|
| 두 번째 로봇이 안 뜸 | 같은 이름으로 스폰 | `-name`을 고유하게 |
| 토픽이 섞임 | 네임스페이스 없음 | `namespace=`로 분리 |
| `create` 실패 | `robot_description` 없음 | URDF를 토픽/파일로 제공 |
| Foxy 서비스 호출 실패 | `/spawn_entity`(Classic) 사용 | `ros_gz_sim create` 또는 커스텀 서비스로 |

---

## 10.6 연습문제

1. 런치에서 로봇을 3×3 격자로 9대 스폰하라(좌표 계산 반복문).
2. `SpawnRobot.srv`를 정의하고 스폰 서비스 서버·클라이언트를 작성하라.
3. 네임스페이스로 두 로봇에 각각 주차 노드를 띄워 동시에 동작시켜라.
4. (생각해보기) 스폰을 토픽/서비스/액션 중 무엇으로 모델링하는 게 적절한가? 이유는?

---

## 10.7 마무리 점검

- [ ] `ros_gz_sim create`로 로봇을 시뮬레이션에 생성할 수 있다.
- [ ] 런치(정적)·서비스(동적) 두 스폰 방식을 구분한다.
- [ ] 네임스페이스로 멀티 로봇 토픽을 분리할 수 있다.
- [ ] Foxy `/spawn_entity` → Jazzy `create` 차이를 안다.

> **다음 장 예고** — 11장 **미로 탈출**: 액션(5장)으로 "목표를 주고, 진행을 보고받고,
> 막히면 취소하는" 본격 자율 주행을 만든다. 토픽·서비스·액션이 한 프로젝트에 모인다.

---

## 10.8 [워크드 예제] 격자로 9대 스폰

좌표를 반복문으로 계산해 3×3 격자에 로봇을 띄운다. 런치가 *프로그램*이라는 점(7장)이
여기서 빛난다.

```python
def generate_launch_description():
    actions = [gz_sim()]            # 8.5의 Gazebo 실행 포함
    idx = 0
    for r in range(3):
        for c in range(3):
            actions.append(Node(
                package="ros_gz_sim", executable="create",
                arguments=["-topic", "robot_description",
                           "-name", f"robot_{idx}",
                           "-x", str(r * 1.5), "-y", str(c * 1.5)],
                output="screen"))
            idx += 1
    return LaunchDescription(actions)
```

`-name`을 `robot_0`…`robot_8`로 **고유하게** 준 것이 핵심(같은 이름이면 두 번째부터 스폰 실패).

## 10.9 멀티 로봇 — 네임스페이스 한 번 더

9장 주차 노드를 로봇마다 띄우려면 토픽이 겹치지 않게 분리한다.

```python
for i in range(3):
    Node(package="my_py_pkg", executable="parking",
         namespace=f"robot_{i}")      # /robot_0/scan, /robot_0/cmd_vel ...
```

```bash
ros2 topic list | grep cmd_vel
# /robot_0/cmd_vel  /robot_1/cmd_vel  /robot_2/cmd_vel
```

각 로봇이 자기 네임스페이스 안의 `scan`을 구독하고 `cmd_vel`을 발행하므로, 같은 코드를
재사용하면서 서로 간섭하지 않는다.

## 10.10 연습문제 해설(요약)

- **1번** 위 10.8의 이중 반복문이 정답.
- **2번** `SpawnRobot.srv`(6장) 정의 후, 서버 콜백에서 요청 좌표로 `create`를 트리거하고
  `response.success=True`. 클라이언트는 4.4의 `call_async` 패턴.
- **3번** 10.9처럼 `namespace=`로 두 로봇에 주차 노드를 각각 띄운다.
- **4번** 스폰은 "요청하고 결과(성공/실패)를 받는" 1회성 작업 → **서비스**가 적합. 단,
  스폰 후 위치 도달까지 오래 걸리는 시나리오라면 액션도 고려.

---

### 참고 자료
- `ros_gz_sim`(create) 문서, ROS 2 네임스페이스 튜토리얼
- 대조 코드(MIT): `gcamp_ros2_basic` gcamp_gazebo `spawn_entity`
