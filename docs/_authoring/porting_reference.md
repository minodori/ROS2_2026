# [집필자 내부 노트] Jazzy 포팅 대조 레퍼런스

> ⚠️ **이 문서는 출간 본문이 아니라 집필자용 작업 노트입니다.** 외부 공개/출간물에 포함하지 마세요.
> 목적: gcamp(Foxy) 예제를 Jazzy로 포팅할 때, **Jazzy에서 검증된 코드 패턴을 대조**하기 위한 참고 인덱스.

## 참고 코드 저장소

- **출처**: Edouard Renard, 『ROS 2 from Scratch』(Packt, 2024) 공식 예제 코드
- **저장소**: https://github.com/PacktPublishing/ROS-2-from-Scratch
- **라이선스**: **MIT** (Copyright (c) 2024 Packt) → 출처 명기 시 코드 참고·재사용 가능
- **로컬 클론**: `/Users/sumilee/2026/ros2-from-scratch-ref`
- **환경**: Ubuntu 24.04 기준(Jazzy 시대) → 우리 Jazzy 기준과 동일 ⇒ **API/런치 문법 정답 대조용으로 신뢰 가능**
- **규모**: Python 97개 / C++ 38개 / launch 13개 / URDF·xacro 12개 파일

## ⚠️ 활용 원칙 (반복 강조)

- 우리 교재 코드의 **1차 출처는 gcamp_ros2_basic(이수미 포크)**. 이 저장소는 어디까지나 **포팅 시 정답 대조용**.
- 본문 설명·코드를 **그대로 복제 금지**. 구조·API 사용법을 **확인**하고 우리 코드에 맞게 재작성.
- 차용하는 코드 조각이 있으면 MIT 라이선스 고지·출처 표기.

## 챕터 매핑 — 우리 교재 ↔ 참고 저장소

| 우리 교재 | 참고 저장소 | 대조 포인트(Jazzy 정답 확인용) |
|---|---|---|
| 2장 워크스페이스·colcon | `ch4/` (`my_py_pkg`, `my_cpp_pkg`, `node_oop_template`) | Jazzy의 Python/C++ 패키지 생성, OOP 노드 템플릿, `setup.py`/`CMakeLists.txt` 최신형 |
| 3장 토픽 | `ch5/` (`my_py_pkg`, `my_cpp_pkg`, `turtle_controller`) | `rclpy`/`rclcpp` 퍼블리셔·서브스크라이버 최신 API, turtlesim 연동 |
| 4장 서비스 | `ch6/` (동일 패키지군) | 서비스 클라/서버, 비동기 호출 패턴 |
| 5장 액션 | `ch7/` | 액션 서버/클라, 피드백·목표 취소 처리 |
| 6장 파라미터·커스텀 인터페이스 | `ch8/` (+`YAML_files`, `my_robot_interfaces`) | 파라미터 선언·YAML 로드, `.msg/.srv/.action` 인터페이스 패키지 빌드 |
| 7장 런치 | `ch9/` (`my_robot_bringup`) | **Jazzy 런치 문법**(Foxy와 차이 큰 부분 — 최우선 대조) |
| 8장 URDF·Gazebo | `ch11/`(URDF·xacro), `ch12/`(description+TF), `ch13/`(`my_robot_bringup` Gazebo) | URDF/xacro 작성, TF 발행, **Gazebo(신) 연동 런치** — gcamp의 Classic→Harmonic 포팅 핵심 참고 |

## 우선 대조 순서 (포팅 리스크 높은 순)

1. **7장 런치 (`ch9`)** — Foxy→Jazzy 런치 문법 변화가 가장 큼. 여기부터 패턴 확정.
2. **8장 Gazebo (`ch13`)** — gcamp는 Gazebo Classic, 우리는 Harmonic(`ros_gz`). 신 연동 런치 구조를 `ch13`에서 확인.
3. **6장 인터페이스 (`ch8/my_robot_interfaces`)** — 커스텀 인터페이스 패키지 빌드 규칙.
4. 2~5장(`ch4`~`ch7`) — 통신 기본 API 미세 변화 대조.

## 다음 작업

- [ ] `ch9` 런치 파일을 읽고 "Foxy→Jazzy 런치 차이" 박스 초안 작성 → 7장에 반영
- [ ] `ch13` Gazebo 런치 구조 분석 → 8장 Harmonic 포팅 가이드에 반영
- [ ] gcamp 저장소 클론 후 챕터별로 Foxy 코드 ↔ 이 레퍼런스 ↔ 우리 재작성본 3열 대조
