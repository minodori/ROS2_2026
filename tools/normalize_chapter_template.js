const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");

const commonFlow =
  "**공통 학습 흐름**: 개념 → 따라하기 → 코드 해설 → 실행 확인 → 버전/환경 체크 → 트러블슈팅 → 연습문제 → 마무리 점검";

const chapters = [
  {
    file: "docs/01_intro/01_overview_and_setup.md",
    output: [
      "ROS 2 Jazzy 설치 상태를 확인하고 기본 데모 노드를 실행한다.",
      "`talker`/`listener`와 `rqt_graph`로 ROS 그래프를 눈으로 확인한다.",
    ],
    code: "설치 명령, 환경 설정, 데모 실행 명령이 어떤 순서로 연결되는지 설명한다.",
    run: "`printenv ROS_DISTRO`, `ros2 run demo_nodes_cpp talker`, `ros2 run demo_nodes_py listener`, `rqt_graph` 결과를 확인한다.",
    version: "Jazzy/Ubuntu 24.04/Gazebo Harmonic 기준으로 쓰고, Foxy·Humble 자료와 혼용되는 지점을 표시한다.",
    before: /^## 1\.6 마무리 점검/m,
  },
  {
    file: "docs/01_intro/02_workspace_and_colcon.md",
    output: [
      "`~/ros2_ws` 워크스페이스와 Python/C++ 예제 패키지를 만든다.",
      "`src`, `build`, `install`, `log` 디렉터리의 역할을 설명한다.",
    ],
    code: "`package.xml`, `setup.py`, `CMakeLists.txt`가 빌드와 실행에 어떻게 관여하는지 해설한다.",
    run: "`colcon build`, `source install/setup.bash`, `ros2 pkg list | grep my_`로 빌드 결과를 확인한다.",
    version: "Ubuntu 24.04의 Python 3.12와 setuptools 경고, Jazzy의 colcon 사용 흐름을 기준으로 정리한다.",
    before: /^## 2\.8 트러블슈팅/m,
  },
  {
    file: "docs/02_basics/03_topic.md",
    output: [
      "Python publisher/subscriber와 C++ publisher를 작성한다.",
      "`/number` 토픽의 메시지 흐름을 CLI와 그래프로 확인한다.",
    ],
    code: "`create_publisher`, `create_subscription`, timer callback, `console_scripts`, `CMakeLists.txt` 등록 흐름을 해설한다.",
    run: "`ros2 topic list/info/echo/hz`와 `rqt_graph`로 토픽 동작을 확인한다.",
    version: "Jazzy에서도 기본 API는 유사하지만 QoS 기본값과 패키지 등록 방식 차이를 점검한다.",
    before: /^## 3\.7 트러블슈팅/m,
  },
  {
    file: "docs/02_basics/04_service.md",
    output: [
      "서비스 서버와 클라이언트를 작성한다.",
      "요청-응답 모델이 토픽과 어떻게 다른지 실행으로 확인한다.",
    ],
    code: "`.srv`, `create_service`, `create_client`, `call_async`, callback의 역할을 해설한다.",
    run: "`ros2 service list/type/call`로 서비스 타입과 호출 결과를 확인한다.",
    version: "Jazzy의 비동기 future 처리와 인터페이스 의존성 선언 방식을 기준으로 정리한다.",
    before: /^## 4\.8 트러블슈팅/m,
  },
  {
    file: "docs/02_basics/05_action.md",
    output: [
      "Fibonacci 액션 서버와 클라이언트를 작성한다.",
      "goal, feedback, result, cancel의 전체 흐름을 실행한다.",
    ],
    code: "`.action` 정의, goal/feedback/result/cancel callback의 책임을 해설한다.",
    run: "`ros2 action list/info/send_goal --feedback`와 cancel 동작을 확인한다.",
    version: "Jazzy의 action client/server API와 cancel 처리 흐름을 기준으로 정리한다.",
    before: /^## 5\.8 트러블슈팅/m,
  },
  {
    file: "docs/02_basics/06_parameter_interface.md",
    output: [
      "파라미터로 동작을 바꾸는 노드와 YAML 설정을 작성한다.",
      "커스텀 인터페이스 패키지를 빌드하고 다른 패키지에서 사용한다.",
    ],
    code: "`declare_parameter`, YAML 로딩, `rosidl_generate_interfaces`, `package.xml` 의존성을 해설한다.",
    run: "`ros2 param list/get/set`과 커스텀 인터페이스 빌드 결과를 확인한다.",
    version: "Jazzy의 인터페이스 패키지 빌드 규칙과 Python import 경로를 점검한다.",
    before: /^## 6\.4 트러블슈팅/m,
  },
  {
    file: "docs/02_basics/07_launch.md",
    output: [
      "여러 노드를 한 번에 실행하는 launch 파일을 작성한다.",
      "파라미터, remap, launch argument를 한 흐름으로 다룬다.",
    ],
    code: "`LaunchDescription`, `Node`, `DeclareLaunchArgument`, substitution 사용 지점을 해설한다.",
    run: "`ros2 launch`와 argument override로 실행 결과가 달라지는지 확인한다.",
    version: "Foxy에서 Jazzy로 넘어오며 달라진 launch/Gazebo 실행 관례를 표시한다.",
    before: /^## 7\.7 트러블슈팅/m,
  },
  {
    file: "docs/03_simulation/08_gazebo_urdf.md",
    output: [
      "URDF 로봇 모델을 RViz에서 확인하고 Gazebo Harmonic에 spawn한다.",
      "`ros_gz` bridge로 Gazebo와 ROS 2 토픽을 연결한다.",
    ],
    code: "URDF link/joint, `robot_state_publisher`, `ros_gz_sim create`, `parameter_bridge` 연결을 해설한다.",
    run: "RViz 모델, `gz sim`, `/clock`, `/cmd_vel`, `/scan` 토픽을 확인한다.",
    version: "Gazebo Classic의 `gazebo_ros` 방식과 Harmonic의 `ros_gz` 방식을 구분한다.",
    before: /^## 8\.6 트러블슈팅/m,
  },
  {
    file: "docs/03_simulation/09_project_parking.md",
    output: [
      "주차 노드가 `/scan`을 구독하고 `/cmd_vel`을 발행하게 만든다.",
      "장애물 거리 조건에 따라 로봇이 정지하는 프로젝트를 완성한다.",
    ],
    code: "LaserScan 전방 인덱스 계산, Twist 발행, 파라미터화할 값을 해설한다.",
    run: "`ros2 topic hz /scan`, `/cmd_vel` echo, Gazebo에서 정지 동작을 확인한다.",
    version: "Gazebo Harmonic에서는 scan/cmd_vel bridge 구성이 먼저 맞아야 함을 표시한다.",
    before: /^## 9\.6 트러블슈팅/m,
  },
  {
    file: "docs/03_simulation/10_project_spawn.md",
    output: [
      "Gazebo에 여러 로봇을 spawn하고 namespace로 구분한다.",
      "서비스/launch 기반 spawn 흐름을 실습 프로젝트로 정리한다.",
    ],
    code: "entity spawn 명령, launch 인자, namespace와 토픽 분리 구조를 해설한다.",
    run: "`ros_gz_sim create` 실행, robot별 topic namespace, Gazebo 모델 생성을 확인한다.",
    version: "Foxy의 `/spawn_entity` 예제와 Jazzy/Harmonic의 `ros_gz_sim create` 방식을 구분한다.",
    before: /^## 10\.5 트러블슈팅/m,
  },
  {
    file: "docs/03_simulation/11_project_maze.md",
    output: [
      "Maze Escape 액션 서버/클라이언트를 작성한다.",
      "LaserScan, Odometry, 선택적 OpenCV 처리를 하나의 프로젝트로 통합한다.",
    ],
    code: "action goal/feedback/result, LaserScan/Odometry 제어 루프, cancel 처리를 해설한다.",
    run: "goal 전송, feedback 관찰, cancel, 미로 탈출 동작을 확인한다.",
    version: "Jazzy 기준 custom action 빌드와 Gazebo bridge topic 구성을 점검한다.",
    before: /^## 11\.7 트러블슈팅/m,
  },
  {
    file: "docs/04_turtlebot3/12_bringup.md",
    output: [
      "TurtleBot3 bringup을 실행하고 `/scan`, `/odom`, `/tf`를 확인한다.",
      "실로봇 네트워크와 환경 변수를 점검하는 체크리스트를 만든다.",
    ],
    code: "bringup launch, `TURTLEBOT3_MODEL`, `ROS_DOMAIN_ID`, 네트워크 설정의 의미를 해설한다.",
    run: "`ros2 launch turtlebot3_bringup robot.launch.py`, topic list/echo, TF 확인을 수행한다.",
    version: "Jazzy 패키지명, TurtleBot3 모델 환경 변수, 실로봇 네트워크 조건을 기준으로 정리한다.",
    before: /^## 12\.6 트러블슈팅/m,
  },
  {
    file: "docs/04_turtlebot3/13_teleop_sim.md",
    output: [
      "표준 teleop과 간단한 custom teleop을 실행한다.",
      "시뮬레이션과 실로봇에서 같은 `/cmd_vel` 흐름을 비교한다.",
    ],
    code: "키 입력을 Twist 메시지로 바꾸는 publisher loop와 안전 정지 처리를 해설한다.",
    run: "로봇 이동, `/cmd_vel` echo, `/scan` 변화, 터미널 focus 조건을 확인한다.",
    version: "시뮬레이션과 실로봇 모두 `/cmd_vel`을 공유하지만 keyboard 입력 환경 차이를 표시한다.",
    before: /^## 13\.5 트러블슈팅/m,
  },
  {
    file: "docs/04_turtlebot3/14_slam.md",
    output: [
      "Cartographer SLAM을 실행해 지도를 만든다.",
      "완성된 map 파일을 저장하고 다음 장 Nav2 입력으로 준비한다.",
    ],
    code: "SLAM launch가 사용하는 `/scan`, `/odom`, `/tf`와 map saver 흐름을 해설한다.",
    run: "RViz에서 map이 확장되는지 보고 `map_saver_cli` 결과 파일을 확인한다.",
    version: "`use_sim_time`, TF frame, Jazzy에서의 Cartographer 패키지 availability를 점검한다.",
    before: /^## 14\.6 트러블슈팅/m,
  },
  {
    file: "docs/04_turtlebot3/15_nav2.md",
    output: [
      "저장된 map으로 Nav2를 실행한다.",
      "RViz goal과 코드 기반 `NavigateToPose` action client를 비교한다.",
    ],
    code: "`NavigateToPose` action client, costmap 설정, lifecycle activation 흐름을 해설한다.",
    run: "initial pose 설정, goal 전송, feedback/status, 장애물 회피 동작을 확인한다.",
    version: "Jazzy Nav2의 launch/config 이름과 lifecycle 활성화 절차를 기준으로 정리한다.",
    before: /^## 15\.6 트러블슈팅/m,
  },
  {
    file: "docs/05_advanced/16_qos.md",
    output: [
      "QoS profile을 바꿔 publisher/subscriber 호환성을 실험한다.",
      "reliability, durability, history가 실제 통신에 미치는 영향을 확인한다.",
    ],
    code: "`QoSProfile`, reliability, durability, history 설정 코드를 해설한다.",
    run: "호환/비호환 QoS 조합에서 메시지가 수신되는지 비교한다.",
    version: "DDS vendor 기본값과 sensor data QoS 차이를 Jazzy 기준으로 표시한다.",
    before: /^## 16\.5 트러블슈팅/m,
  },
  {
    file: "docs/05_advanced/17_lifecycle_component.md",
    output: [
      "Lifecycle node의 상태 전이를 CLI로 제어한다.",
      "Component container에 노드를 올리는 개념을 확인한다.",
    ],
    code: "lifecycle callback과 component loading 구조를 해설한다.",
    run: "`ros2 lifecycle set/get`과 component load 명령으로 상태와 로딩 결과를 확인한다.",
    version: "Jazzy의 lifecycle CLI와 component package 이름을 기준으로 정리한다.",
    before: /^## 17\.5 트러블슈팅/m,
  },
  {
    file: "docs/05_advanced/18_logging_cli_rqt.md",
    output: [
      "ROS 2 debugging CLI와 GUI 도구 사용 순서를 정리한다.",
      "logging, rosbag2, tf2, rqt/RViz를 한 장의 진단 흐름으로 묶는다.",
    ],
    code: "logger level, ros2 CLI, rqt/RViz/rosbag/tf2 사용 지점을 해설한다.",
    run: "graph 점검, rosbag record/play, TF 확인, log level 변경을 수행한다.",
    version: "Jazzy의 rosbag2, rqt plugin, CLI 제공 범위를 기준으로 점검한다.",
    before: /^## 18\.5 트러블슈팅/m,
  },
];

function outputBlock(chapter) {
  const lines = [
    "> **이번 장의 산출물**",
    ...chapter.output.map((item) => `> - ${item}`),
    ">",
    `> ${commonFlow}`,
  ];
  return `${lines.join("\n")}\n\n`;
}

function checkBlock(chapter) {
  return [
    "## 코드 해설 · 실행 확인 · 버전 체크",
    "",
    `- **코드 해설 포인트**: ${chapter.code}`,
    `- **실행 확인 포인트**: ${chapter.run}`,
    `- **버전/환경 체크**: ${chapter.version}`,
    "",
  ].join("\n");
}

function insertAfterLearningGoal(text, chapter) {
  if (text.includes("> **이번 장의 산출물**")) return text;

  const lines = text.split("\n");
  const goalStart = lines.findIndex((line) => line.startsWith("> **학습 목표"));
  if (goalStart === -1) {
    throw new Error(`${chapter.file}: learning goal block not found`);
  }

  let insertAt = goalStart + 1;
  while (insertAt < lines.length && (lines[insertAt].startsWith(">") || lines[insertAt].trim() === "")) {
    if (lines[insertAt].trim() === "" && insertAt > goalStart) break;
    insertAt += 1;
  }

  lines.splice(insertAt + 1, 0, outputBlock(chapter).trimEnd());
  return lines.join("\n");
}

function insertCheckSection(text, chapter) {
  if (text.includes("## 코드 해설 · 실행 확인 · 버전 체크")) return text;

  const match = text.match(chapter.before);
  if (!match || match.index === undefined) {
    throw new Error(`${chapter.file}: insertion point not found`);
  }

  return `${text.slice(0, match.index)}${checkBlock(chapter)}${text.slice(match.index)}`;
}

function normalizeSpacing(text) {
  return text
    .replace(/(> \*\*공통 학습 흐름\*\*:.*\n)(?!\n)/g, "$1\n")
    .replace(/(> \*\*공통 학습 흐름\*\*:.*)\n---/g, "$1\n\n---")
    .replace(/(## 코드 해설 · 실행 확인 · 버전 체크)\n(?!\n)/g, "$1\n\n")
    .replace(/(- \*\*버전\/환경 체크\*\*: .*)\n(## \d)/g, "$1\n\n$2");
}

for (const chapter of chapters) {
  const fullPath = path.join(root, chapter.file);
  let text = fs.readFileSync(fullPath, "utf8");
  text = insertAfterLearningGoal(text, chapter);
  text = insertCheckSection(text, chapter);
  text = normalizeSpacing(text);
  fs.writeFileSync(fullPath, text, "utf8");
  console.log(`normalized ${chapter.file}`);
}
