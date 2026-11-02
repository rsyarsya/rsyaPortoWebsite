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

export const experience = [
  {
    organization: 'HydroConnect',
    role: 'Vice Project Director, Power Generation & Instrumentation',
    period: 'Mar 2025 – Mar 2026',
    description: 'Coordinated power-generation deployment and IoT instrumentation for community clean water infrastructure.',
  },
  {
    organization: 'HydroSense',
    role: 'Project Lead · Universitas Gadjah Mada',
    period: 'Oct 2026 – Present',
    description: 'Leading a Telkom-funded water infrastructure project, coordinating water treatment, pumping, and IoT workstreams with faculty, student teams, and village stakeholders for an initial service target of 25 households.',
  },
  {
    organization: 'FIND IT! UGM',
    role: 'Sub-Coordinator, AI Hackathon Competition',
    period: 'Oct 2025 – May 2026',
    description: 'Coordinated competition mechanics, participant communication, and technical judging criteria for a 24-hour AI hackathon.',
  },
  {
    organization: 'KMTETI FT UGM',
    role: 'Head of Social Affairs Division',
    period: 'Jan 2025 – Dec 2025',
    description: 'Led community development programs and coordinated volunteers and local stakeholders in Pengos and Srimulyo.',
  },
] as const;

export const highlights = [
  { title: 'OSTOSENSE received national PKM-KC funding', context: '2026' },
  { title: 'National finalist, KIHAJAR STEM', context: '2022' },
  { title: 'Deep Learning in Python', context: 'DataCamp' },
  { title: 'CCNA: Introduction to Networks', context: 'Cisco Networking Academy' },
] as const;
