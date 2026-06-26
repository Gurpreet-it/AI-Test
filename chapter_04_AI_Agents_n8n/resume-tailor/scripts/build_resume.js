/*
 * Data-driven resume builder.
 * Reads ./resume.json and writes <name>_Resume.docx in the current directory.
 *
 * resume.json shape:
 * {
 *   "name": "Full Name",
 *   "tagline": "Principal SDET  |  QA Automation Leader  |  AI-Driven Testing",
 *   "contact": { "location": "...", "phone": "...", "email": "...",
 *                "links": [{"label":"linkedin.com/in/x","url":"https://..."}],
 *                "extra": "TheTestingAcademy (YouTube, 230K+)" },
 *   "summary": "One paragraph.",
 *   "skills": [ {"label":"Automation & Languages","value":"Playwright, ..."} ],
 *   "experience": [
 *     {"title":"Principal SDET","company":"Tekion","dates":"Dec 2020 – Present",
 *      "location":"Bengaluru, India","bullets":["...","..."]}
 *   ],
 *   "sections": [   // optional extra sections (Founder, Side Projects, etc.)
 *     {"heading":"FOUNDER & EDUCATOR",
 *      "roles":[{"title":"Founder","company":"TheTestingAcademy","dates":"2016 – Present","location":"Online","bullets":["..."]}],
 *      "lines":[{"label":"Side Projects","value":"a, b, c"}]}
 *   ],
 *   "certifications": ["Certified Scrum Master (PSM I)", "..."],
 *   "languages": "English (full professional)  •  Hindi (native)"
 * }
 */
const fs = require('fs');
const {
  Document, Packer, Paragraph, TextRun, AlignmentType, BorderStyle,
  ExternalHyperlink, TabStopType, TabStopPosition, LevelFormat
} = require('docx');

const data = JSON.parse(fs.readFileSync('./resume.json', 'utf8'));

const NAVY = "1F3A5F";
const ACCENT = "C0392B";
const GRAY = "555555";
const LINK = "0563C1";

const sectionHeading = (text) => new Paragraph({
  spacing: { before: 240, after: 80 },
  border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: ACCENT, space: 2 } },
  children: [new TextRun({ text, bold: true, size: 24, color: NAVY })]
});

const bullet = (text) => new Paragraph({
  numbering: { reference: "bullets", level: 0 },
  spacing: { after: 60 },
  children: [new TextRun({ text, size: 20 })]
});

const labeledLine = (label, value) => new Paragraph({
  spacing: { after: 40 },
  children: [
    new TextRun({ text: label + ": ", bold: true, size: 20 }),
    new TextRun({ text: value, size: 20 }),
  ]
});

const roleHeader = (title, company, dates, location) => [
  new Paragraph({
    spacing: { before: 120, after: 0 },
    tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }],
    children: [
      new TextRun({ text: title, bold: true, size: 22, color: "000000" }),
      new TextRun({ text: "\t" + (dates || ""), size: 18, color: GRAY, italics: true }),
    ]
  }),
  new Paragraph({
    spacing: { after: 60 },
    tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }],
    children: [
      new TextRun({ text: company || "", size: 20, color: ACCENT }),
      new TextRun({ text: "\t" + (location || ""), size: 18, color: GRAY, italics: true }),
    ]
  })
];

const children = [];

// Name + tagline
children.push(new Paragraph({ spacing: { after: 0 },
  children: [new TextRun({ text: data.name, bold: true, size: 44, color: NAVY })] }));
if (data.tagline) children.push(new Paragraph({ spacing: { after: 80 },
  children: [new TextRun({ text: data.tagline, bold: true, size: 22, color: ACCENT })] }));

// Contact lines
const c = data.contact || {};
const line1 = [];
if (c.location) line1.push(new TextRun({ text: c.location, size: 18, color: GRAY }));
if (c.phone) line1.push(new TextRun({ text: "  •  " + c.phone + "  •  ", size: 18, color: GRAY }));
if (c.email) line1.push(new ExternalHyperlink({ link: "mailto:" + c.email,
  children: [new TextRun({ text: c.email, size: 18, color: LINK, underline: {} })] }));
children.push(new Paragraph({ spacing: { after: 60 }, children: line1 }));

const line2 = [];
(c.links || []).forEach((lnk, i) => {
  if (i > 0) line2.push(new TextRun({ text: "  •  ", size: 18, color: GRAY }));
  line2.push(new ExternalHyperlink({ link: lnk.url,
    children: [new TextRun({ text: lnk.label, size: 18, color: LINK, underline: {} })] }));
});
if (c.extra) line2.push(new TextRun({ text: "  •  " + c.extra, size: 18, color: GRAY }));
if (line2.length) children.push(new Paragraph({ spacing: { after: 120 }, children: line2 }));

// Summary
if (data.summary) {
  children.push(sectionHeading("PROFESSIONAL SUMMARY"));
  children.push(new Paragraph({ spacing: { after: 80 },
    children: [new TextRun({ text: data.summary, size: 20 })] }));
}

// Skills
if (data.skills && data.skills.length) {
  children.push(sectionHeading("CORE SKILLS"));
  data.skills.forEach(s => children.push(labeledLine(s.label, s.value)));
}

// Experience
if (data.experience && data.experience.length) {
  children.push(sectionHeading("WORK EXPERIENCE"));
  data.experience.forEach(r => {
    roleHeader(r.title, r.company, r.dates, r.location).forEach(p => children.push(p));
    (r.bullets || []).forEach(b => children.push(bullet(b)));
  });
}

// Extra sections (Founder, Side Projects, etc.)
(data.sections || []).forEach(sec => {
  children.push(sectionHeading(sec.heading));
  (sec.roles || []).forEach(r => {
    roleHeader(r.title, r.company, r.dates, r.location).forEach(p => children.push(p));
    (r.bullets || []).forEach(b => children.push(bullet(b)));
  });
  (sec.lines || []).forEach(l => children.push(labeledLine(l.label, l.value)));
});

// Certifications
if (data.certifications && data.certifications.length) {
  children.push(sectionHeading("CERTIFICATIONS & RECOGNITION"));
  data.certifications.forEach(cert => children.push(bullet(cert)));
}

// Languages
if (data.languages) {
  children.push(sectionHeading("LANGUAGES"));
  children.push(new Paragraph({ spacing: { after: 40 },
    children: [new TextRun({ text: data.languages, size: 20 })] }));
}

const doc = new Document({
  styles: { default: { document: { run: { font: "Calibri", size: 20 } } } },
  numbering: { config: [{ reference: "bullets",
    levels: [{ level: 0, format: LevelFormat.BULLET, text: "\u2022", alignment: AlignmentType.LEFT,
      style: { paragraph: { indent: { left: 360, hanging: 180 } } } }] }] },
  sections: [{
    properties: { page: { size: { width: 12240, height: 15840 },
      margin: { top: 720, right: 1080, bottom: 720, left: 1080 } } },
    children
  }]
});

const outName = (data.name || "Resume").replace(/[^A-Za-z0-9]+/g, "_") + "_Resume.docx";
Packer.toBuffer(doc).then(buffer => {
  fs.writeFileSync(outName, buffer);
  console.log("Wrote " + outName);
});
