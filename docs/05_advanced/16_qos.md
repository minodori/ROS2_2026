# 16장. QoS와 통신 신뢰성

> **학습 목표**
> - QoS(Quality of Service)가 무엇이며 왜 ROS 2에 있는지 이해한다.
> - 주요 QoS 정책(신뢰성·내구성·이력)을 안다.
> - 퍼블리셔/서브스크라이버 QoS가 **호환**되어야 통신됨을 안다.
> - 센서 데이터에 적합한 QoS 프로파일을 적용한다.

> **이번 장의 산출물**
> - QoS profile을 바꿔 publisher/subscriber 호환성을 실험한다.
> - reliability, durability, history가 실제 통신에 미치는 영향을 확인한다.
>
> **공통 학습 흐름**: 개념 → 따라하기 → 코드 해설 → 실행 확인 → 버전/환경 체크 → 트러블슈팅 → 연습문제 → 마무리 점검

5부는 "동작하는 것"을 넘어 "신뢰성 있게·관리 가능하게"로 간다. 그 첫 주제가 QoS다.

---

## 16.1 QoS란 — 통신 품질 정책

ROS 2는 DDS(1장) 위에 있고, DDS는 통신 품질을 **정책(policy)** 으로 조절한다. 같은 토픽이라도
"무조건 다 전달(신뢰성)"과 "최신만 빠르게(속도)"는 요구가 다르다. QoS가 이를 정한다.

ROS 1에는 없던 개념이라, ROS 1 경험자가 가장 자주 막히는 지점이다.

---

## 16.2 핵심 정책 셋

| 정책 | 값 | 의미 |
|---|---|---|
| **Reliability(신뢰성)** | `RELIABLE` | 손실 시 재전송, 모두 도착 보장(느릴 수 있음) |
| | `BEST_EFFORT` | 재전송 없음, 최신 우선(빠름, 일부 손실 허용) |
| **Durability(내구성)** | `VOLATILE` | 늦게 구독하면 과거 메시지 못 받음 |
| | `TRANSIENT_LOCAL` | 마지막 메시지를 보관, 늦게 와도 전달(래치) |
| **History(이력)** | `KEEP_LAST(depth)` | 최근 N개만 버퍼 |
| | `KEEP_ALL` | 가능한 한 모두 버퍼 |

용도 직관:
- **센서 스트림**(`/scan`, 카메라): `BEST_EFFORT` + `KEEP_LAST` — 최신이 중요, 한두 개 손실 무방.
- **명령·상태**(`/cmd_vel`, 한 번의 설정): `RELIABLE` — 빠지면 안 됨.
- **정적 지도**(`/map`): `TRANSIENT_LOCAL` — 늦게 켠 노드도 지도를 받아야 함.

---

## 16.3 [따라하기] QoS 적용 (Python)

```python
from rclpy.qos import QoSProfile, ReliabilityPolicy, HistoryPolicy

sensor_qos = QoSProfile(
    reliability=ReliabilityPolicy.BEST_EFFORT,
    history=HistoryPolicy.KEEP_LAST,
    depth=10,
)

self.scan_sub_ = self.create_subscription(
    LaserScan, "scan", self.on_scan, sensor_qos)
```

ROS 2는 자주 쓰는 조합을 **미리 정의된 프로파일**로 제공한다.

```python
from rclpy.qos import qos_profile_sensor_data
self.create_subscription(LaserScan, "scan", self.on_scan, qos_profile_sensor_data)
```

---

## 16.4 QoS 호환성 — 가장 중요한 규칙

> ⚠️ **퍼블리셔와 서브스크라이버의 QoS가 호환되지 않으면, 토픽 이름·타입이 맞아도 통신이
> 안 된다.** 이 함정 때문에 "코드는 맞는데 콜백이 안 온다".

대표 규칙: 퍼블리셔가 `BEST_EFFORT`인데 서브스크라이버가 `RELIABLE`을 요구하면 **연결되지
않는다**(요구가 제공보다 강함). 반대(pub RELIABLE, sub BEST_EFFORT)는 호환된다.

진단:

```bash
ros2 topic info /scan --verbose      # 양쪽 QoS 프로파일 출력
```

> 💡 9~11장에서 `/scan` 콜백이 안 왔다면, 십중팔구 QoS 불일치다. 센서 토픽은
> `qos_profile_sensor_data`(BEST_EFFORT)로 구독하면 대개 해결된다.

---

## 코드 해설 · 실행 확인 · 버전 체크

- **코드 해설 포인트**: `QoSProfile`, reliability, durability, history 설정 코드를 해설한다.
- **실행 확인 포인트**: 호환/비호환 QoS 조합에서 메시지가 수신되는지 비교한다.
- **버전/환경 체크**: DDS vendor 기본값과 sensor data QoS 차이를 Jazzy 기준으로 표시한다.

## 16.5 트러블슈팅

| 증상 | 원인 | 해결 |
|---|---|---|
| 토픽 맞는데 콜백 없음 | QoS 불일치 | `--verbose`로 확인, 센서엔 sensor_data |
| 늦게 켜면 지도/상태 못 받음 | VOLATILE | 발행측 `TRANSIENT_LOCAL` |
| 메시지 끊김 다발 | BEST_EFFORT+혼잡 | 중요하면 RELIABLE |
| 지연·버벅임 | RELIABLE 재전송 부담 | 센서엔 BEST_EFFORT |

---

## 16.6 연습문제

1. 퍼블리셔를 BEST_EFFORT, 서브스크라이버를 RELIABLE로 두고 통신 실패를 재현하라.
2. `ros2 topic info --verbose`로 `/scan`의 실제 QoS를 확인하라.
3. `/map`을 `TRANSIENT_LOCAL`로 발행하고, 나중에 켠 구독자가 받는지 확인하라.
4. 9장 주차 노드의 `/scan` 구독을 `qos_profile_sensor_data`로 바꿔 안정성을 비교하라.

---

## 16.7 마무리 점검

- [ ] QoS의 존재 이유(DDS 기반 품질 정책)를 설명할 수 있다.
- [ ] Reliability/Durability/History 정책을 구분한다.
- [ ] QoS 호환 규칙으로 "콜백이 안 오는" 문제를 진단할 수 있다.
- [ ] 데이터 성격에 맞는 QoS를 선택·적용할 수 있다.

> **다음 장 예고** — 17장 **Lifecycle 노드와 Component**: 노드를 켜고 끄는 상태를 통제하고,
> 여러 노드를 한 프로세스에 효율적으로 담는다.

---

## 16.8 [워크드 예제] QoS 불일치 재현과 진단

"코드는 맞는데 콜백이 안 온다"를 일부러 만들어 보고, 진단해 고친다.

```python
from rclpy.qos import QoSProfile, ReliabilityPolicy

# 퍼블리셔: BEST_EFFORT
pub_qos = QoSProfile(depth=10, reliability=ReliabilityPolicy.BEST_EFFORT)
self.pub_ = self.create_publisher(Int64, "num", pub_qos)

# 구독자: RELIABLE 요구 → BEST_EFFORT 발행과 호환 안 됨 → 콜백 안 옴
sub_qos = QoSProfile(depth=10, reliability=ReliabilityPolicy.RELIABLE)
self.sub_ = self.create_subscription(Int64, "num", self.cb, sub_qos)
```

진단:

```bash
ros2 topic info /num --verbose
# Publisher / Subscriber의 Reliability가 BEST_EFFORT vs RELIABLE 로 다름 → 불일치
```

고치기: 구독자도 `BEST_EFFORT`로 맞추거나, 센서류라면 `qos_profile_sensor_data`를 쓴다.
규칙은 "**구독자의 요구가 발행자의 제공보다 강하면 연결 안 됨**"(RELIABLE > BEST_EFFORT).

## 16.9 자주 쓰는 프로파일 빠른 선택표

| 데이터 | 권장 | 이유 |
|---|---|---|
| 라이다·카메라·IMU | `qos_profile_sensor_data` (BEST_EFFORT) | 최신성이 중요, 약간 손실 무방 |
| `/cmd_vel`·명령 | RELIABLE | 누락되면 위험 |
| `/map`·정적 설정 | RELIABLE + TRANSIENT_LOCAL | 늦게 켠 노드도 받아야 함 |
| `/tf` | 기본(RELIABLE, depth 큼) | 표준 프로파일 사용 |

## 16.10 연습문제 해설(요약)

- **1번** 위 16.8이 정답 재현. `--verbose`로 Reliability 차이를 확인하면 원인이 보인다.
- **2번** `ros2 topic info /scan --verbose`로 보통 BEST_EFFORT/KEEP_LAST가 나온다.
- **3번** 발행을 `TRANSIENT_LOCAL`로 두면, 나중에 켠 구독자도 마지막 메시지를 받는다(래치).
- **4번** `/scan` 구독을 `qos_profile_sensor_data`로 바꾸면 콜백 누락이 사라진다(9장 안정화).

---

### 참고 자료
- ROS 2 Jazzy — About QoS settings / QoS profiles
- 표윤석 교재 3부(QoS), 오로카(openrt)의 QoS 한글 자료
