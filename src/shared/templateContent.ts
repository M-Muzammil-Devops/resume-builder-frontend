/**
 * Role-specific starter content for each landing template (see LANDING_PRESETS).
 * Fictional people and example contact details only. Unlike the generic placeholders, this text is
 * usable as-is: buildTemplateContent leaves it unmarked, so exports keep it even when unedited.
 */
import type { ContactInfo, ResumeContent, ResumeSection } from "./types";

type Exp = { title: string; company: string; startDate: string; endDate: string; location: string; bullets: string[] };
type Edu = { degree: string; school: string; startDate: string; endDate: string; location: string };

export interface TemplateSample {
  fullName: string;
  /** Sample headshot (same-origin, public/templates/photos/<id>.webp) for templates designed with a photo. */
  photoUrl?: string;
  title: string;
  contact: ContactInfo;
  summary: string;
  experience: Exp[];
  education: Edu[];
  skills: { name: string; skills: string[] }[];
  achievements: { title: string; description: string; icon: string }[];
  certifications: { name: string; issuer: string }[];
  projects: { name: string; description: string; technologies: string[] }[];
  interests: { title: string; description: string }[];
  languages: { name: string; level: string; proficiency: number }[];
}

function contact(slug: string, phone: string, location: string): ContactInfo {
  return {
    phone,
    email: `${slug.replace(/-/g, ".")}@example.com`,
    linkedin: `linkedin.com/in/${slug}`,
    linkedinHref: `https://linkedin.com/in/${slug}`,
    location,
  };
}

export const TEMPLATE_SAMPLES: Record<string, TemplateSample> = {
  "classic-serif": {
    fullName: "Hannah Brooks",
    title: "Senior Business Analyst | Process Improvement | Data Analytics",
    contact: contact("hannah-brooks", "+1 (415) 555-0142", "San Francisco, CA"),
    summary:
      "Business analyst with 8+ years of experience turning messy operational data into clear decisions. Known for running requirement workshops, building self-serve dashboards and leading process redesigns that cut cost and cycle time. Comfortable bridging finance, operations and engineering teams.",
    experience: [
      { title: "Senior Business Analyst", company: "Northwind Logistics", startDate: "2021-03", endDate: "Present", location: "San Francisco, CA", bullets: [
        "Led requirements for a new order-to-cash platform used by 1,200 staff, delivering on time and 8% under budget.",
        "Built Power BI dashboards that replaced 30+ manual spreadsheets and saved finance 25 hours per week.",
        "Mapped and redesigned the returns process, cutting average refund time from 9 days to 3.",
      ] },
      { title: "Business Analyst", company: "Brightline Health", startDate: "2018-01", endDate: "2021-02", location: "Oakland, CA", bullets: [
        "Analyzed claims data for 400K members and found $2.1M in yearly billing leakage.",
        "Wrote 120+ user stories and acceptance criteria for a patient-portal rebuild with a 92% adoption rate.",
        "Automated weekly KPI reporting with SQL and Python, cutting prep time by 70%.",
      ] },
      { title: "Operations Analyst", company: "Harbor Retail Group", startDate: "2016-06", endDate: "2017-12", location: "San Jose, CA", bullets: [
        "Forecast store staffing needs, lowering overtime spend by 14% across 18 locations.",
        "Ran A/B tests on checkout flows that lifted online conversion by 6%.",
        "Presented monthly performance reviews to regional directors with clear action items.",
      ] },
    ],
    education: [
      { degree: "Master of Business Analytics", school: "University of California, Davis", startDate: "2014", endDate: "2016", location: "Davis, CA" },
      { degree: "Bachelor of Science in Economics", school: "San Diego State University", startDate: "2010", endDate: "2014", location: "San Diego, CA" },
    ],
    skills: [
      { name: "Analysis", skills: ["Requirements gathering", "Process mapping (BPMN)", "Gap analysis", "A/B testing"] },
      { name: "Tools", skills: ["SQL", "Power BI", "Tableau", "Excel", "Jira", "Confluence"] },
    ],
    achievements: [
      { title: "$2.1M leakage recovered", description: "Found and fixed billing errors in claims data within one fiscal year.", icon: "trophy" },
      { title: "25 hours saved weekly", description: "Replaced manual finance reports with self-serve dashboards.", icon: "zap" },
      { title: "Refunds 3x faster", description: "Redesigned the returns flow from 9 days down to 3.", icon: "star" },
    ],
    certifications: [
      { name: "Certified Business Analysis Professional (CBAP)", issuer: "IIBA" },
      { name: "Microsoft Certified: Power BI Data Analyst", issuer: "Microsoft" },
    ],
    projects: [
      { name: "Order-to-Cash Modernization", description: "Owned requirements and UAT for a platform rollout to 1,200 users.", technologies: ["BPMN", "Jira", "UAT"] },
      { name: "Finance KPI Hub", description: "Self-serve dashboards with automated daily refresh.", technologies: ["Power BI", "SQL"] },
    ],
    interests: [
      { title: "Data storytelling", description: "Writing short posts on turning numbers into decisions." },
      { title: "Mentoring", description: "Volunteer mentor for career changers moving into analytics." },
    ],
    languages: [
      { name: "English", level: "Native", proficiency: 100 },
      { name: "Spanish", level: "Professional", proficiency: 70 },
    ],
  },

  "marketing-cyan": {
    photoUrl: "/templates/photos/marketing-cyan.webp",
    fullName: "Olivia Grant",
    title: "Growth Marketing Manager | Performance & Lifecycle",
    contact: contact("olivia-grant", "+1 (312) 555-0187", "Chicago, IL"),
    summary:
      "Growth marketer with 7 years of experience scaling B2B and B2C brands through paid, lifecycle and content channels. Manages $3M+ annual budgets with a sharp eye on CAC and payback. Builds lean experiments, reads the data honestly and scales what works.",
    experience: [
      { title: "Growth Marketing Manager", company: "Lumen Apps", startDate: "2021-05", endDate: "Present", location: "Chicago, IL", bullets: [
        "Grew paid signups 140% year over year while lowering blended CAC by 22%.",
        "Launched lifecycle email and in-app journeys that lifted trial-to-paid conversion from 9% to 14%.",
        "Ran 60+ landing page experiments, adding $1.8M in annual recurring revenue.",
        "Managed a $3.2M budget across Google, Meta and LinkedIn with weekly ROAS reviews.",
      ] },
      { title: "Performance Marketing Specialist", company: "Fieldstone Retail", startDate: "2018-08", endDate: "2021-04", location: "Chicago, IL", bullets: [
        "Rebuilt the shopping campaign structure, raising ROAS from 3.1x to 5.4x.",
        "Introduced server-side tracking that recovered 18% of lost conversion data.",
        "Partnered with creative to test 200+ ad variants per quarter.",
      ] },
      { title: "Marketing Coordinator", company: "Bluebird Media", startDate: "2016-06", endDate: "2018-07", location: "Milwaukee, WI", bullets: [
        "Grew newsletter list from 8K to 45K subscribers in 18 months.",
        "Coordinated 12 product launches with sales, PR and product teams.",
        "Produced monthly reporting that guided channel spend decisions.",
      ] },
    ],
    education: [
      { degree: "Bachelor of Business Administration, Marketing", school: "University of Illinois Urbana-Champaign", startDate: "2012", endDate: "2016", location: "Champaign, IL" },
      { degree: "Digital Marketing Certificate", school: "Northwestern University", startDate: "2019", endDate: "2019", location: "Evanston, IL" },
    ],
    skills: [
      { name: "Channels", skills: ["Paid search", "Paid social", "Lifecycle email", "SEO", "CRO"] },
      { name: "Tools", skills: ["Google Ads", "Meta Ads", "GA4", "HubSpot", "Amplitude", "Looker Studio"] },
    ],
    achievements: [
      { title: "140% signup growth", description: "Scaled paid acquisition while cutting CAC by 22%.", icon: "trophy" },
      { title: "$1.8M new ARR", description: "From a structured landing page testing program.", icon: "zap" },
      { title: "5.4x ROAS", description: "Rebuilt shopping campaigns for a national retailer.", icon: "star" },
    ],
    certifications: [
      { name: "Google Ads Search Certification", issuer: "Google" },
      { name: "HubSpot Inbound Marketing", issuer: "HubSpot Academy" },
    ],
    projects: [
      { name: "Trial Conversion Program", description: "Onboarding journeys that lifted trial-to-paid by 5 points.", technologies: ["HubSpot", "Amplitude"] },
      { name: "Attribution Rebuild", description: "Server-side tracking and a unified channel report.", technologies: ["GA4", "GTM"] },
    ],
    interests: [
      { title: "Behavioral economics", description: "Applying pricing psychology to real experiments." },
      { title: "Running", description: "Two marathons finished, training for a third." },
    ],
    languages: [
      { name: "English", level: "Native", proficiency: 100 },
      { name: "French", level: "Intermediate", proficiency: 55 },
    ],
  },

  "executive-navy": {
    photoUrl: "/templates/photos/executive-navy.webp",
    fullName: "James Whitaker",
    title: "VP of Operations | Supply Chain | Scale-up Leadership",
    contact: contact("james-whitaker", "+1 (646) 555-0119", "New York, NY"),
    summary:
      "Operations executive with 15 years of experience leading multi-site teams of up to 400 people. Turned around two underperforming regions, built supply chains that support 3x growth and consistently delivered margin gains. Calm under pressure, data-led and people-first.",
    experience: [
      { title: "VP of Operations", company: "Crestline Foods", startDate: "2020-02", endDate: "Present", location: "New York, NY", bullets: [
        "Lead 6 distribution centers and 400 staff, growing throughput 3x without new facilities.",
        "Raised gross margin by 4.5 points through supplier consolidation and route optimization.",
        "Cut on-time delivery misses from 11% to 2.5% with a new S&OP process.",
        "Built a leadership bench, promoting 9 site managers from within.",
      ] },
      { title: "Director of Operations", company: "Atlas Home Goods", startDate: "2015-04", endDate: "2020-01", location: "Newark, NJ", bullets: [
        "Turned around the Northeast region from a $3M loss to $5M profit in two years.",
        "Rolled out a WMS to 4 warehouses, improving pick accuracy to 99.7%.",
        "Negotiated freight contracts that saved $2.4M annually.",
      ] },
      { title: "Operations Manager", company: "Keystone Manufacturing", startDate: "2010-06", endDate: "2015-03", location: "Philadelphia, PA", bullets: [
        "Introduced lean practices that reduced scrap by 28%.",
        "Managed a $40M production budget across two shifts.",
        "Achieved zero lost-time incidents for three consecutive years.",
      ] },
    ],
    education: [
      { degree: "MBA, Operations Management", school: "NYU Stern School of Business", startDate: "2012", endDate: "2014", location: "New York, NY" },
      { degree: "B.S. Industrial Engineering", school: "Penn State University", startDate: "2006", endDate: "2010", location: "State College, PA" },
    ],
    skills: [
      { name: "Leadership", skills: ["P&L ownership", "Change management", "Team building", "Board reporting"] },
      { name: "Operations", skills: ["S&OP", "Lean Six Sigma", "WMS rollout", "Vendor negotiation"] },
    ],
    achievements: [
      { title: "$8M regional turnaround", description: "Took a region from a $3M loss to $5M profit.", icon: "trophy" },
      { title: "3x throughput", description: "Scaled distribution without adding facilities.", icon: "zap" },
      { title: "99.7% pick accuracy", description: "Delivered a 4-site WMS rollout on schedule.", icon: "star" },
    ],
    certifications: [
      { name: "Lean Six Sigma Black Belt", issuer: "ASQ" },
      { name: "Certified Supply Chain Professional (CSCP)", issuer: "ASCM" },
    ],
    projects: [
      { name: "Network Redesign", description: "Re-mapped distribution routes to cut miles driven by 19%.", technologies: ["Route optimization", "S&OP"] },
      { name: "Leadership Academy", description: "Internal program that promoted 9 site managers.", technologies: ["Coaching", "Training"] },
    ],
    interests: [
      { title: "Industry mentoring", description: "Advisor to two logistics start-ups." },
      { title: "Sailing", description: "Weekend racing on the Hudson." },
    ],
    languages: [
      { name: "English", level: "Native", proficiency: 100 },
      { name: "German", level: "Conversational", proficiency: 50 },
    ],
  },

  "clean-cyan": {
    fullName: "Nora Lindqvist",
    title: "Senior Product Designer | UX Research | Design Systems",
    contact: contact("nora-lindqvist", "+1 (206) 555-0164", "Seattle, WA"),
    summary:
      "Product designer with 8 years of experience shipping web and mobile products used by millions. Pairs research with fast prototyping and builds design systems that let teams ship consistent UI faster. Strong partner to product and engineering from discovery to launch.",
    experience: [
      { title: "Senior Product Designer", company: "Cascade Travel", startDate: "2021-01", endDate: "Present", location: "Seattle, WA", bullets: [
        "Redesigned the booking flow, lifting mobile conversion by 18% across 4M monthly users.",
        "Built a design system of 120 components, cutting UI build time for engineers by 35%.",
        "Ran 40+ user interviews and usability tests per quarter to guide the roadmap.",
        "Mentored 3 designers and led weekly design critiques.",
      ] },
      { title: "Product Designer", company: "Fernwood Finance", startDate: "2018-03", endDate: "2020-12", location: "Portland, OR", bullets: [
        "Designed a budgeting app onboarding that raised 30-day retention from 22% to 34%.",
        "Introduced accessibility reviews, bringing key screens to WCAG 2.1 AA.",
        "Partnered with data science to design clear spending insights.",
      ] },
      { title: "UX Designer", company: "Pixel & Pine Studio", startDate: "2016-06", endDate: "2018-02", location: "Portland, OR", bullets: [
        "Delivered UX for 15 client websites and apps across retail and health.",
        "Created clickable prototypes that shortened client sign-off by 2 weeks.",
        "Facilitated discovery workshops with founders and stakeholders.",
      ] },
    ],
    education: [
      { degree: "B.F.A. Interaction Design", school: "California College of the Arts", startDate: "2012", endDate: "2016", location: "San Francisco, CA" },
      { degree: "UX Research Certificate", school: "University of Washington", startDate: "2019", endDate: "2019", location: "Seattle, WA" },
    ],
    skills: [
      { name: "Design", skills: ["UX research", "Interaction design", "Prototyping", "Design systems", "Accessibility"] },
      { name: "Tools", skills: ["Figma", "FigJam", "Maze", "Framer", "Adobe CC"] },
    ],
    achievements: [
      { title: "+18% mobile conversion", description: "Booking flow redesign for 4M monthly users.", icon: "trophy" },
      { title: "35% faster UI builds", description: "Design system adopted by 6 product teams.", icon: "zap" },
      { title: "Retention 22% to 34%", description: "Onboarding redesign for a budgeting app.", icon: "star" },
    ],
    certifications: [
      { name: "Google UX Design Certificate", issuer: "Google" },
      { name: "Certified Usability Analyst", issuer: "Human Factors International" },
    ],
    projects: [
      { name: "Wayfinder Design System", description: "Tokens, components and docs used across web and mobile.", technologies: ["Figma", "Storybook"] },
      { name: "Accessible Checkout", description: "Screen-reader friendly checkout tested with real users.", technologies: ["WCAG", "Usability testing"] },
    ],
    interests: [
      { title: "Photography", description: "Street and travel photography." },
      { title: "Design community", description: "Speaker at local UX meetups." },
    ],
    languages: [
      { name: "English", level: "Fluent", proficiency: 95 },
      { name: "Swedish", level: "Native", proficiency: 100 },
    ],
  },

  "engineer-sky": {
    fullName: "Daniel Reyes",
    title: "Senior Full-Stack Engineer | React | Node.js | Cloud",
    contact: contact("daniel-reyes", "+1 (512) 555-0133", "Austin, TX"),
    summary:
      "Full-stack engineer with 7 years of experience building fast, reliable web products in React, Node.js and AWS. Ships features end to end, from database design to polished UI, and cares about tests, performance and clean code reviews.",
    experience: [
      { title: "Senior Full-Stack Engineer", company: "Trailhead Commerce", startDate: "2021-04", endDate: "Present", location: "Austin, TX", bullets: [
        "Led the rebuild of the storefront in Next.js, cutting page load time by 45% and lifting conversion 9%.",
        "Designed a Node.js order service handling 2M requests per day at 99.95% uptime.",
        "Introduced end-to-end tests in CI, reducing production bugs by 38%.",
        "Mentored 4 engineers and ran the team's code review guild.",
      ] },
      { title: "Software Engineer", company: "Bluebonnet Health", startDate: "2018-07", endDate: "2021-03", location: "Austin, TX", bullets: [
        "Built a patient scheduling app in React and GraphQL used by 300 clinics.",
        "Optimized PostgreSQL queries, cutting API response times from 900ms to 120ms.",
        "Moved services to AWS ECS with Terraform, lowering hosting cost 30%.",
      ] },
      { title: "Junior Developer", company: "Lone Star Labs", startDate: "2017-01", endDate: "2018-06", location: "Dallas, TX", bullets: [
        "Shipped 25+ features for client web apps in React and Express.",
        "Wrote unit tests that raised coverage from 40% to 75%.",
        "Automated deployments with GitHub Actions.",
      ] },
    ],
    education: [
      { degree: "B.S. Computer Science", school: "University of Texas at Austin", startDate: "2013", endDate: "2017", location: "Austin, TX" },
      { degree: "Cloud Architecture Specialization", school: "Coursera / AWS", startDate: "2020", endDate: "2020", location: "Online" },
    ],
    skills: [
      { name: "Frontend", skills: ["React", "Next.js", "TypeScript", "Tailwind CSS"] },
      { name: "Backend & Cloud", skills: ["Node.js", "GraphQL", "PostgreSQL", "AWS", "Docker", "Terraform"] },
    ],
    achievements: [
      { title: "45% faster storefront", description: "Next.js rebuild that lifted conversion by 9%.", icon: "zap" },
      { title: "99.95% uptime", description: "Order service at 2M requests per day.", icon: "trophy" },
      { title: "38% fewer bugs", description: "End-to-end testing added to every release.", icon: "star" },
    ],
    certifications: [
      { name: "AWS Certified Developer - Associate", issuer: "Amazon Web Services" },
      { name: "Professional Scrum Developer", issuer: "Scrum.org" },
    ],
    projects: [
      { name: "Open-source form library", description: "Type-safe React form helpers with 1.2K GitHub stars.", technologies: ["React", "TypeScript"] },
      { name: "Realtime inventory dashboard", description: "Live stock levels over WebSockets for 40 warehouses.", technologies: ["Node.js", "Redis"] },
    ],
    interests: [
      { title: "Open source", description: "Maintainer of two small React libraries." },
      { title: "Cycling", description: "Weekend rides around the Hill Country." },
    ],
    languages: [
      { name: "English", level: "Native", proficiency: 100 },
      { name: "Spanish", level: "Fluent", proficiency: 90 },
    ],
  },

  "product-blue": {
    fullName: "Maya Collins",
    title: "Senior Product Manager | Strategy | B2B SaaS",
    contact: contact("maya-collins", "+1 (617) 555-0158", "Boston, MA"),
    summary:
      "Product manager with 8 years of experience leading B2B SaaS products from discovery to scale. Turns customer insight into focused roadmaps, aligns engineering, design and sales, and measures success by revenue and retention. Led products serving 20K+ business customers.",
    experience: [
      { title: "Senior Product Manager", company: "Beacon Analytics", startDate: "2021-02", endDate: "Present", location: "Boston, MA", bullets: [
        "Own the reporting suite used by 20K business customers, growing product revenue 35% in two years.",
        "Launched AI-powered insights that reached 40% weekly adoption within 3 months.",
        "Cut churn by 18% by prioritizing the top 10 customer pain points from 300 interviews.",
        "Lead a squad of 9 engineers and 2 designers using quarterly OKRs.",
      ] },
      { title: "Product Manager", company: "Harborview Software", startDate: "2018-05", endDate: "2021-01", location: "Cambridge, MA", bullets: [
        "Shipped a self-serve billing portal that reduced support tickets by 30%.",
        "Defined pricing tiers that raised average contract value by 22%.",
        "Ran beta programs with 50 customers before each major release.",
      ] },
      { title: "Associate Product Manager", company: "Quill Learning", startDate: "2016-07", endDate: "2018-04", location: "Boston, MA", bullets: [
        "Managed the teacher dashboard backlog for 5K schools.",
        "Introduced product analytics that guided 3 roadmap decisions.",
        "Wrote clear specs and ran sprint reviews with engineering.",
      ] },
    ],
    education: [
      { degree: "MBA, Technology Management", school: "Boston University Questrom", startDate: "2014", endDate: "2016", location: "Boston, MA" },
      { degree: "B.A. Economics", school: "Tufts University", startDate: "2010", endDate: "2014", location: "Medford, MA" },
    ],
    skills: [
      { name: "Product", skills: ["Product strategy", "Roadmapping", "Customer discovery", "Pricing", "OKRs"] },
      { name: "Tools", skills: ["Jira", "Amplitude", "Figma", "SQL", "Productboard"] },
    ],
    achievements: [
      { title: "+35% product revenue", description: "Grew the reporting suite over two years.", icon: "trophy" },
      { title: "18% lower churn", description: "Fixed the top pain points from 300 interviews.", icon: "zap" },
      { title: "40% weekly adoption", description: "AI insights launch in its first quarter.", icon: "star" },
    ],
    certifications: [
      { name: "Certified Scrum Product Owner (CSPO)", issuer: "Scrum Alliance" },
      { name: "Product Analytics Certification", issuer: "Amplitude Academy" },
    ],
    projects: [
      { name: "AI Insights Launch", description: "From prototype to GA in 5 months with 40% adoption.", technologies: ["Discovery", "Beta program"] },
      { name: "Pricing Redesign", description: "New tiers that raised contract value by 22%.", technologies: ["Pricing", "SQL"] },
    ],
    interests: [
      { title: "Product community", description: "Organizer of a monthly product meetup." },
      { title: "Hiking", description: "Working through the New England 4,000-footers." },
    ],
    languages: [
      { name: "English", level: "Native", proficiency: 100 },
      { name: "Portuguese", level: "Intermediate", proficiency: 55 },
    ],
  },

  "steady-form": {
    photoUrl: "/templates/photos/steady-form.webp",
    fullName: "Arjun Desai",
    title: "Project Engineer | Mechanical Systems | Site Execution",
    contact: { ...contact("arjun-desai", "+91 98765 43210", "Pune, India"), nationality: "Indian", dateOfBirth: "15.07.1994" },
    summary:
      "Project engineer with 7 years of experience delivering industrial and infrastructure projects on time and on budget. Skilled in planning, procurement, vendor management and site supervision, with a strong record on safety and quality.",
    experience: [
      { title: "Senior Project Engineer", company: "Meridian Infra Projects", startDate: "2021-01", endDate: "Present", location: "Pune, India", bullets: [
        "Delivered an INR 120 crore plant expansion 3 weeks ahead of schedule.",
        "Managed 25 vendors and contractors, saving 9% on procurement through competitive bidding.",
        "Kept a zero lost-time-incident record across 600K man-hours.",
        "Introduced weekly look-ahead planning that cut rework by 20%.",
      ] },
      { title: "Project Engineer", company: "Sterling Process Systems", startDate: "2018-04", endDate: "2020-12", location: "Mumbai, India", bullets: [
        "Coordinated installation of piping and HVAC systems for 4 pharma clients.",
        "Prepared BOQs and cost estimates for projects worth INR 60 crore.",
        "Led commissioning and handover with full documentation packages.",
      ] },
      { title: "Graduate Engineer Trainee", company: "Apex Engineering Works", startDate: "2017-07", endDate: "2018-03", location: "Ahmedabad, India", bullets: [
        "Supported site supervision and daily progress reporting.",
        "Prepared AutoCAD layouts and material take-offs.",
        "Conducted quality checks on welding and fabrication work.",
      ] },
    ],
    education: [
      { degree: "B.E. Mechanical Engineering", school: "Gujarat Technological University", startDate: "2013", endDate: "2017", location: "Ahmedabad, India" },
      { degree: "Diploma in Project Management", school: "NICMAR", startDate: "2019", endDate: "2020", location: "Pune, India" },
    ],
    skills: [
      { name: "Project delivery", skills: ["Project planning", "Procurement", "Vendor management", "Cost estimation", "Quality assurance", "Site supervision"] },
    ],
    achievements: [
      { title: "3 weeks ahead of schedule", description: "INR 120 crore plant expansion delivered early.", icon: "trophy" },
      { title: "Zero lost-time incidents", description: "Across 600K man-hours on site.", icon: "star" },
      { title: "9% procurement savings", description: "Competitive bidding across 25 vendors.", icon: "zap" },
    ],
    certifications: [
      { name: "Project Management Professional (PMP)", issuer: "PMI" },
      { name: "Primavera P6 Professional", issuer: "Oracle" },
      { name: "Occupational Health and Safety", issuer: "NEBOSH" },
    ],
    projects: [
      { name: "Plant Expansion Phase II", description: "Mechanical scope for a new production block.", technologies: ["Primavera P6", "SAP"] },
      { name: "Clean Room HVAC Upgrade", description: "Pharma HVAC retrofit with zero production downtime.", technologies: ["HVAC", "Commissioning"] },
    ],
    interests: [
      { title: "Sustainability", description: "Energy-efficient plant design." },
      { title: "Cricket", description: "Weekend club league player." },
    ],
    languages: [
      { name: "English", level: "Fluent", proficiency: 90 },
      { name: "Hindi", level: "Native", proficiency: 100 },
      { name: "Gujarati", level: "Native", proficiency: 100 },
    ],
  },

  "saffron-line": {
    photoUrl: "/templates/photos/saffron-line.webp",
    fullName: "Lorenzo Bianchi",
    title: "Head of Operations",
    contact: { ...contact("lorenzo-bianchi", "+39 02 5550 1234", "Milan, Italy"), dateOfBirth: "14 / 03 / 1987", nationality: "Italian" },
    summary:
      "Operations leader with 12 years of experience improving efficiency, quality and customer satisfaction in retail and logistics. Builds high-performing teams, clear processes and reliable reporting that leadership can act on.",
    experience: [
      { title: "Head of Operations", company: "Verde Logistica", startDate: "2020-01", endDate: "Present", location: "Milan, Italy", bullets: [
        "Lead 180 staff across 3 hubs, improving on-time delivery from 88% to 97%.",
        "Cut operating cost per parcel by 15% through automation and shift redesign.",
        "Launched a customer-care playbook that raised NPS from 31 to 52.",
        "Report monthly KPIs to the executive board.",
      ] },
      { title: "Operations Manager", company: "Moda Retail Group", startDate: "2015-03", endDate: "2019-12", location: "Bologna, Italy", bullets: [
        "Managed store operations for 22 locations with EUR 60M annual revenue.",
        "Reduced inventory shrinkage by 30% with new audit routines.",
        "Rolled out a workforce-planning tool to all stores.",
      ] },
      { title: "Operations Analyst", company: "Alba Consulting", startDate: "2012-09", endDate: "2015-02", location: "Turin, Italy", bullets: [
        "Analyzed supply chain data for retail clients and found EUR 1.2M in savings.",
        "Built process maps and SOPs for 5 client projects.",
        "Prepared executive presentations with clear recommendations.",
      ] },
    ],
    education: [
      { degree: "Master in Operations Management", school: "Bocconi University", startDate: "2010", endDate: "2012", location: "Milan, Italy" },
      { degree: "Bachelor in Business Administration", school: "University of Bologna", startDate: "2007", endDate: "2010", location: "Bologna, Italy" },
    ],
    skills: [
      { name: "Skills", skills: ["Operations strategy", "Process improvement", "Team leadership", "KPI reporting", "Budget management", "Vendor negotiation", "Customer experience"] },
      { name: "Tools", skills: ["SAP", "Power BI", "Excel"] },
    ],
    achievements: [
      { title: "97% on-time delivery", description: "Up from 88% across three hubs.", icon: "trophy" },
      { title: "15% lower cost per parcel", description: "Automation and shift redesign.", icon: "zap" },
      { title: "NPS 31 to 52", description: "New customer-care playbook.", icon: "star" },
    ],
    certifications: [
      { name: "Lean Six Sigma Green Belt", issuer: "IASSC" },
      { name: "Certified Operations Manager", issuer: "AIOM" },
    ],
    projects: [
      { name: "Hub Automation", description: "Sorting automation across three hubs.", technologies: ["Automation", "Lean"] },
      { name: "Care Playbook", description: "Customer-care standards and training.", technologies: ["CX", "Training"] },
    ],
    interests: [
      { title: "Cooking", description: "Regional Italian recipes." },
      { title: "Mentoring", description: "Coaching new team leaders." },
    ],
    languages: [
      { name: "Italian", level: "Native", proficiency: 100 },
      { name: "English", level: "Fluent", proficiency: 90 },
      { name: "French", level: "Intermediate", proficiency: 55 },
    ],
  },

  "tech-hex": {
    fullName: "Ethan Parker",
    title: "Software Engineer | Scalable Systems | Healthcare Tech",
    contact: contact("ethan-parker", "+1 (619) 555-0172", "San Diego, CA"),
    summary:
      "Software engineer with 6 years of experience building secure, scalable healthcare software. Designs APIs and data pipelines that handle millions of records, and cares about privacy, testing and clear documentation.",
    experience: [
      { title: "Software Engineer II", company: "HealthBridge Systems", startDate: "2021-06", endDate: "Present", location: "San Diego, CA", bullets: [
        "Built FHIR-based APIs serving 3M patient records with p95 latency under 150ms.",
        "Led migration of a monolith to 8 microservices on Kubernetes, improving deploy frequency 5x.",
        "Implemented HIPAA audit logging and encryption at rest across all services.",
        "Reduced cloud spend 25% by right-sizing clusters and adding autoscaling.",
      ] },
      { title: "Full Stack Developer", company: "Innovate Solutions", startDate: "2019-01", endDate: "2021-05", location: "Los Angeles, CA", bullets: [
        "Developed a telehealth booking app in React and Java Spring used by 150 clinics.",
        "Designed a PostgreSQL schema that cut report generation from minutes to seconds.",
        "Raised test coverage from 45% to 85% with JUnit and Cypress.",
      ] },
      { title: "Backend Developer", company: "Pacific Code Works", startDate: "2017-07", endDate: "2018-12", location: "San Diego, CA", bullets: [
        "Built REST APIs in Python and Django for 10 client projects.",
        "Set up CI pipelines that cut release time from a day to an hour.",
        "Documented services with OpenAPI for partner teams.",
      ] },
    ],
    education: [
      { degree: "B.S. Computer Science", school: "University of California, San Diego", startDate: "2013", endDate: "2017", location: "San Diego, CA" },
      { degree: "M.S. Software Engineering (part-time)", school: "San Diego State University", startDate: "2019", endDate: "2021", location: "San Diego, CA" },
    ],
    skills: [
      { name: "Languages", skills: ["Java", "Python", "TypeScript", "SQL"] },
      { name: "Platforms", skills: ["Spring Boot", "React", "Kubernetes", "AWS", "Kafka", "PostgreSQL"] },
    ],
    achievements: [
      { title: "5x deploy frequency", description: "Monolith to microservices on Kubernetes.", icon: "zap" },
      { title: "3M records at <150ms", description: "FHIR APIs for patient data.", icon: "trophy" },
      { title: "25% lower cloud cost", description: "Right-sizing and autoscaling.", icon: "star" },
    ],
    certifications: [
      { name: "AWS Certified Solutions Architect - Associate", issuer: "Amazon Web Services" },
      { name: "Certified Kubernetes Application Developer (CKAD)", issuer: "CNCF" },
    ],
    projects: [
      { name: "AI Appointment Scheduler", description: "Predicts no-shows and suggests overbooking slots for clinics.", technologies: ["Python", "scikit-learn"] },
      { name: "FHIR Gateway", description: "Unified API layer over 4 EHR systems.", technologies: ["Java", "Kafka"] },
    ],
    interests: [
      { title: "Health data privacy", description: "Writing about secure design in healthcare." },
      { title: "Surfing", description: "Early mornings at La Jolla." },
    ],
    languages: [
      { name: "English", level: "Native", proficiency: 100 },
      { name: "Spanish", level: "Advanced", proficiency: 75 },
    ],
  },

  "strategy-clean": {
    fullName: "Sofia Martínez Ruiz",
    title: "Director of Strategic Planning",
    contact: contact("sofia-martinez-ruiz", "+34 91 555 0123", "Madrid, Spain"),
    summary:
      "Strategy director with 11 years of experience shaping growth plans for retail and technology companies. Leads market analysis, business cases and portfolio decisions, and turns strategy into measurable plans that teams can execute.",
    experience: [
      { title: "Director of Strategic Planning", company: "Grupo Horizonte", startDate: "2020-03", endDate: "Present", location: "Madrid, Spain", bullets: [
        "Lead the 3-year strategic plan for a EUR 900M business, aligning 6 business units.",
        "Identified two adjacent markets that now add EUR 75M in yearly revenue.",
        "Built a KPI framework adopted by the executive committee for quarterly reviews.",
        "Manage a team of 7 strategy and insights analysts.",
      ] },
      { title: "Senior Strategy Manager", company: "Nova Tech Iberia", startDate: "2016-01", endDate: "2020-02", location: "Barcelona, Spain", bullets: [
        "Led due diligence on 4 acquisitions worth EUR 120M combined.",
        "Created pricing strategy that improved gross margin by 3 points.",
        "Ran annual planning across sales, product and finance.",
      ] },
      { title: "Strategy Consultant", company: "Ibérica Consulting Partners", startDate: "2013-09", endDate: "2015-12", location: "Madrid, Spain", bullets: [
        "Delivered market-entry studies for 8 international clients.",
        "Built financial models and business cases for board decisions.",
        "Facilitated executive workshops on growth priorities.",
      ] },
    ],
    education: [
      { degree: "MBA", school: "IE Business School", startDate: "2011", endDate: "2013", location: "Madrid, Spain" },
      { degree: "Bachelor in Economics", school: "Universidad Complutense de Madrid", startDate: "2007", endDate: "2011", location: "Madrid, Spain" },
    ],
    skills: [
      { name: "Strategic planning", skills: ["Builds long-term plans with clear goals and milestones."] },
      { name: "Market analysis", skills: ["Sizes markets and spots growth opportunities early."] },
      { name: "Financial modeling", skills: ["Turns ideas into business cases leaders can approve."] },
      { name: "Stakeholder alignment", skills: ["Gets executives and teams behind one plan."] },
    ],
    achievements: [
      { title: "EUR 75M new revenue", description: "Two adjacent markets identified and launched.", icon: "trophy" },
      { title: "EUR 120M in M&A", description: "Due diligence on four acquisitions.", icon: "star" },
      { title: "+3 pts gross margin", description: "New pricing strategy.", icon: "zap" },
    ],
    certifications: [
      { name: "Certified Strategy Professional", issuer: "Association for Strategic Planning" },
      { name: "Financial Modeling & Valuation Analyst (FMVA)", issuer: "CFI" },
      { name: "Lean Six Sigma Green Belt", issuer: "IASSC" },
    ],
    projects: [
      { name: "Horizonte 2027 Plan", description: "Group-wide strategic plan and KPI framework.", technologies: ["Strategy", "OKRs"] },
      { name: "Market Expansion Study", description: "Entry plan for Portugal and Morocco.", technologies: ["Research", "Modeling"] },
    ],
    interests: [
      { title: "Economics", description: "Reading on behavioral and urban economics." },
      { title: "Tennis", description: "Club competitions on weekends." },
    ],
    languages: [
      { name: "Spanish", level: "Native", proficiency: 100 },
      { name: "English", level: "Fluent", proficiency: 95 },
      { name: "Portuguese", level: "Intermediate", proficiency: 55 },
    ],
  },

  "precision-line": {
    fullName: "Emily Carter",
    title: "Head of Customer Service",
    contact: contact("emily-carter", "+61 2 5550 1987", "Sydney, Australia"),
    summary:
      "Customer service leader with 10 years of experience building support teams that customers love. Raises satisfaction while lowering cost through better hiring, coaching, tooling and self-service. Led teams of up to 60 across phone, chat and email.",
    experience: [
      { title: "Head of Customer Service", company: "Southern Cross Telecom", startDate: "2020-07", endDate: "Present", location: "Sydney, Australia", bullets: [
        "Lead a 60-person support team handling 45K contacts per month across 3 channels.",
        "Raised CSAT from 78% to 92% and cut average handle time by 21%.",
        "Launched a help center that deflects 30% of tickets, saving AUD 600K a year.",
        "Introduced QA scorecards and weekly coaching for every agent.",
      ] },
      { title: "Customer Support Manager", company: "Harbour Bank", startDate: "2016-02", endDate: "2020-06", location: "Sydney, Australia", bullets: [
        "Managed 25 agents and improved first-contact resolution from 64% to 81%.",
        "Rolled out Zendesk and workforce management tools across the team.",
        "Reduced complaint escalations by 40% with a new triage process.",
      ] },
      { title: "Team Leader, Customer Care", company: "Coastal Retail", startDate: "2013-05", endDate: "2016-01", location: "Melbourne, Australia", bullets: [
        "Led 12 agents and kept service levels above 90% in peak seasons.",
        "Trained 50+ new hires on products and service standards.",
        "Built weekly reports on volume, CSAT and staffing.",
      ] },
    ],
    education: [
      { degree: "Graduate Certificate in Leadership", school: "Macquarie University", startDate: "2018", endDate: "2019", location: "Sydney, Australia" },
      { degree: "Bachelor of Business, Management", school: "University of Technology Sydney", startDate: "2009", endDate: "2012", location: "Sydney, Australia" },
    ],
    skills: [
      { name: "Leadership", skills: ["Team building", "Coaching", "Workforce planning", "Quality assurance"] },
      { name: "Service", skills: ["CSAT & NPS", "Omnichannel support", "Knowledge base", "Escalation handling"] },
      { name: "Tools", skills: ["Zendesk", "Salesforce Service Cloud", "Genesys", "Power BI"] },
    ],
    achievements: [
      { title: "CSAT 78% to 92%", description: "Better coaching, QA and tooling.", icon: "trophy" },
      { title: "AUD 600K saved yearly", description: "Help center deflecting 30% of tickets.", icon: "zap" },
      { title: "FCR up to 81%", description: "New triage and knowledge base.", icon: "star" },
    ],
    certifications: [
      { name: "Certified Customer Experience Professional (CCXP)", issuer: "CXPA" },
      { name: "ITIL 4 Foundation", issuer: "AXELOS" },
    ],
    projects: [
      { name: "Help Center Launch", description: "Self-service hub with 400 articles.", technologies: ["Zendesk Guide"] },
      { name: "QA Program", description: "Scorecards and coaching for every agent.", technologies: ["Coaching", "QA"] },
    ],
    interests: [
      { title: "Volunteering", description: "Helpline volunteer on weekends." },
      { title: "Ocean swimming", description: "Bondi to Bronte swim regular." },
    ],
    languages: [
      { name: "English", level: "Native", proficiency: 100 },
      { name: "Italian", level: "Conversational", proficiency: 50 },
    ],
  },

  "emerald-numbered": {
    fullName: "Marcus Miller",
    title: "DevOps Engineer | AWS | Kubernetes | CI/CD",
    contact: contact("marcus-miller", "+1 (303) 555-0126", "Denver, CO"),
    summary:
      "DevOps engineer with 6 years of experience automating cloud infrastructure and delivery pipelines on AWS. Builds reliable Kubernetes platforms, infrastructure as code and observability that let developers ship faster with fewer incidents.",
    experience: [
      { title: "Senior DevOps Engineer", company: "Summit Cloud Labs", startDate: "2021-08", endDate: "Present", location: "Denver, CO", bullets: [
        "Run EKS clusters for 40+ microservices with 99.98% uptime over the last 12 months.",
        "Rebuilt CI/CD in GitHub Actions and Argo CD, cutting deploy time from 45 to 8 minutes.",
        "Codified all AWS infrastructure in Terraform modules, removing manual changes entirely.",
        "Lowered AWS spend by 32% with spot instances, autoscaling and rightsizing.",
      ] },
      { title: "DevOps Engineer", company: "Rocky Mountain Fintech", startDate: "2019-03", endDate: "2021-07", location: "Boulder, CO", bullets: [
        "Containerized 25 legacy services with Docker and moved them to Kubernetes.",
        "Set up Prometheus, Grafana and Loki, reducing mean time to recovery by 60%.",
        "Automated security scans in pipelines, closing 90% of critical findings before release.",
      ] },
      { title: "Systems Engineer", company: "Frontrange IT Services", startDate: "2017-06", endDate: "2019-02", location: "Denver, CO", bullets: [
        "Managed 200+ Linux servers and automated patching with Ansible.",
        "Wrote Bash and Python scripts that saved 15 hours of manual work each week.",
        "Supported on-call rotation and wrote clear incident runbooks.",
      ] },
    ],
    education: [
      { degree: "B.S. Computer Information Systems", school: "Colorado State University", startDate: "2013", endDate: "2017", location: "Fort Collins, CO" },
      { degree: "Cloud Engineering Bootcamp", school: "Turing School of Software", startDate: "2018", endDate: "2018", location: "Denver, CO" },
    ],
    skills: [
      { name: "Cloud & Containers", skills: ["AWS", "EKS", "Docker", "Kubernetes", "Helm"] },
      { name: "Automation & IaC", skills: ["Terraform", "Ansible", "GitHub Actions", "Argo CD", "Jenkins"] },
      { name: "Observability", skills: ["Prometheus", "Grafana", "Loki", "Datadog"] },
      { name: "Languages", skills: ["Bash", "Python", "Go", "YAML"] },
    ],
    achievements: [
      { title: "Deploys 45 to 8 minutes", description: "New GitHub Actions and Argo CD pipeline.", icon: "zap" },
      { title: "99.98% uptime", description: "EKS platform for 40+ microservices.", icon: "trophy" },
      { title: "32% lower AWS bill", description: "Spot, autoscaling and rightsizing.", icon: "star" },
    ],
    certifications: [
      { name: "AWS Certified DevOps Engineer - Professional", issuer: "Amazon Web Services" },
      { name: "Certified Kubernetes Administrator (CKA)", issuer: "CNCF" },
      { name: "HashiCorp Certified: Terraform Associate", issuer: "HashiCorp" },
    ],
    projects: [
      { name: "Internal Developer Platform", description: "Self-service environments in minutes using Backstage, Terraform and Argo CD.", technologies: ["Backstage", "Terraform", "Argo CD"] },
      { name: "Zero-downtime Database Migration", description: "Moved 2TB PostgreSQL to Aurora with no customer impact.", technologies: ["AWS DMS", "Aurora"] },
    ],
    interests: [
      { title: "Homelab", description: "Running a small k3s cluster at home." },
      { title: "Mountain biking", description: "Trails around the Front Range." },
    ],
    languages: [
      { name: "English", level: "Native", proficiency: 100 },
      { name: "Spanish", level: "Intermediate", proficiency: 55 },
    ],
  },
};

/** Replace the generic starter text with a template's role-specific sample (ids stay stable). */
export function applyTemplateSample(content: ResumeContent, sample: TemplateSample): ResumeContent {
  const sections = content.sections.map((section): ResumeSection => {
    switch (section.type) {
      case "header":
        return {
          ...section,
          fullName: sample.fullName,
          title: sample.title,
          ...(sample.photoUrl ? { photoUrl: sample.photoUrl } : {}),
          contact: Object.fromEntries(
            Object.entries({ ...section.contact, ...sample.contact }).filter(([, v]) => v !== "")
          ),
        };
      case "summary":
        return { ...section, content: sample.summary };
      case "experience":
        return { ...section, items: sample.experience.map((item, i) => ({ id: `exp${i + 1}`, ...item, bullets: [...item.bullets] })) };
      case "education":
        return { ...section, items: sample.education.map((item, i) => ({ id: `ed${i + 1}`, ...item })) };
      case "skills":
        return { ...section, categories: sample.skills.map((cat, i) => ({ id: `sk${i + 1}`, name: cat.name, skills: [...cat.skills] })) };
      case "achievements":
        return { ...section, items: sample.achievements.map((a, i) => ({ id: `ac${i + 1}`, text: a.title, title: a.title, description: a.description, icon: a.icon })) };
      case "certifications":
        return { ...section, items: sample.certifications.map((c, i) => ({ id: `ce${i + 1}`, ...c })) };
      case "projects":
        return { ...section, items: sample.projects.map((p, i) => ({ id: `pr${i + 1}`, ...p, technologies: [...p.technologies] })) };
      case "interests":
        return { ...section, items: sample.interests.map((it, i) => ({ id: `in${i + 1}`, ...it })) };
      case "languages":
        return { ...section, items: sample.languages.map((l, i) => ({ id: `ln${i + 1}`, ...l })) };
      default:
        return section;
    }
  });
  return { ...content, sections };
}
