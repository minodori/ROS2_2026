# 부록 A. 맥(Apple Silicon)에서 ROS 2 Jazzy 실습 환경 구축

> **이 부록의 목적**
> - 맥 사용자가 이 책의 모든 실습을 **학생 PC와 동일한 바이너리**로 돌릴 수 있게 한다.
> - UTM/Parallels로 Ubuntu 24.04(arm64) 가상머신을 만들고 ROS 2 Jazzy를 설치한다.
> - Gazebo 그래픽·성능의 한계와 대처를 안다.

본문 1장은 네이티브 Ubuntu를 전제로 했다. 맥(특히 Apple Silicon) 사용자도 동일 환경을
가상머신으로 구성할 수 있다. 핵심은 **ROS 2 Jazzy가 arm64를 Tier 1로 공식 지원**한다는
점이다 — Ubuntu 24.04 **arm64** VM에서 받는 `ros-jazzy-*` 패키지는 학생 PC와 같다.

---

## A.1 왜 가상머신인가

| 방법 | 동일성 | Gazebo 3D | 비고 |
|---|---|---|---|
| **UTM**(Apple 가상화) | ◎ arm64 네이티브 | △ 소프트웨어 렌더 | 무료, 입문·코드 검증에 충분 |
| **Parallels Desktop** | ◎ arm64 네이티브 | ○ GPU 가속 우수 | 유료, 무거운 시뮬·USB 연동에 유리 |
| **Docker(arm64)** | ◎ 패키지 동일 | ✗ GUI 까다로움 | 헤드리스 검증·CI에 적합 |
| 네이티브 macOS 빌드 | ✗ Tier 3 | ✗ 매우 고통 | **비권장** |

> ⚠️ macOS 네이티브 ROS 2(소스 빌드)는 입문용으로 적합하지 않다. **VM이 정답**이다.

권장 VM 할당(여유 있는 맥 기준): **CPU 8코어 / RAM 24~32GB / 디스크 80~120GB**. 호스트와
로컬 LLM 등 다른 작업에 자원을 남겨 둔다.

---

## A.2 UTM으로 Ubuntu 24.04 arm64 설치

1. **UTM 설치**: https://mac.getutm.app 에서 받아 설치(무료).
2. **Ubuntu 24.04 arm64 ISO** 다운로드: Ubuntu 공식에서 **ARM64(Server 또는 Desktop)** 이미지를
   받는다. (반드시 arm64 — amd64를 받으면 에뮬레이션으로 매우 느려진다)
3. UTM에서 **Virtualize**(Emulate 아님) → Linux → ISO 지정.
4. 메모리·CPU·디스크를 위 권장값으로 설정 → 설치 진행.
5. 설치 후 Ubuntu 업데이트:
   ```bash
   sudo apt update && sudo apt upgrade -y
   ```

> 💡 Server ISO로 설치했다면 가벼운 데스크톱 환경을 추가하면 RViz/Gazebo GUI를 쓸 수 있다.
> ```bash
> sudo apt install -y ubuntu-desktop-minimal
> ```

---

## A.3 ROS 2 Jazzy 설치 (본문 1장과 동일)

VM 안에서는 본문 [1장 1.5절](../01_intro/01_overview_and_setup.md)의 설치 절차를 **그대로**
따른다. 요약:

```bash
# 로캘
sudo apt install -y locales && sudo locale-gen en_US en_US.UTF-8
sudo update-locale LC_ALL=en_US.UTF-8 LANG=en_US.UTF-8 && export LANG=en_US.UTF-8
# 저장소
sudo apt install -y software-properties-common curl && sudo add-apt-repository universe
sudo curl -sSL https://raw.githubusercontent.com/ros/rosdistro/master/ros.key \
  -o /usr/share/keyrings/ros-archive-keyring.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/ros-archive-keyring.gpg] \
http://packages.ros.org/ros2/ubuntu $(. /etc/os-release && echo $UBUNTU_CODENAME) main" \
  | sudo tee /etc/apt/sources.list.d/ros2.list > /dev/null
# 설치
sudo apt update && sudo apt install -y ros-jazzy-desktop ros-dev-tools ros-jazzy-ros-gz
echo "source /opt/ros/jazzy/setup.bash" >> ~/.bashrc && source ~/.bashrc
printenv ROS_DISTRO    # → jazzy
```

`arch`가 `arm64`로 잡혀 arm64용 패키지가 설치된다. talker/listener로 동작을 확인한다(1.5.4절).

---

## A.4 Docker 대안 (헤드리스 검증)

GUI가 필요 없는 코드 빌드·테스트라면 Docker가 깔끔하다.

```bash
# (맥에 Docker Desktop 설치 후)
docker run -it --platform linux/arm64 ros:jazzy bash
# 컨테이너 안에서 워크스페이스 빌드·테스트
```

GUI(Gazebo/RViz)가 필요하면 X11 포워딩이나 VNC를 추가해야 해 번거롭다 — GUI 실습은
UTM/Parallels VM을 권장.

---

## A.5 Gazebo 성능 — 현실적 기대치

VM에서 Gazebo Harmonic의 **3D 렌더링은 GPU 가속이 제한**된다.

- 이 책의 월드(TurtleBot3, 단순 미로·주차)는 가벼워 **실용적으로 동작**한다.
- 무거운 센서/대형 월드는 느릴 수 있다 → 단순 월드 사용, 불필요한 GUI 끄기.
- 더 부드러운 화면이 필요하면 Parallels(GPU 가속 우수)를 고려.

성능 팁:
- Gazebo GUI 없이 서버만 돌리고(headless) RViz로 관찰하면 가볍다.
- `gz sim -s`(서버) / `-g`(GUI) 분리 실행으로 부담을 조절한다.

---

## A.6 실로봇(TurtleBot3) 연동 시 주의

4부 실로봇 연동에서는 **USB/네트워크 패스스루**가 필요하다.

- VM이 로봇과 같은 네트워크에 보이도록 **브리지 네트워킹**으로 설정.
- 로봇과 VM의 `ROS_DOMAIN_ID`를 동일하게(12장).
- USB 직결(OpenCR 펌웨어 업로드 등)은 Parallels가 UTM보다 패스스루가 쉽다.

---

## A.7 트러블슈팅

| 증상 | 원인 | 해결 |
|---|---|---|
| 설치가 매우 느림 | amd64 ISO 사용 | arm64 ISO로 재설치 |
| `apt`가 패키지 못 찾음 | 저장소/키 오류 | A.3 저장소 등록 재확인 |
| Gazebo 창이 검거나 느림 | GPU 가속 제한 | 단순 월드, headless+RViz, Parallels 검토 |
| 로봇이 VM에서 안 보임 | NAT 네트워크 | 브리지 네트워킹 + 동일 DOMAIN_ID |
| 복사/붙여넣기 안 됨 | 게스트 도구 미설치 | UTM/Parallels 게스트 도구 설치 |

---

## A.8 정리

- ROS 2 Jazzy는 arm64 Tier 1 → 맥 VM에서 **학생 PC와 동일 바이너리**로 실습 가능.
- 입문·검증은 UTM(무료), 무거운 시뮬·실로봇은 Parallels.
- Gazebo 3D는 VM 특성상 가속이 제한되나, 이 책 실습 범위에서는 충분하다.
- VM 설치 후에는 본문 1장 절차를 그대로 따르면 된다.
