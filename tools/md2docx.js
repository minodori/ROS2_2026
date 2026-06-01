// 마크다운 → DOCX 변환기 (ROS2 교재용)
// 사용: node tools/md2docx.js <input.md> <output.docx>
const fs = require("fs");
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  AlignmentType, HeadingLevel, BorderStyle, WidthType, ShadingType,
  LevelFormat, ExternalHyperlink, PageNumber, Header, Footer, PageBreak,
} = require("docx");

const inPath = process.argv[2];
const outPath = process.argv[3];
const src = fs.readFileSync(inPath, "utf8").replace(/\r\n/g, "\n");
const lines = src.split("\n");

// 신국판 152×225mm (DXA: 1mm = 56.6929)
const PAGE = { width: 8617, height: 12756 };
const MARGIN = { top: 1134, bottom: 1134, left: 1021, right: 1021 };
const CONTENT_W = PAGE.width - MARGIN.left - MARGIN.right; // 6575

const BODY_FONT = "Malgun Gothic";
const CODE_FONT = "Consolas";

// ---- 인라인 파서: **bold**, `code`, [text](url) ----
function inlineRuns(text, baseOpts = {}) {
  const runs = [];
  // 토큰화: 링크 → 코드 → 볼드 순으로 분해
  const re = /(\[[^\]]+\]\([^)]+\))|(`[^`]+`)|(\*\*[^*]+\*\*)/g;
  let last = 0, m;
  const push = (t, opts) => { if (t) runs.push(new TextRun({ text: t, font: BODY_FONT, ...baseOpts, ...opts })); };
  while ((m = re.exec(text)) !== null) {
    push(text.slice(last, m.index));
    const tok = m[0];
    if (tok.startsWith("[")) {
      const mm = tok.match(/\[([^\]]+)\]\(([^)]+)\)/);
      runs.push(new ExternalHyperlink({
        link: mm[2],
        children: [new TextRun({ text: mm[1], style: "Hyperlink", font: BODY_FONT })],
      }));
    } else if (tok.startsWith("`")) {
      runs.push(new TextRun({ text: tok.slice(1, -1), font: CODE_FONT, size: 18, ...baseOpts }));
    } else if (tok.startsWith("**")) {
      push(tok.slice(2, -2), { bold: true });
    }
    last = re.lastIndex;
  }
  push(text.slice(last));
  return runs.length ? runs : [new TextRun({ text: "", font: BODY_FONT })];
}

const children = [];
const NUM_REFS = []; // 번호목록 reference 모음

function codeParagraphs(codeLines) {
  return codeLines.map((cl, i) => new Paragraph({
    shading: { type: ShadingType.CLEAR, fill: "F2F2F2" },
    spacing: { before: i === 0 ? 60 : 0, after: i === codeLines.length - 1 ? 60 : 0, line: 240 },
    indent: { left: 120 },
    children: [new TextRun({ text: cl || " ", font: CODE_FONT, size: 17 })],
  }));
}

function calloutParagraph(textLines) {
  // 인용/콜아웃 → 좌측 컬러바 + 옅은 배경
  return textLines.map((t, i) => new Paragraph({
    shading: { type: ShadingType.CLEAR, fill: "EAF2FB" },
    border: { left: { style: BorderStyle.SINGLE, size: 18, color: "2E75B6", space: 6 } },
    spacing: { before: i === 0 ? 80 : 0, after: i === textLines.length - 1 ? 80 : 0 },
    indent: { left: 160 },
    children: inlineRuns(t),
  }));
}

function makeTable(rows) {
  // rows: 배열의 배열(셀 텍스트). 첫 행 = 헤더
  const colCount = Math.max(...rows.map(r => r.length));
  const colW = Math.floor(CONTENT_W / colCount);
  const widths = Array(colCount).fill(colW);
  const border = { style: BorderStyle.SINGLE, size: 1, color: "BBBBBB" };
  const borders = { top: border, bottom: border, left: border, right: border };
  const trs = rows.map((cells, ri) => new TableRow({
    tableHeader: ri === 0,
    children: Array.from({ length: colCount }, (_, ci) => {
      const txt = cells[ci] || "";
      return new TableCell({
        borders,
        width: { size: colW, type: WidthType.DXA },
        shading: ri === 0 ? { type: ShadingType.CLEAR, fill: "D5E8F0" } : undefined,
        margins: { top: 60, bottom: 60, left: 100, right: 100 },
        children: [new Paragraph({ spacing: { line: 240 },
          children: inlineRuns(txt, ri === 0 ? { bold: true } : {}) })],
      });
    }),
  }));
  return new Table({ width: { size: colW * colCount, type: WidthType.DXA }, columnWidths: widths, rows: trs });
}

// ---- 라인 단위 파싱 ----
let i = 0;
function splitRow(line) {
  let s = line.trim().replace(/^\|/, "").replace(/\|$/, "");
  return s.split("|").map(c => c.trim());
}
while (i < lines.length) {
  let line = lines[i];

  // 페이지 나누기 마커(합본 생성용)
  if (line.trim() === "<<<PB>>>") {
    children.push(new Paragraph({ children: [new PageBreak()] }));
    i++; continue;
  }

  // 코드블록
  if (/^```/.test(line.trim())) {
    const code = [];
    i++;
    while (i < lines.length && !/^```/.test(lines[i].trim())) { code.push(lines[i]); i++; }
    i++; // 닫는 ```
    children.push(...codeParagraphs(code));
    continue;
  }

  // 표 (다음 줄이 구분선이면)
  if (/^\s*\|/.test(line) && i + 1 < lines.length && /^\s*\|?[\s:|-]+\|?\s*$/.test(lines[i + 1]) && lines[i+1].includes("-")) {
    const rows = [splitRow(line)];
    i += 2; // 헤더 + 구분선
    while (i < lines.length && /^\s*\|/.test(lines[i])) { rows.push(splitRow(lines[i])); i++; }
    children.push(makeTable(rows));
    children.push(new Paragraph({ spacing: { after: 80 }, children: [] }));
    continue;
  }

  // 콜아웃(인용)
  if (/^>\s?/.test(line)) {
    const block = [];
    while (i < lines.length && /^>\s?/.test(lines[i])) { block.push(lines[i].replace(/^>\s?/, "")); i++; }
    children.push(...calloutParagraph(block.filter(x => x.trim() !== "")));
    continue;
  }

  // 제목
  let h = line.match(/^(#{1,4})\s+(.*)$/);
  if (h) {
    const lvl = h[1].length;
    const map = { 1: HeadingLevel.HEADING_1, 2: HeadingLevel.HEADING_2, 3: HeadingLevel.HEADING_3, 4: HeadingLevel.HEADING_4 };
    children.push(new Paragraph({ heading: map[lvl], children: inlineRuns(h[2]) }));
    i++; continue;
  }

  // 수평선
  if (/^---+\s*$/.test(line.trim())) {
    children.push(new Paragraph({ border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: "CCCCCC", space: 1 } }, spacing: { after: 120 }, children: [] }));
    i++; continue;
  }

  // 번호 목록
  if (/^\s*\d+\.\s+/.test(line)) {
    const ref = "num" + children.length;
    while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
      const t = lines[i].replace(/^\s*\d+\.\s+/, "");
      children.push(new Paragraph({ numbering: { reference: ref, level: 0 }, spacing: { after: 20 }, children: inlineRuns(t) }));
      i++;
    }
    NUM_REFS.push(ref);
    continue;
  }

  // 불릿 목록 (- 또는 - [ ])
  if (/^\s*[-*]\s+/.test(line)) {
    while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
      const indent = (lines[i].match(/^(\s*)/)[1].length >= 2) ? 1 : 0;
      const t = lines[i].replace(/^\s*[-*]\s+/, "");
      children.push(new Paragraph({ numbering: { reference: "bullets", level: indent }, spacing: { after: 20 }, children: inlineRuns(t) }));
      i++;
    }
    continue;
  }

  // 빈 줄
  if (line.trim() === "") { i++; continue; }

  // 일반 문단
  children.push(new Paragraph({ spacing: { after: 120, line: 264 }, children: inlineRuns(line) }));
  i++;
}

// 번호 목록 config
const numberingConfig = [
  { reference: "bullets", levels: [
    { level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 360, hanging: 220 } } } },
    { level: 1, format: LevelFormat.BULLET, text: "–", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 220 } } } },
  ] },
  ...NUM_REFS.map(ref => ({ reference: ref, levels: [
    { level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 360, hanging: 240 } } } },
  ] })),
];

const doc = new Document({
  styles: {
    default: { document: { run: { font: BODY_FONT, size: 19 } } }, // 9.5pt 본문
    paragraphStyles: [
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 34, bold: true, font: BODY_FONT, color: "1F3864" },
        paragraph: { spacing: { before: 360, after: 200 }, outlineLevel: 0 } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 26, bold: true, font: BODY_FONT, color: "2E75B6" },
        paragraph: { spacing: { before: 280, after: 140 }, outlineLevel: 1 } },
      { id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 22, bold: true, font: BODY_FONT, color: "333333" },
        paragraph: { spacing: { before: 200, after: 100 }, outlineLevel: 2 } },
      { id: "Heading4", name: "Heading 4", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 20, bold: true, font: BODY_FONT },
        paragraph: { spacing: { before: 160, after: 80 }, outlineLevel: 3 } },
    ],
  },
  numbering: { config: numberingConfig },
  sections: [{
    properties: { page: { size: PAGE, margin: MARGIN } },
    footers: { default: new Footer({ children: [new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ children: [PageNumber.CURRENT], font: BODY_FONT, size: 16 })],
    })] }) },
    children,
  }],
});

Packer.toBuffer(doc).then(buf => { fs.writeFileSync(outPath, buf); console.log("생성:", outPath, buf.length, "bytes"); });
