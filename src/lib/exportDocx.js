import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from 'docx';
import { exportItems } from './exportItems.js';
import { formatDate, cnNumber, formatTime } from './format.js';

const FONT = { ascii: 'Times New Roman', hAnsi: 'Times New Roman', eastAsia: '宋体', cs: 'Times New Roman' };
const HFONT = { ascii: 'Times New Roman', hAnsi: 'Times New Roman', eastAsia: '黑体', cs: 'Times New Roman' };
const run = (text, { heading, ...opts } = {}) => new TextRun({ text, font: heading ? HFONT : FONT, color: '000000', ...opts });

export async function buildDocx(notes, favorites) {
  const items = exportItems(notes, favorites);
  const children = [
    new Paragraph({ heading: HeadingLevel.TITLE, alignment: AlignmentType.CENTER, children: [run('《领袖·政党·新中国》', { heading: true, size: 40, bold: true })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 120 }, children: [run('我的学习笔记', { size: 28 })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 360 }, children: [run(`导出时间：${formatTime(Date.now())}　共 ${items.length} 个事件`, { size: 20, color: '666666' })] }),
  ];
  items.forEach(({ event, note, favorite }, i) => {
    children.push(new Paragraph({
      heading: HeadingLevel.HEADING_1, spacing: { before: 360, after: 120 }, keepNext: true,
      children: [run(`${cnNumber(i + 1)}、${formatDate(event)}　${event.title}`, { heading: true, size: 30, bold: true })],
    }));
    const status = [favorite ? '已收藏' : null, note ? '有笔记' : null].filter(Boolean).join(' · ');
    children.push(new Paragraph({ spacing: { after: 120 }, children: [run(status, { size: 18, color: '9E2A22' })] }));
    children.push(new Paragraph({ heading: HeadingLevel.HEADING_2, keepNext: true, spacing: { before: 120, after: 60 }, children: [run('摘要', { heading: true, size: 24, bold: true })] }));
    children.push(new Paragraph({ spacing: { after: 120, line: 360 }, children: [run(event.summary, { size: 22 })] }));
    children.push(new Paragraph({ heading: HeadingLevel.HEADING_2, keepNext: true, spacing: { before: 120, after: 60 }, children: [run('我的笔记', { heading: true, size: 24, bold: true })] }));
    const lines = note ? note.text.split(/\r?\n/) : ['（未写笔记，仅收藏）'];
    for (const line of lines) children.push(new Paragraph({ spacing: { after: 60, line: 360 }, children: [run(line, { size: 22, color: note ? '000000' : '888888' })] }));
  });
  if (!items.length) children.push(new Paragraph({ children: [run('暂无收藏或笔记。', { size: 22 })] }));

  const doc = new Document({
    creator: '领袖·政党·新中国',
    title: '我的学习笔记',
    styles: { default: { document: { run: { font: FONT, size: 22 } } } },
    sections: [{ properties: { page: { margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 } } }, children }],
  });
  return Packer.toBlob(doc);
}
