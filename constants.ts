
import { WorkGroup } from './types';

export const MONTHLY_TARGET = 300;
export const MONTHLY_PLAN = 317;

const commonNoteA = "อ้างอิงจาก 120 Briefs/เดือน ของอ๊อฟ เเทน";

export const WORK_GROUPS: Record<string, WorkGroup> = {
  A: {
    label: "Group A",
    name: "Social Media",
    color: "#C9A96E", // Champagne Gold
    bg: "rgba(201, 169, 110, 0.1)",
    border: "rgba(201, 169, 110, 0.2)",
    tasks: [
      { id: "A01", name: "Single Artwork", desc: "Content Post", channel: "FB Page Y8 Thailand, Skincare, Supplements", creditPerUnit: 1, avgMonthly: 155, unit: "Post", qtyConversion: "1 Post = 1 Artwork", note: commonNoteA },
      { id: "A02", name: "Set Album Artworks", desc: "Content Post", channel: "FB Page Y8 Thailand, Skincare, Supplements", creditPerUnit: 4, avgMonthly: 0, unit: "Post", qtyConversion: "1 Post = 4 Artworks", note: commonNoteA },
      { id: "A03", name: "Ads Sale Artwork", desc: "Advertising post", channel: "FB Page Y8 Thailand, Skincare, Supplements", creditPerUnit: 1, avgMonthly: 0, unit: "Post", qtyConversion: "1 Post = 1 Artwork", note: commonNoteA },
      { id: "A04", name: "Motion Design Short Video", desc: "Content Post", channel: "FB Page Y8 Thailand, Skincare, Supplements", creditPerUnit: 5, avgMonthly: 25, unit: "Clip", qtyConversion: "1 Post = 1 Clip (6-10 Sec)", note: "วิดีโอสั้น 6-10 วินาที" },
      { id: "A05", name: "IG Carousel Artworks", desc: "Content Post", channel: "IG: Y8_Thailand", creditPerUnit: 1, avgMonthly: 33, unit: "Artwork", qtyConversion: "1 Product launch = 33 Artworks", note: "" },
    ],
  },
  B: {
    label: "Group B",
    name: "CRM & Direct Support",
    color: "#4682B4", // Steel Blue
    bg: "rgba(70, 130, 180, 0.1)",
    border: "rgba(70, 130, 180, 0.2)",
    tasks: [
      { id: "B01", name: "Rich Message (PNG) Artworks", desc: "LINE Broadcast", channel: "LINE OA", creditPerUnit: 1, avgMonthly: 10, unit: "Artwork", qtyConversion: "1 Broadcast = 1 Artwork", note: "คอนเทนต์สัปดาห์ละ 2 ครั้ง" },
      { id: "B02", name: "Single Artwork (Closed Group)", desc: "Content Post", channel: "FB Page: Exclusive Club (กลุ่มปิด)", creditPerUnit: 1, avgMonthly: 4, unit: "Post", qtyConversion: "1 Post = 1 Artwork", note: "ใช้ลงตามแผนของคุณมิ้ม" },
    ],
  },
  C: {
    label: "Group C",
    name: "Admin & Sales Support",
    color: "#8A9A5B", // Sage Green
    bg: "rgba(138, 154, 91, 0.1)",
    border: "rgba(138, 154, 91, 0.2)",
    tasks: [
      { id: "C01", name: "Sales Admin Support Artwork", desc: "Marketing Tools", channel: "internal & Sales Support", creditPerUnit: 1, avgMonthly: 8, unit: "Artwork", qtyConversion: "1 Artwork = 1 Artwork", note: "คอนเทนต์เฉพาะกลุ่ม Exclusive" },
      { id: "C02", name: "Promotion for Admin Artwork", desc: "Monthly Promotion", channel: "FB Pages, LINE OA", creditPerUnit: 1, avgMonthly: 8, unit: "Artwork", qtyConversion: "1 Artwork = 1 Artwork", note: "สื่อสนับสนุนการขาย/แอดมิน" },
    ],
  },
  D: {
    label: "Group D",
    name: "LIVE & E-Commerce",
    color: "#A0785A", // Warm Mocha
    bg: "rgba(160, 120, 90, 0.1)",
    border: "rgba(160, 120, 90, 0.2)",
    tasks: [
      { id: "D01", name: "LIVE Backdrop Artwork", desc: "LIVE Support", channel: "TikTok, TikTok Shop", creditPerUnit: 5, avgMonthly: 20, unit: "Design", qtyConversion: "1 LIVE Design = 2 Artwork", note: "ฉากหลังสำหรับ LIVE สด" },
      { id: "D02", name: "Promo & E-Commerce Artwork", desc: "Combined Support", channel: "TikTok, Shopee, Lazada, LINE Shopping", creditPerUnit: 1, avgMonthly: 12, unit: "Artwork", qtyConversion: "1 Artwork = 1 Artwork", note: "สื่อโปรโมชั่น LIVE และตกแต่งร้านค้าออนไลน์" },
    ],
  },
  E: {
    label: "Group E",
    name: "Trade & Brand Event",
    color: "#B784A7", // Mauve
    bg: "rgba(183, 132, 167, 0.1)",
    border: "rgba(183, 132, 167, 0.2)",
    tasks: [
      { id: "E01", name: "Event Backdrop Artwork", desc: "MKT Materials (POSM)", channel: "Brand Event", creditPerUnit: 5, avgMonthly: 10, unit: "Artwork", qtyConversion: "1 Artwork = 1 Artwork", note: "ภาพฉากพื้นหลังสำหรับออกงานกิจกรรมนอกสถานที่ เช่น Booth หรือ Event" },
      { id: "E02", name: "In-store Marketing Materials", desc: "MKT Materials (POSM)", channel: "Pharmacy", creditPerUnit: 1, avgMonthly: 10, unit: "Item", qtyConversion: "1 Artwork = 1 Artwork", note: "สื่อสำหรับใช้ภายในร้านขายยา" },
    ],
  },
  F: {
    label: "Group F",
    name: "Special Project",
    color: "#008080", // Teal
    bg: "rgba(0, 128, 128, 0.1)",
    border: "rgba(0, 128, 128, 0.2)",
    tasks: [
      { id: "F01", name: "Artwork Design Proofing & Adj.", desc: "Packaging & Label", channel: "OEM (Factory)", creditPerUnit: 1, avgMonthly: 2, unit: "Item", qtyConversion: "1 Artwork = 1 Artwork", note: "แก้ไขฉลากสินค้า / ตรวจดีไซน์หน้างาน" },
      { id: "F02", name: "Packaging New Design", desc: "Packaging & Label", channel: "internal & Sales Support", creditPerUnit: 10, avgMonthly: 4, unit: "Design", qtyConversion: "1 Product = 1 Design", note: "งานออกแบบใหม่" },
      { id: "F03", name: "Product 3D Mockup Artwork", desc: "Packaging & Label", channel: "Presentation", creditPerUnit: 2, avgMonthly: 4, unit: "Artwork", qtyConversion: "1 Artwork = 1 Artwork", note: "ภาพจำลองสินค้าเสมือนจริง" },
    ],
  },
  G: {
    label: "Group G",
    name: "Marketing Campaign",
    color: "#707080", // Violet-Gray
    bg: "rgba(112, 112, 128, 0.1)",
    border: "rgba(112, 112, 128, 0.2)",
    tasks: [
      { id: "G01", name: "Campaign Promote Artwork", desc: "Campaign BUT", channel: "FB, TikTok, LINE OA", creditPerUnit: 3, avgMonthly: 12, unit: "Artwork", qtyConversion: "1 Campaign = 1-5 Artwork", note: "ภาพโปรโมทแคมเปญเดือนละ 1 แคมเปญ" },
    ],
  },
};
