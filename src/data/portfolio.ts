// Concise homepage content from the supplied CV and current user instructions.
// Destinations and case studies can be added when real project evidence is available.
export interface Project {
  id: string;
  name: string;
  description: string;
  role: string;
  context: string;
  technologies: readonly string[];
  problem?: string;
  contribution?: string;
  outcome?: string;
  media?: { src: string; alt: string; preview?: boolean };
  links?: { label: string; href: string }[];
}
export const projects: readonly Project[] = [
  {
    id: 'hydroconnect',
    name: 'HydroConnect',
    description: 'Solar-powered clean water infrastructure with IoT water-quality monitoring in Dusun Pengos, Gunungkidul. I led power-generation deployment and oversaw instrumentation.',
    role: 'Vice Project Director',
    context: 'IEEE SIGHT × Telkom Indonesia CSR',
    technologies: ['IoT', 'Instrumentation', 'Solar power'],
  },
  {
    id: 'ostosense',
    name: 'OSTOSENSE',
    description: 'A medical wearable project for ostomy leakage-risk monitoring. I developed the ESP32-S3 edge-inference pipeline and sensor feature extraction, integrated with a mobile application.',
    role: 'AI Engineer',
    context: 'PKM-KC 2026',
    technologies: ['ESP32-S3', 'Machine learning', 'React Native'],
  },
  {
    id: 'fish-schooling',
    name: 'Fish Schooling Simulation',
    description: 'An agent-based fish-schooling simulation under changing water currents, with adjustable parameters, real-time visualization, and group-coherence analysis.',
    role: 'Sole Developer',
    context: 'Simulation Modeling coursework',
    technologies: ['Unity', 'C#', 'Agent-based modeling'],
  },
  {
    id: 'aws-cloud',
    name: 'AWS Cloud Project',
    description: 'An academic cloud project built on Amazon Web Services.',
    role: 'Course project',
    context: 'Cloud coursework',
    technologies: ['AWS', 'Cloud'],
  },
] as const;

// Current roles first, then completed roles by most recent end date.
export const experience = [
  {
    organization: 'HydroSense',
    role: 'Project Lead · Universitas Gadjah Mada',
    period: 'Oct 2026 – Present',
    description: 'Leading a Telkom-funded water infrastructure project, coordinating water treatment, pumping, and IoT workstreams with faculty, student teams, and village stakeholders for an initial service target of 25 households.',
  },
  {
    organization: 'NightLogin · DTETI FT UGM',
    role: 'Head of Human Resources',
    period: 'Jan 2026 – Present',
    description: 'Coordinating HR programs, member development activities, and internal and external opportunity sharing for NightLogin members.',
  },
  {
    organization: 'KMTETI FT UGM',
    role: 'Head of Social Affairs Division',
    period: 'Jan 2026 – Present',
    description: 'Led community development programs and coordinated volunteers and local stakeholders in Pengos and Srimulyo.',
  },
  {
    organization: 'HydroConnect',
    role: 'Vice Project Director, Power Generation & Instrumentation',
    period: 'Nov 2024 – Mar 2026',
    description: 'Coordinated power-generation deployment and IoT instrumentation for community clean water infrastructure.',
  },
] as const;

export interface Highlight {
  title: string;
  context: string;
  description: string;
  category: 'honor' | 'certification';
  featured?: boolean;
}

export const highlights: readonly Highlight[] = [
  {
    title: 'AWS Certified AI Practitioner', context: 'AWS · 2026', category: 'certification', featured: true,
    description: 'Earned the AWS Certified AI Practitioner certification in October 2026.',
  },
  {
    title: 'Top 20, BRI GAMA IBCC', context: '2026', category: 'honor', featured: true,
    description: 'Selected among the top 20 teams in BRI GAMA IBCC.',
  },
  {
    title: 'OSTOSENSE received national PKM-KC funding', context: '2026', category: 'honor', featured: true,
    description: 'AI Engineer on the nationally funded OSTOSENSE medical wearable project.',
  },
  {
    title: 'National finalist, KIHAJAR STEM', context: '2022', category: 'honor', featured: true,
    description: 'Represented Southeast Sulawesi at the national finals of KIHAJAR STEM.',
  },
  {
    title: 'OSTOSENSE software copyright registration', context: '2026', category: 'honor',
    description: 'Listed as a co-creator on the Indonesian copyright registration for the OSTOSENSE software.',
  },
  {
    title: 'Passed UGM internal PKM-KC selection', context: '2025', category: 'honor',
    description: 'Scored 675/700 in the internal selection for a bronchopneumonia early detection device, contributing as a full-stack developer.',
  },
  {
    title: 'Provincial finalist, KSN Physics', context: '2021 & 2022', category: 'honor',
    description: 'Represented Southeast Sulawesi in Physics at the provincial stage of Kompetisi Sains Nasional.',
  },
  {
    title: 'Ranked first in the MIPA cohort', context: 'SMAN 1 Kendari Barat · 2024', category: 'honor',
    description: 'Graduated in the MIPA stream with a final report-card score of 94.96/100.',
  },
  {
    title: 'AWS Academy Graduate — Cloud Web Application Builder', context: 'AWS Academy · 2026', category: 'certification',
    description: 'Completed 12 hours of Cloud Web Application Builder training.',
  },
  {
    title: 'AWS Academy Graduate — Cloud Foundations', context: 'AWS Academy · 2026', category: 'certification',
    description: 'Completed 20 hours of Cloud Foundations training.',
  },
  {
    title: 'Deep Learning in Python', context: 'DataCamp · 2026', category: 'certification',
    description: 'Completed training in neural networks, Keras, and deep learning model optimization.',
  },
  {
    title: 'CCNA: Introduction to Networks', context: 'Cisco Networking Academy · 2026', category: 'certification',
    description: 'Completed foundational training in IP addressing, routing, switching, and network protocols.',
  },
];
