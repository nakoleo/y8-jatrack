/**
 * roleDefaults.ts
 * Default KPI configurations for each role.
 * These are only used when creating a NEW role config in Firestore for the first time.
 * After that, edits are saved to Firestore and loaded from there.
 */

import type { RoleConfig, RoleId } from '@/domain/types';

// ─── ART DIRECTOR (ปัจจุบัน = ข้อมูลของ constants.ts เดิม) ──────────────────

const ART_DIRECTOR_CONFIG: RoleConfig = {
  meta: {
    id: 'art_director',
    label: 'Art Director',
    labelEn: 'Art Director',
    color: '#C9A96E',
    monthlyTarget: 300,
    monthlyPlan: 317,
  },
  groups: {
    A: {
      label: 'Group A',
      name: 'Social Media',
      color: '#C9A96E',
      bg: 'rgba(201, 169, 110, 0.1)',
      border: 'rgba(201, 169, 110, 0.2)',
      tasks: [
        { id: 'A01', name: 'Single Artwork', desc: 'Content Post', channel: 'FB Page Y8 Thailand, Skincare, Supplements', creditPerUnit: 1, avgMonthly: 155, unit: 'Post', qtyConversion: '1 Post = 1 Artwork' },
        { id: 'A02', name: 'Set Album Artworks', desc: 'Content Post', channel: 'FB Page Y8 Thailand, Skincare, Supplements', creditPerUnit: 4, avgMonthly: 0, unit: 'Post', qtyConversion: '1 Post = 4 Artworks' },
        { id: 'A03', name: 'Ads Sale Artwork', desc: 'Advertising post', channel: 'FB Page Y8 Thailand, Skincare, Supplements', creditPerUnit: 1, avgMonthly: 0, unit: 'Post', qtyConversion: '1 Post = 1 Artwork' },
        { id: 'A04', name: 'Motion Design Short Video', desc: 'Content Post', channel: 'FB Page Y8 Thailand, Skincare, Supplements', creditPerUnit: 5, avgMonthly: 25, unit: 'Clip', qtyConversion: '1 Post = 1 Clip (6-10 Sec)' },
        { id: 'A05', name: 'IG Carousel Artworks', desc: 'Content Post', channel: 'IG: Y8_Thailand', creditPerUnit: 1, avgMonthly: 33, unit: 'Artwork', qtyConversion: '1 Product launch = 33 Artworks' },
      ],
    },
    B: {
      label: 'Group B',
      name: 'CRM & Direct Support',
      color: '#4682B4',
      bg: 'rgba(70, 130, 180, 0.1)',
      border: 'rgba(70, 130, 180, 0.2)',
      tasks: [
        { id: 'B01', name: 'Rich Message (PNG) Artworks', desc: 'LINE Broadcast', channel: 'LINE OA', creditPerUnit: 1, avgMonthly: 10, unit: 'Artwork', qtyConversion: '1 Broadcast = 1 Artwork' },
        { id: 'B02', name: 'Single Artwork (Closed Group)', desc: 'Content Post', channel: 'FB Page: Exclusive Club (กลุ่มปิด)', creditPerUnit: 1, avgMonthly: 4, unit: 'Post', qtyConversion: '1 Post = 1 Artwork' },
      ],
    },
    C: {
      label: 'Group C',
      name: 'Admin & Sales Support',
      color: '#8A9A5B',
      bg: 'rgba(138, 154, 91, 0.1)',
      border: 'rgba(138, 154, 91, 0.2)',
      tasks: [
        { id: 'C01', name: 'Sales Admin Support Artwork', desc: 'Marketing Tools', channel: 'internal & Sales Support', creditPerUnit: 1, avgMonthly: 8, unit: 'Artwork', qtyConversion: '1 Artwork = 1 Artwork' },
        { id: 'C02', name: 'Promotion for Admin Artwork', desc: 'Monthly Promotion', channel: 'FB Pages, LINE OA', creditPerUnit: 1, avgMonthly: 8, unit: 'Artwork', qtyConversion: '1 Artwork = 1 Artwork' },
      ],
    },
    D: {
      label: 'Group D',
      name: 'LIVE & E-Commerce',
      color: '#A0785A',
      bg: 'rgba(160, 120, 90, 0.1)',
      border: 'rgba(160, 120, 90, 0.2)',
      tasks: [
        { id: 'D01', name: 'LIVE Backdrop Artwork', desc: 'LIVE Support', channel: 'TikTok, TikTok Shop', creditPerUnit: 5, avgMonthly: 20, unit: 'Design', qtyConversion: '1 LIVE Design = 2 Artwork' },
        { id: 'D02', name: 'Promo & E-Commerce Artwork', desc: 'Combined Support', channel: 'TikTok, Shopee, Lazada, LINE Shopping', creditPerUnit: 1, avgMonthly: 12, unit: 'Artwork', qtyConversion: '1 Artwork = 1 Artwork' },
      ],
    },
    E: {
      label: 'Group E',
      name: 'Trade & Brand Event',
      color: '#B784A7',
      bg: 'rgba(183, 132, 167, 0.1)',
      border: 'rgba(183, 132, 167, 0.2)',
      tasks: [
        { id: 'E01', name: 'Event Backdrop Artwork', desc: 'MKT Materials (POSM)', channel: 'Brand Event', creditPerUnit: 5, avgMonthly: 10, unit: 'Artwork', qtyConversion: '1 Artwork = 1 Artwork' },
        { id: 'E02', name: 'In-store Marketing Materials', desc: 'MKT Materials (POSM)', channel: 'Pharmacy', creditPerUnit: 1, avgMonthly: 10, unit: 'Item', qtyConversion: '1 Artwork = 1 Artwork' },
      ],
    },
    F: {
      label: 'Group F',
      name: 'Special Project',
      color: '#008080',
      bg: 'rgba(0, 128, 128, 0.1)',
      border: 'rgba(0, 128, 128, 0.2)',
      tasks: [
        { id: 'F01', name: 'Artwork Design Proofing & Adj.', desc: 'Packaging & Label', channel: 'OEM (Factory)', creditPerUnit: 1, avgMonthly: 2, unit: 'Item', qtyConversion: '1 Artwork = 1 Artwork' },
        { id: 'F02', name: 'Packaging New Design', desc: 'Packaging & Label', channel: 'internal & Sales Support', creditPerUnit: 10, avgMonthly: 4, unit: 'Design', qtyConversion: '1 Product = 1 Design' },
        { id: 'F03', name: 'Product 3D Mockup Artwork', desc: 'Packaging & Label', channel: 'Presentation', creditPerUnit: 2, avgMonthly: 4, unit: 'Artwork', qtyConversion: '1 Artwork = 1 Artwork' },
      ],
    },
    G: {
      label: 'Group G',
      name: 'Marketing Campaign',
      color: '#707080',
      bg: 'rgba(112, 112, 128, 0.1)',
      border: 'rgba(112, 112, 128, 0.2)',
      tasks: [
        { id: 'G01', name: 'Campaign Promote Artwork', desc: 'Campaign BUT', channel: 'FB, TikTok, LINE OA', creditPerUnit: 3, avgMonthly: 12, unit: 'Artwork', qtyConversion: '1 Campaign = 1-5 Artwork' },
      ],
    },
  },
};

// ─── GRAPHIC DESIGNER ─────────────────────────────────────────────────────────

const GRAPHIC_DESIGNER_CONFIG: RoleConfig = {
  meta: {
    id: 'graphic_designer',
    label: 'Graphic Designer',
    labelEn: 'Graphic Designer',
    color: '#E07B54',
    monthlyTarget: 200,
    monthlyPlan: 220,
  },
  groups: {
    A: {
      label: 'Group A',
      name: 'Social Media Artwork',
      color: '#E07B54',
      bg: 'rgba(224, 123, 84, 0.1)',
      border: 'rgba(224, 123, 84, 0.2)',
      tasks: [
        { id: 'A01', name: 'Single Post Artwork', desc: 'Content Post', creditPerUnit: 1, avgMonthly: 80, unit: 'Artwork', qtyConversion: '1 Post = 1 Artwork' },
        { id: 'A02', name: 'Story/Reel Cover', desc: 'Story Frame', creditPerUnit: 1, avgMonthly: 20, unit: 'Artwork', qtyConversion: '1 Story = 1 Frame' },
        { id: 'A03', name: 'Carousel Set', desc: 'Carousel Post', creditPerUnit: 3, avgMonthly: 10, unit: 'Set', qtyConversion: '1 Set = 3-5 Artworks' },
      ],
    },
    B: {
      label: 'Group B',
      name: 'Print & POSM',
      color: '#4682B4',
      bg: 'rgba(70, 130, 180, 0.1)',
      border: 'rgba(70, 130, 180, 0.2)',
      tasks: [
        { id: 'B01', name: 'Flyer / Leaflet', desc: 'Print Material', creditPerUnit: 2, avgMonthly: 5, unit: 'Item', qtyConversion: '1 Design = 1 Item' },
        { id: 'B02', name: 'Poster / Banner', desc: 'POSM', creditPerUnit: 3, avgMonthly: 4, unit: 'Item', qtyConversion: '1 Design = 1 Item' },
        { id: 'B03', name: 'Sticker / Label', desc: 'Product Label', creditPerUnit: 1, avgMonthly: 10, unit: 'Item', qtyConversion: '1 Design = 1 Item' },
      ],
    },
    C: {
      label: 'Group C',
      name: 'Template & Asset',
      color: '#8A9A5B',
      bg: 'rgba(138, 154, 91, 0.1)',
      border: 'rgba(138, 154, 91, 0.2)',
      tasks: [
        { id: 'C01', name: 'Canva Template', desc: 'Reusable Template', creditPerUnit: 5, avgMonthly: 2, unit: 'Template', qtyConversion: '1 Template = 1 Design' },
        { id: 'C02', name: 'Icon / Illustration Set', desc: 'Asset Creation', creditPerUnit: 3, avgMonthly: 3, unit: 'Set', qtyConversion: '1 Set = 5-10 Icons' },
      ],
    },
  },
};

// ─── VDO EDITOR ───────────────────────────────────────────────────────────────

const VDO_EDITOR_CONFIG: RoleConfig = {
  meta: {
    id: 'vdo_editor',
    label: 'VDO Editor',
    labelEn: 'VDO Editor',
    color: '#7B61FF',
    monthlyTarget: 150,
    monthlyPlan: 160,
  },
  groups: {
    A: {
      label: 'Group A',
      name: 'Short-form Video',
      color: '#7B61FF',
      bg: 'rgba(123, 97, 255, 0.1)',
      border: 'rgba(123, 97, 255, 0.2)',
      tasks: [
        { id: 'A01', name: 'TikTok / Reels (< 60s)', desc: 'Short Video', creditPerUnit: 5, avgMonthly: 12, unit: 'Clip', qtyConversion: '1 Clip = 1 Video' },
        { id: 'A02', name: 'Motion Text / Subtitle', desc: 'Post-production', creditPerUnit: 2, avgMonthly: 15, unit: 'Clip', qtyConversion: '1 Clip = 1 Video' },
        { id: 'A03', name: 'Product Demo Short (< 30s)', desc: 'Product Video', creditPerUnit: 5, avgMonthly: 8, unit: 'Clip', qtyConversion: '1 Clip = 1 Video' },
      ],
    },
    B: {
      label: 'Group B',
      name: 'Long-form Video',
      color: '#4682B4',
      bg: 'rgba(70, 130, 180, 0.1)',
      border: 'rgba(70, 130, 180, 0.2)',
      tasks: [
        { id: 'B01', name: 'YouTube / Facebook Video (> 60s)', desc: 'Long Video', creditPerUnit: 10, avgMonthly: 4, unit: 'Clip', qtyConversion: '1 Clip = 1 Video' },
        { id: 'B02', name: 'Testimonial / Review Edit', desc: 'Review Video', creditPerUnit: 8, avgMonthly: 2, unit: 'Clip', qtyConversion: '1 Clip = 1 Video' },
      ],
    },
    C: {
      label: 'Group C',
      name: 'LIVE Support',
      color: '#E07B54',
      bg: 'rgba(224, 123, 84, 0.1)',
      border: 'rgba(224, 123, 84, 0.2)',
      tasks: [
        { id: 'C01', name: 'LIVE Intro / Outro', desc: 'LIVE Support', creditPerUnit: 3, avgMonthly: 5, unit: 'Item', qtyConversion: '1 Item = 1 Motion' },
        { id: 'C02', name: 'Screen Overlay / Lower-Third', desc: 'LIVE Graphic', creditPerUnit: 2, avgMonthly: 8, unit: 'Item', qtyConversion: '1 Item = 1 Graphic' },
      ],
    },
  },
};

// ─── CONTENT CREATOR ──────────────────────────────────────────────────────────

const CONTENT_CREATOR_CONFIG: RoleConfig = {
  meta: {
    id: 'content_creator',
    label: 'Content Creator',
    labelEn: 'Content Creator',
    color: '#2BAE66',
    monthlyTarget: 180,
    monthlyPlan: 200,
  },
  groups: {
    A: {
      label: 'Group A',
      name: 'Caption & Copy',
      color: '#2BAE66',
      bg: 'rgba(43, 174, 102, 0.1)',
      border: 'rgba(43, 174, 102, 0.2)',
      tasks: [
        { id: 'A01', name: 'Facebook Caption', desc: 'Social Post', creditPerUnit: 1, avgMonthly: 60, unit: 'Post', qtyConversion: '1 Post = 1 Caption' },
        { id: 'A02', name: 'IG Caption + Hashtag', desc: 'Social Post', creditPerUnit: 1, avgMonthly: 30, unit: 'Post', qtyConversion: '1 Post = 1 Caption' },
        { id: 'A03', name: 'TikTok Script', desc: 'Video Script', creditPerUnit: 2, avgMonthly: 15, unit: 'Script', qtyConversion: '1 Script = 1 Video' },
        { id: 'A04', name: 'Ad Copy (FB/Google)', desc: 'Paid Ads', creditPerUnit: 2, avgMonthly: 10, unit: 'Copy', qtyConversion: '1 Ad = 1-3 Variations' },
      ],
    },
    B: {
      label: 'Group B',
      name: 'Long-form Content',
      color: '#4682B4',
      bg: 'rgba(70, 130, 180, 0.1)',
      border: 'rgba(70, 130, 180, 0.2)',
      tasks: [
        { id: 'B01', name: 'Blog Article', desc: 'SEO Content', creditPerUnit: 5, avgMonthly: 4, unit: 'Article', qtyConversion: '1 Article = 300-500 words' },
        { id: 'B02', name: 'LINE OA Broadcast Message', desc: 'CRM Message', creditPerUnit: 2, avgMonthly: 8, unit: 'Message', qtyConversion: '1 Broadcast = 1 Message' },
        { id: 'B03', name: 'Email Newsletter', desc: 'Email Marketing', creditPerUnit: 3, avgMonthly: 4, unit: 'Email', qtyConversion: '1 Email = 1 Campaign' },
      ],
    },
    C: {
      label: 'Group C',
      name: 'Campaign & Planning',
      color: '#8A9A5B',
      bg: 'rgba(138, 154, 91, 0.1)',
      border: 'rgba(138, 154, 91, 0.2)',
      tasks: [
        { id: 'C01', name: 'Monthly Content Plan', desc: 'Planning', creditPerUnit: 5, avgMonthly: 1, unit: 'Plan', qtyConversion: '1 Plan = 1 Month' },
        { id: 'C02', name: 'Campaign Brief & Concept', desc: 'Campaign', creditPerUnit: 5, avgMonthly: 2, unit: 'Brief', qtyConversion: '1 Campaign = 1 Brief' },
      ],
    },
  },
};

// ─── SOCIAL ADMIN ─────────────────────────────────────────────────────────────

const SOCIAL_ADMIN_CONFIG: RoleConfig = {
  meta: {
    id: 'social_admin',
    label: 'Social Admin',
    labelEn: 'Social Admin',
    color: '#FF6B9D',
    monthlyTarget: 120,
    monthlyPlan: 130,
  },
  groups: {
    A: {
      label: 'Group A',
      name: 'Post Scheduling',
      color: '#FF6B9D',
      bg: 'rgba(255, 107, 157, 0.1)',
      border: 'rgba(255, 107, 157, 0.2)',
      tasks: [
        { id: 'A01', name: 'Schedule Post (FB/IG)', desc: 'Scheduling', creditPerUnit: 0.5, avgMonthly: 80, unit: 'Post', qtyConversion: '1 Post = 1 Schedule' },
        { id: 'A02', name: 'TikTok Upload & Tag', desc: 'Publishing', creditPerUnit: 1, avgMonthly: 20, unit: 'Clip', qtyConversion: '1 Clip = 1 Upload' },
        { id: 'A03', name: 'LINE OA Broadcast Schedule', desc: 'LINE Publish', creditPerUnit: 1, avgMonthly: 8, unit: 'Broadcast', qtyConversion: '1 = 1 Broadcast' },
      ],
    },
    B: {
      label: 'Group B',
      name: 'Community Management',
      color: '#4682B4',
      bg: 'rgba(70, 130, 180, 0.1)',
      border: 'rgba(70, 130, 180, 0.2)',
      tasks: [
        { id: 'B01', name: 'Comment Reply / DM', desc: 'Engagement', creditPerUnit: 0.5, avgMonthly: 50, unit: 'Reply', qtyConversion: '1 Reply = 1 Response' },
        { id: 'B02', name: 'Inbox Message Handling', desc: 'Customer Service', creditPerUnit: 1, avgMonthly: 30, unit: 'Thread', qtyConversion: '1 Thread = 1 Case' },
      ],
    },
    C: {
      label: 'Group C',
      name: 'Report & Monitor',
      color: '#8A9A5B',
      bg: 'rgba(138, 154, 91, 0.1)',
      border: 'rgba(138, 154, 91, 0.2)',
      tasks: [
        { id: 'C01', name: 'Weekly Performance Report', desc: 'Analytics', creditPerUnit: 3, avgMonthly: 4, unit: 'Report', qtyConversion: '1 Report = 1 Week' },
        { id: 'C02', name: 'Monthly Analytics Summary', desc: 'Monthly Report', creditPerUnit: 5, avgMonthly: 1, unit: 'Report', qtyConversion: '1 Report = 1 Month' },
        { id: 'C03', name: 'Ad Campaign Monitor', desc: 'Paid Ads Watch', creditPerUnit: 2, avgMonthly: 4, unit: 'Campaign', qtyConversion: '1 Campaign = 1 Monitor' },
      ],
    },
  },
};

// ─── EXPORTS ──────────────────────────────────────────────────────────────────

export const ROLE_DEFAULTS: Record<string, RoleConfig> = {
  art_director: ART_DIRECTOR_CONFIG,
  graphic_designer: GRAPHIC_DESIGNER_CONFIG,
  vdo_editor: VDO_EDITOR_CONFIG,
  content_creator: CONTENT_CREATOR_CONFIG,
  social_admin: SOCIAL_ADMIN_CONFIG,
};

export const ROLE_LIST: Array<{ id: string; label: string; color: string }> = [
  { id: 'art_director', label: 'Art Director', color: '#C9A96E' },
  { id: 'graphic_designer', label: 'Graphic Designer', color: '#E07B54' },
  { id: 'vdo_editor', label: 'VDO Editor', color: '#7B61FF' },
  { id: 'content_creator', label: 'Content Creator', color: '#2BAE66' },
  { id: 'social_admin', label: 'Social Admin', color: '#FF6B9D' },
];

export const ROLE_EMOJI: Record<string, string> = {
  art_director: '🎨',
  graphic_designer: '✏️',
  vdo_editor: '🎬',
  content_creator: '📝',
  social_admin: '📱',
  custom: '⚙️',
};
