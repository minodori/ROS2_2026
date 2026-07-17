"""HWPX 조판 규칙 점검 스크립트."""
import sys, zipfile, re, xml.etree.ElementTree as ET
sys.stdout.reconfigure(encoding="utf-8")

def check(path):
    print(f"\n{'='*60}")
    print(f"검사: {path}")
    print('='*60)
    issues = []

    z = zipfile.ZipFile(path)
    names = z.namelist()

    # 1) mimetype
    mt = z.read("mimetype").decode()
    ok = mt == "application/hwp+zip"
    print(f"  {'[OK]' if ok else '[!!]'} mimetype: {mt!r}")
    if not ok:
        issues.append(f"mimetype 오류: {mt!r}")

    # 2) mimetype STORED 첫 항목
    info0 = z.infolist()[0]
    ok = info0.filename == "mimetype" and info0.compress_type == 0
    print(f"  {'[OK]' if ok else '[!!]'} mimetype STORED 첫 항목")
    if not ok:
        issues.append(f"mimetype STORED 위반: {info0.filename}, compress={info0.compress_type}")

    # 3) 판형 B5 — section0.xml의 hp:secPr 또는 header.xml 어디서든
    sec = z.read("Contents/section0.xml").decode("utf-8")
    hdr = z.read("Contents/header.xml").decode("utf-8")

    # hp:pagePr width="..." height="..." 형태로 저장됨
    m = re.search(r'<hp:pagePr[^>]*\bwidth="(\d+)"[^>]*\bheight="(\d+)"', sec)
    if not m:
        m = re.search(r'<hp:pagePr[^>]*\bheight="(\d+)"[^>]*\bwidth="(\d+)"', sec)
        pw, ph = (m.group(2), m.group(1)) if m else (None, None)
    else:
        pw, ph = m.group(1), m.group(2)
    if pw and ph:
        ok = pw == "53291" and ph == "74551"
        print(f"  {'[OK]' if ok else '[!!]'} 판형(secPr.pagePr): {pw}x{ph} {'B5' if ok else '(B5=53291x74551 아님)'}")
        if not ok:
            issues.append(f"판형 오류: {pw}x{ph} — B5는 53291x74551")
    else:
        issues.append("hp:pagePr 태그 없음 — 판형 확인 불가")
        print("  [!!] 판형 정보 없음")

    # 4) 이미지
    bins = [n for n in names if n.startswith("BinData/")]
    hpf = z.read("Contents/content.hpf").decode("utf-8")
    img_items = re.findall(r'id="(image\d+)"', hpf)
    ok = len(bins) == len(img_items)
    print(f"  {'[OK]' if ok else '[!!]'} 이미지: BinData {len(bins)}개, manifest {len(img_items)}개")
    if not ok:
        issues.append(f"BinData({len(bins)}) ≠ manifest({len(img_items)})")

    # 5) isEmbeded='1'
    bad = re.findall(r'<opf:item id="image[^"]*"(?![^>]*isEmbeded="1")[^>]*/>', hpf)
    ok = not bad
    if img_items:
        print(f"  {'[OK]' if ok else '[!!]'} isEmbeded='1': {'모두 OK' if ok else f'{len(bad)}개 누락'}")
        if not ok:
            issues.append(f"isEmbeded='1' 누락 {len(bad)}개")

    # 6) XML 무결성
    errs = []
    for n in names:
        if n.endswith(".xml") or n.endswith(".hpf"):
            try:
                ET.fromstring(z.read(n))
            except Exception as e:
                errs.append(f"{n}: {e}")
    print(f"  {'[OK]' if not errs else '[!!]'} XML well-formed: {len(errs)}개 오류")
    issues.extend(errs)

    # 7) linesegarray (경고 원인 — strip_linesegs.py 필요)
    ls = sec.count("<hp:linesegarray>")
    if ls > 0:
        print(f"  [!!] linesegarray {ls}개 — 한글 '변조 가능성' 경고 유발")
        issues.append(f"linesegarray {ls}개 (strip_linesegs.py 필요)")
    else:
        print(f"  [OK] linesegarray 없음")

    # 8) 정보
    sec_kb = len(sec.encode()) // 1024
    total_kb = sum(z.getinfo(n).file_size for n in names) // 1024
    print(f"  [  ] section0: {sec_kb}KB  /  전체: {total_kb}KB")

    print(f"\n  {'[PASS] 이상 없음' if not issues else f'[FAIL] {len(issues)}개 문제'}")
    for iss in issues:
        print(f"    - {iss}")
    return issues


if __name__ == "__main__":
    paths = sys.argv[1:] if len(sys.argv) > 1 else [
        "docx/02_워크스페이스와빌드시스템.hwpx",
        "docx/06_파라미터와커스텀인터페이스.hwpx",
    ]
    results = [check(p) for p in paths]
    all_ok = not any(results)
    print("\n" + ("=== 전체 PASS ===" if all_ok else "=== 문제 있음 ==="))
