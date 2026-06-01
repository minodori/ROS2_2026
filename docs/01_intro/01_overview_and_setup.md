# 1장. ROS 2 개요와 개발 환경 구축

> **학습 목표**
> - ROS와 ROS 2가 무엇이며, ROS 1과 무엇이 다른지 설명할 수 있다.
> - ROS 2가 DDS 위에서 동작하는 이유와 그 이점을 이해한다.
> - 2026년 시점에서 왜 **Jazzy Jalisco**를 선택하는지 근거를 댈 수 있다.
> - Ubuntu 24.04에 ROS 2 Jazzy를 설치하고 동작을 확인한다.

> **이번 장의 산출물**
> - ROS 2 Jazzy 설치 상태를 확인하고 기본 데모 노드를 실행한다.
> - `talker`/`listener`와 `rqt_graph`로 ROS 그래프를 눈으로 확인한다.
>
> **공통 학습 흐름**: 개념 → 따라하기 → 코드 해설 → 실행 확인 → 버전/환경 체크 → 트러블슈팅 → 연습문제 → 마무리 점검

---

## 1.1 ROS란 무엇인가

ROS(Robot Operating System)는 이름에 'OS'가 붙어 있지만 운영체제가 아니라, 로봇
소프트웨어를 만들기 위한 **미들웨어이자 개발 도구 모음**이다. 로봇은 센서(라이다, 카메라,
IMU), 구동기(모터), 그리고 이들을 잇는 수많은 계산 노드로 이루어진다. ROS는 이 조각들이
**메시지를 주고받으며 협력**하도록 표준화된 통신·빌드·도구 생태계를 제공한다.

핵심 아이디어는 단순하다.

- 기능을 **노드(node)** 라는 작은 프로그램 단위로 쪼갠다.
- 노드들은 **토픽 / 서비스 / 액션**이라는 약속된 방식으로 데이터를 교환한다.
- 어떤 노드가 어떤 언어(Python, C++)로 짜였는지는 서로 신경 쓰지 않는다.

이 "느슨하게 결합된 분산 노드" 구조가 ROS의 본질이며, 2부에서 통신 3종을 차례로 다룬다.

---

## 1.2 ROS 1과 ROS 2의 차이

ROS 1은 2007년부터 연구·교육 현장을 지배했지만, 산업 현장에 쓰기엔 구조적 한계가 있었다.
ROS 2는 그 한계를 정면으로 고쳐 설계를 새로 했다.

| 항목 | ROS 1 | ROS 2 |
|---|---|---|
| 통신 핵심 | 자체 TCPROS + **roscore(마스터)** | **DDS** 기반, 마스터 없음(분산 디스커버리) |
| 실시간성 | 약함 | 실시간 지원 강화 |
| 멀티 로봇 | 까다로움 | DDS 도메인으로 자연스럽게 분리 |
| 보안 | 거의 없음 | SROS2(인증·암호화) 내장 |
| 지원 OS | 주로 Linux | Linux · Windows · macOS |
| 빌드 도구 | `catkin` | `colcon` + `ament` |

가장 큰 변화는 **마스터(roscore)의 제거**다. ROS 1은 모든 노드가 중앙 마스터에 등록되어야
서로를 찾을 수 있었고, 마스터가 죽으면 전체가 멈췄다. ROS 2는 DDS의 분산 디스커버리로
노드들이 **서로를 직접 발견**한다. 단일 장애점이 사라진 것이다.

---

## 1.3 DDS — ROS 2의 통신 토대

DDS(Data Distribution Service)는 OMG가 표준화한 산업용 발행/구독 통신 미들웨어다.
항공·국방·금융처럼 신뢰성이 생명인 분야에서 검증된 기술이며, ROS 2는 이 위에 얹혀 있다.

DDS가 ROS 2에 주는 이점:

- **분산 디스커버리**: 중앙 서버 없이 노드들이 자동으로 서로를 찾는다.
- **QoS(Quality of Service)**: 신뢰성·내구성·전송 주기 등을 정책으로 조절한다(16장).
- **데이터 중심**: "어떤 데이터가 어디로 흐르는가"를 토픽 단위로 관리한다.

ROS 2는 특정 DDS 구현에 종속되지 않도록 **RMW(ROS Middleware) 추상화 계층**을 둔다.
Jazzy의 기본 RMW는 `rmw_fastrtps_cpp`(eProsima Fast DDS)이며, 환경 변수로 교체할 수 있다.

```bash
echo $RMW_IMPLEMENTATION   # 비어 있으면 기본값(Fast DDS) 사용
```

> 📌 **지금은 외워둘 것 하나**: ROS 2에서 노드가 서로 통신이 안 되면, 십중팔구 ① 같은
> `ROS_DOMAIN_ID`인가 ② QoS가 호환되는가 — 이 둘을 먼저 의심한다.

---

## 1.4 왜 Jazzy인가 — 2026년 배포판 선택

ROS 2는 매년 5월 새 배포판을 내고, 짝수 해 배포판이 **LTS(장기 지원)** 다. 2026년 6월
현재 선택지는 다음과 같다.

| 배포판 | 출시 | 지원 종료 | 생태계(TB3·Nav2·Gazebo) |
|---|---|---|---|
| Humble | 2022.5 | 2027.5 | 매우 성숙하나 곧 종료 |
| **Jazzy Jalisco** | **2024.5** | **2029.5 (LTS)** | ✅ **완전 지원** |
| Kilted Kaiju | 2025.5 | 2026.11 (비LTS) | 부분적 |
| Lyrical Luth | 2026.5 | 2031.5 (LTS) | ⚠️ 출시 직후 — 미성숙 |

이 교재는 **Jazzy Jalisco**를 택한다. 이유는 분명하다.

1. **안정성** — LTS로 2029년까지 지원되어 교재 수명과 맞는다.
2. **생태계 성숙** — TurtleBot3, Nav2, Cartographer가 **Gazebo Harmonic**과 함께
   공식 검증되어 있다. 실습이 "빌드 안 되는" 사고가 가장 적다.
3. **최신 Lyrical의 함정** — 가장 새 LTS지만 출시 직후라 핵심 로봇 패키지 포팅이
   끝나지 않았다. 입문 교재의 실습 토대로는 위험하다.

즉 Jazzy는 **"안정성과 최신성의 최적 균형점"** 이다.

> 🔁 **Foxy → Jazzy 차이 (이 책 전반의 주의)**
> 원본 gcamp 실습은 **Foxy + Gazebo Classic** 기반이다. Jazzy로 오며 바뀐 대표적인 점:
> - 시뮬레이터가 **Gazebo Classic → Gazebo(구 Ignition) Harmonic** 으로 교체됨
> - `gazebo_ros` 플러그인 → `ros_gz` 패키지(`ros_gz_sim`, `ros_gz_bridge`)
> - 런치 파일에서 Classic 전용 노드/태그 제거
> - 일부 `rclpy`/`rclcpp` API 정리
> 각 장에서 해당 코드가 나올 때 구체적으로 다시 짚는다.

---

## 1.5 개발 환경 구축

### 1.5.1 전제 — Ubuntu 24.04

ROS 2 Jazzy의 1순위(Tier 1) 플랫폼은 **Ubuntu 24.04 LTS (Noble Numbat)** 다. 다음 중
하나를 권장한다.

- **네이티브 설치** — 성능 최상, 실로봇 연동에 유리(권장).
- **VirtualBox/UTM 가상머신** — 입문 실습용으로 충분.
- **Docker 컨테이너** — 환경 오염 없이 깔끔(고급 사용자).
- **WSL2(Windows)** — GUI(Gazebo)는 추가 설정 필요, 입문엔 비권장.

> 💡 Apple Silicon Mac 사용자는 UTM으로 Ubuntu 24.04(arm64)를 띄우거나, arm64 ROS 2
> Docker 이미지를 쓰면 된다. 본 교재 저자 환경도 macOS이므로 부록에 별도 안내를 둔다.

### 1.5.2 ROS 2 Jazzy 설치 (apt, 데비안 패키지)

아래는 공식 문서 기준의 표준 설치 순서다. (전체 명령은 항상
[공식 설치 문서](https://docs.ros.org/en/jazzy/Installation.html)와 대조할 것)

```bash
# 1) 로캘 설정 (UTF-8)
sudo apt update && sudo apt install -y locales
sudo locale-gen en_US en_US.UTF-8
sudo update-locale LC_ALL=en_US.UTF-8 LANG=en_US.UTF-8
export LANG=en_US.UTF-8

# 2) ROS 2 apt 저장소 추가에 필요한 도구
sudo apt install -y software-properties-common curl
sudo add-apt-repository universe

# 3) ROS 2 GPG 키 + 저장소 등록
sudo curl -sSL https://raw.githubusercontent.com/ros/rosdistro/master/ros.key \
  -o /usr/share/keyrings/ros-archive-keyring.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/ros-archive-keyring.gpg] \
http://packages.ros.org/ros2/ubuntu $(. /etc/os-release && echo $UBUNTU_CODENAME) main" \
  | sudo tee /etc/apt/sources.list.d/ros2.list > /dev/null

# 4) 설치 (데스크톱 풀버전: RViz, 데모, 튜토리얼 포함)
sudo apt update
sudo apt install -y ros-jazzy-desktop

# 5) 개발 도구 (colcon, rosdep 등)
sudo apt install -y ros-dev-tools
```

> ⚠️ 위 키/저장소 등록 방식은 시점에 따라 갱신될 수 있다. 설치가 막히면 **반드시 공식
> 문서의 최신 절차**를 따르라. 패키지명은 `ros-jazzy-*` 규칙을 따른다.

### 1.5.3 환경 설정(sourcing)

ROS 2 명령을 쓰려면 매 셸에서 setup 스크립트를 불러와야 한다. 매번 치기 번거로우니
`~/.bashrc`에 등록한다.

```bash
echo "source /opt/ros/jazzy/setup.bash" >> ~/.bashrc
source ~/.bashrc
```

확인:

```bash
printenv ROS_DISTRO        # → jazzy
echo $ROS_DOMAIN_ID        # (비어 있으면 0번 도메인)
```

> 📌 **`ROS_DOMAIN_ID`**: 같은 네트워크에서 여러 사람이 실습하면 서로의 노드가 섞여
> 보인다. 강의실에서는 학번 등으로 각자 다른 값을 지정하면 충돌을 막을 수 있다.
> ```bash
> export ROS_DOMAIN_ID=42
> ```

### 1.5.4 동작 확인 — talker / listener

설치가 제대로 됐는지 확인하는 고전적인 방법. **터미널 2개**를 연다.

터미널 1 (발행자):
```bash
ros2 run demo_nodes_cpp talker
```

터미널 2 (구독자):
```bash
ros2 run demo_nodes_py listener
```

터미널 1이 `Publishing: 'Hello World: 1, 2, 3...'`를 찍고, 터미널 2가 같은 메시지를
`I heard: ...`로 받으면 성공이다. **C++ 노드(talker)와 Python 노드(listener)가 서로
통신**하고 있다는 점에 주목하라 — 이것이 1.1절에서 말한 "언어에 무관한 통신"의 실물이다.

이때 다른 터미널에서 흐름을 들여다볼 수 있다.

```bash
ros2 node list          # 실행 중인 노드 목록
ros2 topic list         # 살아 있는 토픽 목록 (/chatter 가 보인다)
ros2 topic echo /chatter   # 토픽으로 흐르는 메시지를 직접 출력
```

---

## 코드 해설 · 실행 확인 · 버전 체크

- **코드 해설 포인트**: 설치 명령, 환경 설정, 데모 실행 명령이 어떤 순서로 연결되는지 설명한다.
- **실행 확인 포인트**: `printenv ROS_DISTRO`, `ros2 run demo_nodes_cpp talker`, `ros2 run demo_nodes_py listener`, `rqt_graph` 결과를 확인한다.
- **버전/환경 체크**: Jazzy/Ubuntu 24.04/Gazebo Harmonic 기준으로 쓰고, Foxy·Humble 자료와 혼용되는 지점을 표시한다.

## 1.6 마무리 점검

이 장을 끝냈다면 다음을 할 수 있어야 한다.

- [ ] ROS 1 대비 ROS 2의 핵심 변화(마스터 제거, DDS, QoS)를 한 문장씩 설명한다.
- [ ] 왜 이 교재가 Jazzy를 골랐는지 근거 두 가지를 댄다.
- [ ] Ubuntu 24.04에 Jazzy를 설치하고 `ROS_DISTRO=jazzy`를 확인했다.
- [ ] talker/listener 예제로 노드 간 통신을 두 눈으로 확인했다.

> **다음 장 예고** — 2장에서는 실제로 내 코드를 담을 그릇인 **워크스페이스**를 만들고,
> `colcon`으로 빌드하는 흐름을 익힌다. 여기서부터 직접 패키지를 만든다.

---

## 1.7 한 걸음 더 — RMW와 디스커버리

1.3절에서 ROS 2가 DDS 위에 있고, **RMW**가 그 사이의 추상화 계층이라고 했다. 조금 더 보자.

ROS 2는 같은 코드를 **여러 DDS 구현** 위에서 돌릴 수 있다. 환경 변수 하나로 교체된다.

```bash
export RMW_IMPLEMENTATION=rmw_fastrtps_cpp   # 기본(eProsima Fast DDS)
# export RMW_IMPLEMENTATION=rmw_cyclonedds_cpp  # Cyclone DDS (설치 시)
ros2 doctor --report | grep middleware        # 현재 RMW 확인
```

노드들이 서로를 찾는 과정을 **디스커버리(discovery)** 라 한다. 같은 네트워크의 같은
`ROS_DOMAIN_ID`를 가진 노드들은 자동으로 서로를 발견한다. 외부와 분리해 *내 PC 안에서만*
통신하려면:

```bash
export ROS_LOCALHOST_ONLY=1     # 이 PC 내부로만 한정(강의실 충돌 방지에 유용)
```

> 📌 강의실 실습에서 "옆 사람 노드가 내 토픽 목록에 보인다"면, ① 각자 다른
> `ROS_DOMAIN_ID` ② 또는 `ROS_LOCALHOST_ONLY=1` 로 해결한다.

## 1.8 [워크드 예제] 설치 직후 환경 진단 5분

새 환경에서 가장 먼저 하는 점검 루틴이다. 순서대로 따라 하며 결과를 확인하자.

```bash
# ① 배포판이 제대로 잡혔나
printenv ROS_DISTRO            # 기대값: jazzy
# ② ROS 2 종합 진단(누락·충돌을 한 번에)
ros2 doctor                    # 'All checks passed'에 가까우면 정상
# ③ 통신 격리 설정 확인
echo "domain=$ROS_DOMAIN_ID localhost_only=$ROS_LOCALHOST_ONLY"
# ④ 데모 노드로 양방향 통신 확인 (터미널 2개)
ros2 run demo_nodes_cpp talker     # 터미널 1
ros2 run demo_nodes_py listener    # 터미널 2 → 'I heard' 출력되면 성공
# ⑤ 흐름을 눈으로
ros2 topic list                # /chatter 가 보인다
rqt_graph                      # talker → /chatter → listener 그래프
```

이 5단계가 모두 통과하면, 2장으로 넘어갈 준비가 끝난 것이다. `ros2 doctor`에서 경고가
나오면 메시지의 패키지명을 그대로 검색해 누락 패키지를 설치한다.

## 1.9 자주 막히는 지점 정리

| 증상 | 원인 | 해결 |
|---|---|---|
| `ros2: command not found` | sourcing 안 함 | `source /opt/ros/jazzy/setup.bash`(또는 `~/.bashrc` 등록) |
| `ROS_DISTRO` 비어 있음 | 환경 미설정 | 위와 동일 |
| talker는 되는데 listener가 못 받음 | DOMAIN_ID 불일치/네트워크 | 같은 터미널 환경에서 실행, ID 확인 |
| 한글이 깨짐 | 로캘 미설정 | 1.5.2의 `locale-gen`·`LANG=en_US.UTF-8` |

---

### 참고 자료
- ROS 2 Jazzy 공식 문서: https://docs.ros.org/en/jazzy/
- 설치 가이드: https://docs.ros.org/en/jazzy/Installation.html
- 표윤석·임태훈, 『ROS 2로 시작하는 로봇 프로그래밍』, 루비페이퍼
- 실습 원본: https://github.com/sumilee-pcu/gcamp_ros2_basic
