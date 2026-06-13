const fs = require("fs");
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, AlignmentType, LevelFormat, TabStopType, TabStopPosition,
  TableOfContents, HeadingLevel, BorderStyle, WidthType, ShadingType,
  VerticalAlign, PageNumber, PageBreak,
} = require("docx");

const FONT = "Tahoma"; // good Thai coverage on Windows
const PURPLE = "440E48", GOLD = "9C6A00", GREY = "726973", LINE = "CCCCCC";

// ---- numbered-step references (each list restarts at 1) ----
let stepRef = 0;
const stepConfigs = Array.from({ length: 120 }, (_, i) => ({
  reference: `s${i}`,
  levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT,
    style: { paragraph: { indent: { left: 600, hanging: 320 } } } }],
}));

// ---- helpers ----
const H1 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun(t)] });
const H2 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun(t)] });
const H3 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_3, children: [new TextRun(t)] });

function P(runs, opts = {}) {
  const children = Array.isArray(runs)
    ? runs
    : [new TextRun(runs)];
  return new Paragraph({ spacing: { after: 120 }, children, ...opts });
}
const T = (text, o = {}) => new TextRun({ text, ...o });
const Bold = (text) => new TextRun({ text, bold: true });

function who(text) {
  return new Paragraph({
    spacing: { after: 80 },
    shading: { type: ShadingType.CLEAR, fill: "F3EEF3" },
    border: { left: { style: BorderStyle.SINGLE, size: 18, color: PURPLE, space: 6 } },
    children: [new TextRun({ text: "ใครใช้ได้: ", bold: true, color: PURPLE }), new TextRun({ text })],
  });
}

function steps(items) {
  const ref = `s${stepRef++}`;
  return items.map((it) =>
    new Paragraph({
      numbering: { reference: ref, level: 0 },
      spacing: { after: 60 },
      children: Array.isArray(it) ? it : [new TextRun(it)],
    }),
  );
}
function bullets(items) {
  return items.map((it) =>
    new Paragraph({
      numbering: { reference: "bul", level: 0 },
      spacing: { after: 40 },
      children: Array.isArray(it) ? it : [new TextRun(it)],
    }),
  );
}
function note(text) {
  return new Paragraph({
    spacing: { before: 60, after: 120 },
    shading: { type: ShadingType.CLEAR, fill: "FEF0D6" },
    border: { left: { style: BorderStyle.SINGLE, size: 18, color: "F4A626", space: 6 } },
    children: [new TextRun({ text: "💡 ", }), new TextRun({ text, italics: true })],
  });
}

// ---- table builder ----
const border = { style: BorderStyle.SINGLE, size: 1, color: LINE };
const borders = { top: border, bottom: border, left: border, right: border,
  insideHorizontal: border, insideVertical: border };
function cell(text, w, { head = false, bold = false, fill } = {}) {
  return new TableCell({
    width: { size: w, type: WidthType.DXA },
    margins: { top: 60, bottom: 60, left: 100, right: 100 },
    shading: { type: ShadingType.CLEAR, fill: fill ?? (head ? PURPLE : "FFFFFF") },
    verticalAlign: VerticalAlign.CENTER,
    children: [new Paragraph({ children: [new TextRun({ text, bold: head || bold, color: head ? "FFFFFF" : "140516", size: head ? 18 : 18 })] })],
  });
}
function table(widths, rows) {
  const total = widths.reduce((a, b) => a + b, 0);
  return new Table({
    width: { size: total, type: WidthType.DXA },
    columnWidths: widths,
    borders,
    rows: rows.map((r, ri) =>
      new TableRow({
        tableHeader: ri === 0,
        children: r.map((c, ci) => cell(typeof c === "string" ? c : c.t, widths[ci], { head: ri === 0, ...(typeof c === "object" ? c : {}) })),
      }),
    ),
  });
}

const CW = 9360; // content width (US Letter, 1" margins)

// =====================================================================
const body = [];

// ---- Cover ----
body.push(
  new Paragraph({ spacing: { before: 2600, after: 0 }, alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: "CM Operations", bold: true, size: 64, color: PURPLE })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 120 },
    children: [new TextRun({ text: "ระบบบริหารงานปฏิบัติการหลายสาขา", size: 32, color: GREY })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 80 },
    children: [new TextRun({ text: "คู่มือการใช้งานแบบละเอียด แยกตามบทบาท (User Guide by Role)", size: 28, bold: true })] }),
  new Paragraph({ alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: "ปรับปรุงล่าสุด: มิถุนายน 2026  ·  เว็บแอป: cm-management.vercel.app", size: 20, color: GREY })] }),
  new Paragraph({ children: [new PageBreak()] }),
);

// ---- TOC ----
body.push(H1("สารบัญ (Table of Contents)"));
body.push(new TableOfContents("Table of Contents", { hyperlink: true, headingStyleRange: "1-2" }));
body.push(new Paragraph({ children: [new PageBreak()] }));

// ===== 1. ภาพรวม =====
body.push(H1("1. ภาพรวมระบบ (Overview)"));
body.push(P("CM Operations คือระบบบริหารงานปฏิบัติการสำหรับธุรกิจหลายสาขา ตอบโจทย์คำถามหลักของผู้บริหารว่า ใครทำอะไร ที่สาขาไหน เมื่อไหร่ (Who / What / Where / When) แทนการสั่งงานกระจัดกระจายในแชต"));
body.push(P([Bold("หน้าจอหลัก: "), T("ส่วนติดต่อผู้ใช้ (UI) เป็นภาษาอังกฤษ คู่มือนี้อธิบายเป็นภาษาไทยและกำกับชื่อปุ่ม/เมนูภาษาอังกฤษไว้ในวงเล็บ เพื่อให้กดตรงกับที่เห็นบนหน้าจอ")]));
body.push(P([Bold("การเข้าใช้: "), T("เปิดเว็บผ่านมือถือหรือคอมพิวเตอร์ — พนักงานหน้างานเน้นใช้บนมือถือ ส่วนผู้จัดการ/เจ้าของใช้แดชบอร์ดบนเว็บ")]));
body.push(note("ทุกการกระทำที่เปลี่ยนสถานะงานจะถูกบันทึกไว้ในประวัติ (Activity Log) โดยอัตโนมัติ ตรวจสอบย้อนหลังได้เสมอว่าใครทำอะไรเมื่อไหร่"));

// ===== 2. บทบาท =====
body.push(H1("2. บทบาทผู้ใช้และสิทธิ์ (Roles & Permissions)"));
body.push(P("ระบบแบ่งผู้ใช้เป็น 6 บทบาท แต่ละบทบาทเห็นและทำได้เฉพาะข้อมูลในขอบเขตสาขาของตน (location scope)"));
body.push(table([2300, 2400, 4660], [
  ["บทบาท (Role)", "ขอบเขต (Scope)", "ทำอะไรได้"],
  ["Owner\n(เจ้าของ)", "ทุกสาขา", "เห็นทุกอย่าง, ประกาศทั่วบริษัท, รายงานทั้งหมด, จัดการพนักงาน"],
  ["Area Manager\n(ผู้จัดการเขต)", "หลายสาขาที่ดูแล", "มอบหมายงานข้ามสาขา, อนุมัติ/ตรวจรับ, ติดตามงานเกินกำหนด"],
  ["Store Manager\n(ผจก.สาขา)", "สาขาตนเอง", "สร้าง/มอบหมาย/ตรวจรับงาน, ประกาศของสาขา, จัดการพนักงาน"],
  ["Shift Lead\n(หัวหน้ากะ)", "สาขาตนเอง (ในกะ)", "มอบหมายงานในกะ, สร้างงาน, ตรวจเช็กลิสต์, จัดการ Projects/Compliance"],
  ["Employee\n(พนักงาน)", "งานของตนเอง", "รับงาน, ทำงานให้เสร็จ, แนบรูปหลักฐาน, ดู SOP"],
  ["New Hire\n(พนักงานใหม่)", "การอบรมเท่านั้น", "เข้าศูนย์อบรม (Training) และทำงานฝึกที่ได้รับมอบหมาย"],
]));

// ===== 3. เมนู =====
body.push(H1("3. เมนูที่แต่ละบทบาทเห็น (Sidebar by Role)"));
body.push(P("แถบเมนูด้านซ้าย (Sidebar) จะแสดงเฉพาะเมนูที่บทบาทนั้นใช้ได้ เครื่องหมาย ✓ = เห็น, — = ไม่เห็น"));
const Y = "✓", N = "—";
body.push(table([2160, 1000, 1000, 1080, 1040, 1040, 1040], [
  ["เมนู (Menu)", "Owner", "Area", "Store", "Shift", "Emp", "New"],
  ["Dashboard", Y, Y, Y, Y, Y, Y],
  ["Tasks", Y, Y, Y, Y, Y, Y],
  ["Calendar", Y, Y, Y, Y, Y, Y],
  ["Projects", Y, Y, Y, Y, N, N],
  ["Checklists", Y, Y, Y, Y, N, N],
  ["Maintenance", Y, Y, Y, Y, Y, Y],
  ["Compliance", Y, Y, Y, Y, N, N],
  ["Inventory", Y, Y, Y, Y, N, N],
  ["People", Y, Y, Y, N, N, N],
  ["Announcements", Y, Y, Y, Y, Y, Y],
  ["Training Hub", Y, Y, Y, Y, Y, Y],
  ["Notifications", Y, Y, Y, Y, Y, Y],
]));
body.push(note("เมนูที่ไม่เห็น = ไม่ใช่หน้าที่ของบทบาทนั้น เช่น พนักงานทั่วไปไม่ต้องจัดการพนักงาน (People) หรือตั้งค่าตารางงานซ้ำ (Checklists/Compliance)"));
body.push(new Paragraph({ children: [new PageBreak()] }));

// ===== 4. Login =====
body.push(H1("4. การเข้าสู่ระบบ (Login)"));
who("ทุกบทบาท");
body.push(who("ทุกบทบาท"));
body.push(...steps([
  "เปิดเว็บ cm-management.vercel.app บนเบราว์เซอร์ (มือถือหรือคอมพิวเตอร์)",
  [Bold("กรอกอีเมล (Email) "), T("ที่บริษัทให้ไว้")],
  [Bold("กรอกรหัสผ่าน (Password) "), T("— ครั้งแรกใช้รหัสที่ผู้ดูแลตั้งให้")],
  [T("กดปุ่ม "), Bold("Sign in"), T(" จะเข้าสู่หน้า Dashboard อัตโนมัติ")],
]));
body.push(note("เปลี่ยนรหัสผ่านได้ที่เมนูโปรไฟล์ (มุมซ้ายล่าง คลิกชื่อตัวเอง > Profile) — ดูหัวข้อ 5.13"));

// ===== 5. ฟังก์ชัน =====
body.push(H1("5. คู่มือการใช้งานแต่ละฟังก์ชัน (Functions Step-by-Step)"));

// 5.1 Dashboard
body.push(H2("5.1 หน้าหลัก (Dashboard)"));
body.push(who("ทุกบทบาท (เนื้อหาแตกต่างตามสิทธิ์)"));
body.push(P("หน้าแรกหลังล็อกอิน แสดงงานและข่าวสารที่เกี่ยวกับคุณ"));
body.push(...steps([
  "ดูคำทักทายและสรุปงานของฉัน 4 ช่อง: My open (งานค้าง), Due today (ครบกำหนดวันนี้), Overdue (เกินกำหนด), Completed (เสร็จแล้ว)",
  [Bold("My Tasks "), T("— รายการงานที่ถูกมอบหมายให้คุณ เรียงงานเกินกำหนดขึ้นก่อน คลิกที่งานเพื่อเปิดรายละเอียด")],
  [Bold("Company News "), T("— ข่าวสาร/ประกาศบริษัท ป้าย “New” คือยังไม่ได้อ่าน")],
  [Bold("(ผู้จัดการขึ้นไป) "), T("เลื่อนลงดูส่วน Management Overview: สถิติรวม, อัตราทำงานสำเร็จแยกสาขา, งานเกินกำหนด, ฟีดกิจกรรมสด และปุ่มดาวน์โหลดรายงาน CSV")],
]));

// 5.2 Tasks
body.push(H2("5.2 งาน (Tasks)"));
body.push(H3("5.2.1 พนักงาน: รับและทำงานให้เสร็จ"));
body.push(who("Employee, New Hire, Shift Lead ขึ้นไป"));
body.push(...steps([
  [T("เข้าเมนู "), Bold("Tasks"), T(" หรือกด "), Bold("My Tasks"), T(" จากหน้า Dashboard")],
  "คลิกงานที่ต้องการทำเพื่อเปิดรายละเอียด (ชื่องาน, คำอธิบาย, กำหนดส่ง, สาขา)",
  [T("กดเปลี่ยนสถานะเป็น "), Bold("In Progress"), T(" เมื่อเริ่มลงมือทำ")],
  [T("ทำงานเสร็จแล้วกดเป็น "), Bold("Done"), T(" — ถ้างานกำหนดให้ "), Bold("แนบรูปหลักฐาน (proof required)"), T(" ต้องอัปโหลดรูปอย่างน้อย 1 รูปก่อนจึงจะกด Done ได้")],
  "รอผู้จัดการตรวจรับ (Verified) — งานถือว่าเสร็จสมบูรณ์เมื่อขึ้นสถานะ Verified",
]));
body.push(note("ลำดับสถานะ: Pending (รอทำ) → In Progress (กำลังทำ) → Done (เสร็จ) → Verified (ตรวจรับแล้ว). หากเลยกำหนดจะขึ้น Overdue สีแดงอัตโนมัติ"));
body.push(H3("5.2.2 หัวหน้า/ผู้จัดการ: สร้าง มอบหมาย และตรวจรับงาน"));
body.push(who("Shift Lead, Store Manager, Area Manager, Owner"));
body.push(...steps([
  [T("เข้าเมนู "), Bold("Tasks"), T(" แล้วกด "), Bold("+ New Task")],
  "กรอกชื่องาน, คำอธิบาย, สาขา, ผู้รับผิดชอบ (Assignee), ความสำคัญ (Priority), กำหนดส่ง (Due date) และเลือกว่าต้องแนบรูปหรือไม่ (Proof required)",
  [T("กดบันทึก — ระบบจะแจ้งเตือนผู้รับงานทันที")],
  [T("ใช้ตัวกรอง (filters) ด้านบนเพื่อดูเฉพาะงานของฉัน (My tasks), ตามผู้รับผิดชอบ, ความสำคัญ หรือสถานะ")],
  [T("ตรวจรับงาน: เปิดงานที่สถานะ "), Bold("Done"), T(" ตรวจรูป/ผลงาน แล้วกด "), Bold("Verified"), T(" (เฉพาะ Store Manager ขึ้นไป)")],
]));

// 5.3 Projects
body.push(H2("5.3 โปรเจกต์ (Projects)"));
body.push(who("Shift Lead, Store Manager, Area Manager, Owner"));
body.push(P("บอร์ดบริหารโปรเจกต์สไตล์ monday — ติดตามงานเป็นกลุ่มตามสถานะ พร้อมเจ้าของงาน ช่วงเวลา และความคืบหน้า"));
body.push(...steps([
  [T("เข้าเมนู "), Bold("Projects")],
  [T("สลับมุมมองด้านบน: "), Bold("Main Table"), T(" (ตารางจัดกลุ่มตามสถานะ), "), Bold("Kanban"), T(" (การ์ด), "), Bold("Timeline"), T(" (แผนภูมิแกนต์), "), Bold("Portfolio"), T(" (กราฟสรุป)")],
  [T("กด "), Bold("+ Add project"), T(" ในกลุ่มสถานะเพื่อเพิ่มโปรเจกต์ใหม่")],
  "แก้ไขในตารางได้ทันที: เปลี่ยนเจ้าของ (Owner), สถานะ (Status), ความสำคัญ (Priority), ช่วงเวลา (Timeline), ลูกค้า (Client)",
  [T("กดลูกศรหน้าชื่อโปรเจกต์เพื่อกาง "), Bold("Subitems"), T(" — เพิ่มงานย่อย (tasks) เข้าโปรเจกต์และเปลี่ยนสถานะได้")],
  [T("คอลัมน์ "), Bold("Files"), T(" — แนบลิงก์ไฟล์ที่เกี่ยวข้อง; ใช้ "), Bold("ตัวกรอง Location"), T(" เพื่อดูเฉพาะสาขา (เห็นเมื่อมีหลายสาขา)")],
]));

// 5.4 Calendar
body.push(H2("5.4 ปฏิทิน (Calendar)"));
body.push(who("ทุกบทบาท"));
body.push(...steps([
  [T("เข้าเมนู "), Bold("Calendar")],
  "เลื่อนเดือนด้วยปุ่ม ‹ › หรือกด Today เพื่อกลับเดือนปัจจุบัน",
  [Bold("คลิกที่ช่องวันใดก็ได้ "), T("เพื่อเปิดแผงรายละเอียดด้านล่าง — เห็นทุกงานของวันนั้น: ชื่องาน, ผู้รับผิดชอบ, เวลา/กำหนดส่ง และสถานะ")],
  "คลิกที่รายการในแผงเพื่อกระโดดไปหน้างานนั้น (สีแถบบอกสถานะ; 🔧 = งานซ่อม, 📋 = เช็กลิสต์)",
]));

// 5.5 Checklists
body.push(H2("5.5 เช็กลิสต์ประจำ (Checklists)"));
body.push(who("Shift Lead ขึ้นไป (ตั้งค่า) — พนักงานทำงานที่ถูกสร้างจากเช็กลิสต์ผ่านเมนู Tasks"));
body.push(P("ใช้สร้างชุดงานซ้ำตามรอบปฏิทิน (รายวัน/สัปดาห์/เดือน) เช่น งานเปิดร้าน-ปิดร้าน"));
body.push(...steps([
  [T("เข้าเมนู "), Bold("Checklists"), T(" แล้วกด "), Bold("New template")],
  "ตั้งชื่อ, เลือกความถี่ (Daily / Weekly / Monthly), ใส่รายการงานทีละบรรทัด, เลือกสาขา, ความสำคัญ และต้องแนบรูปหรือไม่",
  "ระบบจะสร้างงานให้อัตโนมัติตามรอบที่ตั้งไว้ทุกวัน และแจ้งผู้จัดการสาขา",
  [T("กด "), Bold("Generate now"), T(" เพื่อสร้างงานของวันนี้ทันที หรือปิด/เปิดเทมเพลตด้วยปุ่มสลับสถานะ")],
]));

// 5.6 Maintenance
body.push(H2("5.6 งานซ่อมบำรุง (Maintenance)"));
body.push(H3("5.6.1 แจ้งปัญหา"));
body.push(who("ทุกบทบาท"));
body.push(...steps([
  [T("เข้าเมนู "), Bold("Maintenance"), T(" แล้วกด "), Bold("Report an issue")],
  "เลือกประเภท/พื้นที่ (Area), กรอกหัวข้อและรายละเอียด, ความสำคัญ, แนบรูปได้",
  "กดส่ง — ผู้จัดการสาขาจะได้รับแจ้งเตือนทันที",
]));
body.push(H3("5.6.2 รับเรื่อง มอบหมาย และปิดงาน"));
body.push(who("Shift Lead, Store Manager, Area Manager, Owner"));
body.push(...steps([
  "เปิดรายการที่แจ้งเข้ามา กดรับทราบ (Acknowledge) และมอบหมายผู้รับผิดชอบ/ผู้รับเหมา (Vendor)",
  [T("อัปเดตสถานะ: Open → Acknowledged → In Progress → "), Bold("Resolved"), T(" (ใส่บันทึกการแก้ไขและค่าใช้จ่ายได้) → Closed")],
  "งานที่เกิน SLA จะถูกยกระดับ (escalate) แจ้งผู้จัดการอัตโนมัติ",
]));

// 5.7 Compliance
body.push(H2("5.7 งานบริการตามรอบ (Compliance)"));
body.push(who("Shift Lead, Store Manager, Area Manager, Owner"));
body.push(P("ติดตามงานบำรุงรักษาตามรอบ เช่น กำจัดแมลง (Pest Control), ล้างบ่อดักไขมัน (Grease Trap), ล้างฮูดครัว (Hood Cleaning), ตรวจถังดับเพลิง — นับรอบจากวันที่ทำล่าสุด"));
body.push(...steps([
  [T("เข้าเมนู "), Bold("Compliance"), T(" แล้วกด "), Bold("New schedule")],
  "กรอกชื่อบริการ, ประเภท (Category), ความถี่ (Monthly/Quarterly/Semi-annual/Annual), สาขา, ผู้รับผิดชอบ, ผู้รับเหมา+เบอร์ติดต่อ, งบประมาณ และวันที่ทำล่าสุด (Last service date)",
  "ระบบคำนวณวันครบกำหนดถัดไป (Next due) อัตโนมัติ = วันทำล่าสุด + ความถี่ และสร้างงานรอไว้",
  [T("หน้า Compliance จัดกลุ่มตามสถานะ "), Bold("Overdue / Due Soon / Upcoming"), T(" — ดูผู้รับเหมา, วันครบกำหนด, จำนวนวันคงเหลือ")],
  [T("เมื่อทำเสร็จกด "), Bold("Mark done"), T(" ระบุวันที่ทำและค่าใช้จ่ายจริง — ระบบจะปิดรอบนี้และสร้างรอบถัดไปให้อัตโนมัติ")],
]));
body.push(note("ระบบจะแจ้งเตือนล่วงหน้าหลายครั้งก่อนครบกำหนด (14 / 7 / 3 / 1 วัน) และเตือนซ้ำเมื่อเกินกำหนด ส่งถึงผู้รับผิดชอบและผู้จัดการสาขา"));

// 5.8 Inventory
body.push(H2("5.8 คลังสินค้า (Inventory)"));
body.push(who("Shift Lead, Store Manager, Area Manager, Owner"));
body.push(...steps([
  [T("เข้าเมนู "), Bold("Inventory"), T(" เพื่อดูรายการสินค้าและระดับคงเหลือ (เทียบ par/reorder level)")],
  [T("กด "), Bold("Count"), T(" เพื่อบันทึกการนับสต็อกรอบใหม่ — กรอกจำนวนที่นับได้แล้วส่ง")],
  [T("เพิ่มสินค้าใหม่ด้วย "), Bold("New item"), T(" (ตั้งหน่วย, par level, reorder level)")],
  "สินค้าที่ต่ำกว่าจุดสั่งซื้อจะแจ้งเตือน Low-stock และนับรวมในแดชบอร์ดผู้จัดการ",
]));

// 5.9 People
body.push(H2("5.9 จัดการพนักงาน (People)"));
body.push(who("Store Manager, Area Manager, Owner เท่านั้น"));
body.push(...steps([
  [T("เข้าเมนู "), Bold("People"), T(" เพื่อดูรายชื่อพนักงานในขอบเขตของคุณ")],
  "เพิ่มพนักงานใหม่ กำหนดบทบาท (Role), สาขา และข้อมูลติดต่อ",
  "แก้ไขบทบาท/สาขา หรือปิดการใช้งาน (Inactive) เมื่อพนักงานลาออก",
]));
body.push(note("การตั้งบทบาทมีผลต่อสิทธิ์ทันที (ดูตารางหัวข้อ 2) — ตั้งให้ตรงหน้าที่จริง"));

// 5.10 Announcements
body.push(H2("5.10 ประกาศ (Announcements)"));
body.push(H3("อ่านประกาศ"));
body.push(who("ทุกบทบาท"));
body.push(...bullets([
  [T("เข้าเมนู "), Bold("Announcements"), T(" หรือดูจากการ์ด Company News บนหน้า Dashboard")],
  "ประกาศที่ปักหมุด (📌) จะอยู่บนสุด; ป้าย New = ยังไม่อ่าน",
]));
body.push(H3("สร้างประกาศ"));
body.push(who("Store Manager, Area Manager, Owner"));
body.push(...steps([
  [T("กด "), Bold("New announcement"), T(" กรอกหัวข้อและเนื้อหา")],
  "เลือกขอบเขต: เฉพาะสาขา หรือทั่วบริษัท (Owner/Area Manager), ติ๊กปักหมุด (Pin) ถ้าต้องการให้เด่น",
  "กดเผยแพร่ — พนักงานในขอบเขตจะได้รับแจ้งเตือน",
]));

// 5.11 Training
body.push(H2("5.11 ศูนย์อบรม (Training Hub)"));
body.push(who("ทุกบทบาท (สำคัญสำหรับ New Hire)"));
body.push(...steps([
  [T("เข้าเมนู "), Bold("Training Hub")],
  "เปิดสื่อการอบรมตามหมวด (SOP, Safety, Service, Product, Compliance)",
  "พนักงานใหม่: เรียนรู้เนื้อหาและทำงานฝึกที่ได้รับมอบหมายในเมนู Tasks",
]));

// 5.12 Notifications
body.push(H2("5.12 การแจ้งเตือน (Notifications)"));
body.push(who("ทุกบทบาท"));
body.push(...steps([
  "กดไอคอนกระดิ่ง 🔔 มุมขวาบน เพื่อดูแจ้งเตือนล่าสุด (งานที่ได้รับมอบหมาย, ใกล้/เกินกำหนด, ประกาศ ฯลฯ)",
  [T("หรือเข้าเมนู "), Bold("Notifications"), T(" เพื่อดูทั้งหมด")],
  "กดที่แจ้งเตือนเพื่อไปยังงานที่เกี่ยวข้อง หรือกด Mark all read เพื่อทำเครื่องหมายอ่านทั้งหมด",
]));

// 5.13 Profile
body.push(H2("5.13 โปรไฟล์และรหัสผ่าน (Profile)"));
body.push(who("ทุกบทบาท"));
body.push(...steps([
  "คลิกชื่อตัวเองที่มุมซ้ายล่างของแถบเมนู แล้วเลือก Profile",
  "แก้ไขข้อมูลติดต่อ และเปลี่ยนรหัสผ่าน (Change password)",
  "กดบันทึก (Save)",
]));
body.push(new Paragraph({ children: [new PageBreak()] }));

// ===== 6. คู่มือลัดแยกตามบทบาท =====
body.push(H1("6. คู่มือลัดแยกตามบทบาท (Quick Guide by Role)"));

function roleBlock(title, intro, daily) {
  body.push(H2(title));
  body.push(P(intro));
  body.push(P([Bold("ขั้นตอนประจำวัน:")]));
  body.push(...steps(daily));
}

roleBlock("6.1 Employee (พนักงาน)",
  "โฟกัสที่งานของตัวเอง: รับงาน ทำให้เสร็จ และแนบหลักฐาน",
  [
    "ล็อกอิน → ดูหน้า Dashboard ว่ามีงานค้าง/ครบกำหนดวันนี้กี่งาน",
    "เปิด My Tasks ทำงานเรียงตามกำหนดส่ง — กด In Progress เมื่อเริ่ม",
    "ทำเสร็จกด Done (แนบรูปถ้าระบบกำหนด)",
    "เช็กกระดิ่งแจ้งเตือนเป็นระยะ และอ่านประกาศบริษัท",
  ]);

roleBlock("6.2 New Hire (พนักงานใหม่)",
  "เน้นการอบรมและงานฝึก",
  [
    "ล็อกอิน → เข้า Training Hub เรียนเนื้อหาการอบรมตามลำดับ",
    "ทำงานฝึกที่ได้รับมอบหมายในเมนู Tasks",
    "สอบถามหัวหน้าผ่านงาน/ประกาศเมื่อมีข้อสงสัย",
  ]);

roleBlock("6.3 Shift Lead (หัวหน้ากะ)",
  "ดูแลงานภายในกะของสาขา",
  [
    "เปิดกะ: ตรวจ Checklists/Tasks ของวัน มอบหมายงานให้พนักงานในกะ",
    "ติดตามความคืบหน้าใน Tasks และช่วยแก้ปัญหาหน้างาน",
    "แจ้ง/ติดตามงานซ่อม (Maintenance) และงานตามรอบ (Compliance) ที่ใกล้ครบกำหนด",
    "ปิดกะ: ตรวจว่างานสำคัญเสร็จครบ",
  ]);

roleBlock("6.4 Store Manager (ผู้จัดการสาขา)",
  "รับผิดชอบภาพรวมของสาขาตนเอง",
  [
    "ตรวจ Dashboard ส่วน Management Overview: อัตราทำงานสำเร็จ, งานเกินกำหนดของสาขา",
    "สร้าง/มอบหมายงาน และตรวจรับงาน (Verified)",
    "จัดการพนักงาน (People), ออกประกาศสาขา (Announcements)",
    "ดูแล Inventory (สต็อก), Compliance (งานตามรอบ) และอนุมัติงานซ่อม",
  ]);

roleBlock("6.5 Area Manager (ผู้จัดการเขต)",
  "ดูแลหลายสาขาในเขต",
  [
    "ใช้ Dashboard เปรียบเทียบอัตราทำงานสำเร็จระหว่างสาขา (Completion by Location)",
    "มอบหมายงานข้ามสาขาและติดตามงานเกินกำหนด",
    "ออกประกาศระดับเขต/บริษัท และดาวน์โหลดรายงาน CSV (รายสัปดาห์/เดือน)",
    "ใช้ตัวกรอง Location ในหน้า Projects/Compliance เพื่อเจาะดูแต่ละสาขา",
  ]);

roleBlock("6.6 Owner (เจ้าของ / ผู้บริหารสูงสุด)",
  "เห็นภาพรวมทั้งบริษัท",
  [
    "ตรวจ Dashboard ภาพรวมทุกสาขา และฟีดกิจกรรมสด (Live Activity Feed)",
    "ดูรายงานเชิงลึก: People (อัตราตรงเวลา), Departments, Trends",
    "ออกประกาศทั่วบริษัท และดาวน์โหลดรายงาน CSV",
    "กำกับงาน Compliance/Maintenance ที่มีความเสี่ยงสูงทุกสาขา",
  ]);

body.push(new Paragraph({ children: [new PageBreak()] }));

// ===== 7. FAQ =====
body.push(H1("7. คำถามที่พบบ่อย (FAQ) และเคล็ดลับ"));
body.push(...bullets([
  [Bold("กด Done ไม่ได้? "), T("งานนั้นอาจต้องแนบรูปหลักฐานก่อน — อัปโหลดรูปอย่างน้อย 1 รูป")],
  [Bold("ทำไมมองไม่เห็นบางเมนู? "), T("เมนูแสดงตามบทบาท (ดูหัวข้อ 3) หากต้องการสิทธิ์เพิ่ม แจ้งผู้จัดการ")],
  [Bold("งานขึ้นสีแดง Overdue? "), T("คือเลยกำหนดส่ง ให้รีบดำเนินการ ระบบแจ้งเตือนหัวหน้าด้วยแล้ว")],
  [Bold("ใครตรวจรับงาน (Verified)? "), T("เฉพาะ Store Manager ขึ้นไป")],
  [Bold("ลืมรหัสผ่าน? "), T("แจ้งผู้จัดการ/ผู้ดูแลระบบเพื่อรีเซ็ตให้")],
  [Bold("ใช้บนมือถือได้ไหม? "), T("ได้ ทุกหน้ารองรับมือถือ — พนักงานหน้างานแนะนำให้ใช้มือถือ")],
]));
body.push(new Paragraph({ spacing: { before: 240 },
  children: [new TextRun({ text: "— จบคู่มือ —", italics: true, color: GREY })], alignment: AlignmentType.CENTER }));

// =====================================================================
const doc = new Document({
  styles: {
    default: { document: { run: { font: FONT, size: 22 } } },
    paragraphStyles: [
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 32, bold: true, font: FONT, color: PURPLE },
        paragraph: { spacing: { before: 280, after: 160 }, outlineLevel: 0 } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 26, bold: true, font: FONT, color: "5A1560" },
        paragraph: { spacing: { before: 200, after: 120 }, outlineLevel: 1 } },
      { id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 23, bold: true, font: FONT, color: "140516" },
        paragraph: { spacing: { before: 140, after: 80 }, outlineLevel: 2 } },
    ],
  },
  numbering: { config: [
    { reference: "bul", levels: [{ level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT,
      style: { paragraph: { indent: { left: 560, hanging: 300 } } } }] },
    ...stepConfigs,
  ] },
  sections: [{
    properties: { page: { size: { width: 12240, height: 15840 }, margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } } },
    headers: { default: new Header({ children: [new Paragraph({
      border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: PURPLE, space: 4 } },
      children: [new TextRun({ text: "CM Operations · คู่มือการใช้งาน", color: GREY, size: 16 })] })] }) },
    footers: { default: new Footer({ children: [new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: "หน้า ", color: GREY, size: 16 }),
        new TextRun({ children: [PageNumber.CURRENT], color: GREY, size: 16 })] })] }) },
    children: body,
  }],
});

Packer.toBuffer(doc).then((buf) => {
  fs.writeFileSync(process.argv[2] || "User-Guide.docx", buf);
  console.log("written", process.argv[2]);
});
