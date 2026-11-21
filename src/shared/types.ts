export type SectionType =
  | "header"
  | "summary"
  | "experience"
  | "skills"
  | "projects"
  | "achievements"
  | "certifications"
  | "education"
  | "languages"
  | "strengths"
  | "volunteering"
  | "interests"
  | "awards"
  | "references"
  | "custom"
  | "philosophy"
  | "online"
  | "industryExpertise"
  | "myTime";

export type ColumnLayout = "single" | "wide-left" | "equal" | "wide-right";

export type LayoutKey =
  | "high-performer"
  | "single-column"
  | "stylish"
  | "timeline"
  | "creative"
  | "classic"
  | "compact"
  | "elegant"
  | "ivy-league"
  | "crest"
  | "contemporary"
  | "polished";

export interface ContactInfo {
  phone?: string;
  email?: string;
  linkedin?: string;
  location?: string;
  website?: string;
  github?: string;
  extraLink?: string;
  extraField?: string;
  dateOfBirth?: string;
  nationality?: string;
  /** Hyperlink target for visible link label */
  linkedinHref?: string;
  extraLinkHref?: string;
}

/** Header field visibility / photo options (gear menu) */
export interface HeaderSettings {
  title: boolean;
  phone: boolean;
  link: boolean;
  email: boolean;
  location: boolean;
  extraLink: boolean;
  extraField: boolean;
  dateOfBirth: boolean;
  nationality: boolean;
  uppercaseName: boolean;
  photo: boolean;
  photoStyle: "circle" | "rounded" | "square" | "portrait" | "rounded-portrait";
  photoAccent: string;
}

export interface HeaderSection {
  type: "header";
  id: string;
  fullName: string;
  title: string;
  contact: ContactInfo;
  /** Compressed data-URL or remote URL */
  photoUrl?: string;
  settings?: Partial<HeaderSettings>;
}

export interface SummarySection {
  type: "summary";
  id: string;
  title: string;
  content: string;
}

/** Per-section field visibility (gear settings) */
export interface SectionSettings {
  title?: boolean;
  subtitle?: boolean;
  location?: boolean;
  datePeriod?: boolean;
  bullets?: boolean;
  description?: boolean;
  gpa?: boolean;
  link?: boolean;
  logo?: boolean;
  institution?: boolean;
  groupName?: boolean;
  /** Show achievement / interest icons */
  icons?: boolean;
  /** Find me online: show username under platform */
  username?: boolean;
  /** Section heading in ALL CAPS (section-head gear only) */
  uppercaseTitles?: boolean;
  skillsLayout?: "tags" | "list" | "bullets";
  skillBorder?: boolean;
  /** Languages: visual style for proficiency meter */
  languageSliderStyle?: "bars" | "dots" | "squares" | "line" | "pills";
}

export interface ExperienceProjectRow {
  id: string;
  name: string;
  description: string;
}

export interface ExperienceItem {
  id: string;
  title: string;
  company: string;
  startDate: string;
  endDate: string;
  location: string;
  bullets: string[];
  link?: string;
  description?: string;
  logoUrl?: string;
  projects?: ExperienceProjectRow[];
}

export interface ExperienceSection {
  type: "experience";
  id: string;
  title: string;
  items: ExperienceItem[];
  settings?: SectionSettings;
}

export interface SkillCategory {
  id: string;
  name: string;
  skills: string[];
}

export interface SkillsSection {
  type: "skills";
  id: string;
  title: string;
  categories: SkillCategory[];
  settings?: SectionSettings;
}

export interface ProjectItem {
  id: string;
  name: string;
  description: string;
  technologies?: string[];
  link?: string;
  startDate?: string;
  endDate?: string;
  location?: string;
}

export interface ProjectsSection {
  type: "projects";
  id: string;
  title: string;
  items: ProjectItem[];
  settings?: SectionSettings;
}

export interface AchievementItem {
  id: string;
  text: string;
  title?: string;
  description?: string;
  icon?: string;
}

export interface AchievementsSection {
  type: "achievements";
  id: string;
  title: string;
  items: AchievementItem[];
  settings?: SectionSettings;
}

export interface CertificationItem {
  id: string;
  name: string;
  issuer: string;
  date?: string;
  url?: string;
}

export interface CertificationsSection {
  type: "certifications";
  id: string;
  title: string;
  items: CertificationItem[];
  settings?: SectionSettings;
}

export interface EducationItem {
  id: string;
  degree: string;
  school: string;
  startDate: string;
  endDate: string;
  location: string;
  gpa?: string;
  logoUrl?: string;
  bullets?: string[];
}

export interface EducationSection {
  type: "education";
  id: string;
  title: string;
  items: EducationItem[];
  settings?: SectionSettings;
}

export interface LanguageItem {
  id: string;
  name: string;
  level: string;
  proficiency: number;
}

export interface LanguagesSection {
  type: "languages";
  id: string;
  title: string;
  items: LanguageItem[];
  settings?: SectionSettings;
}

export interface StrengthsSection {
  type: "strengths";
  id: string;
  title: string;
  items: { id: string; text: string; title?: string; description?: string; icon?: string }[];
  settings?: SectionSettings;
}

export interface VolunteeringItem {
  id: string;
  role: string;
  organization: string;
  startDate: string;
  endDate: string;
  location?: string;
  description: string;
}

export interface VolunteeringSection {
  type: "volunteering";
  id: string;
  title: string;
  items: VolunteeringItem[];
  settings?: SectionSettings;
}

export interface InterestsSection {
  type: "interests";
  id: string;
  title: string;
  items: { id: string; title: string; description: string }[];
  settings?: SectionSettings;
}

export interface AwardsSection {
  type: "awards";
  id: string;
  title: string;
  items: { id: string; name: string; issuer: string; date?: string; icon?: string }[];
  settings?: SectionSettings;
}

export interface ReferencesSection {
  type: "references";
  id: string;
  title: string;
  items: { id: string; name: string; email: string; phone: string }[];
}

export interface CustomSection {
  type: "custom";
  id: string;
  title: string;
  items: {
    id: string;
    title: string;
    subtitle?: string;
    date?: string;
    startDate?: string;
    endDate?: string;
    location?: string;
    description: string;
    link?: string;
  }[];
  settings?: SectionSettings;
}

export interface PhilosophySection {
  type: "philosophy";
  id: string;
  title: string;
  quote: string;
  author: string;
}

export interface OnlineSection {
  type: "online";
  id: string;
  title: string;
  items: { id: string; platform: string; username: string; url?: string; icon?: string }[];
  settings?: SectionSettings;
}

export interface IndustryExpertiseSection {
  type: "industryExpertise";
  id: string;
  title: string;
  items: { id: string; name: string; level: number }[];
}

export interface MyTimeSection {
  type: "myTime";
  id: string;
  title: string;
  items: { id: string; label: string; percent: number }[];
}

export type ResumeSection =
  | HeaderSection
  | SummarySection
  | ExperienceSection
  | SkillsSection
  | ProjectsSection
  | AchievementsSection
  | CertificationsSection
  | EducationSection
  | LanguagesSection
  | StrengthsSection
  | VolunteeringSection
  | InterestsSection
  | AwardsSection
  | ReferencesSection
  | CustomSection
  | PhilosophySection
  | OnlineSection
  | IndustryExpertiseSection
  | MyTimeSection;

export interface ResumeDesign {
  accentColor: string;
  /** Dark structural color: name, section titles, underlines (outer ring in color picker) */
  inkColor?: string;
  fontFamily: string;
  fontSize: number;
  lineHeight: number;
  pageMargins: number;
  sectionSpacing: number;
  columnLayout: ColumnLayout;
  background: string;
  showBranding: boolean;
  pageSize: "A4" | "US Letter";
  /** Header chrome: default underline vs solid banner band */
  headerStyle?: "default" | "banner" | "centered";
  /** Photo beside name: left (Ivy/Saffron) or right (default) */
  photoPosition?: "left" | "right";
  /** Job title under name, or italic beside name */
  titlePlacement?: "below" | "beside";
  /** Section titles: accent underline vs icon + accent rule */
  sectionHeadingStyle?: "underline" | "icon-line";
  /** Contact fields: compact wrap row vs multi-column grid */
  contactLayout?: "row" | "grid";
  /** Experience/education: dates beside company vs stacked under title */
  entryLayout?: "side-meta" | "stacked";
}

export interface ResumeContent {
  sections: ResumeSection[];
  /** BUG-1240b: field path -> untouched sample value (see sampleMarks.ts). */
  sampleFields?: Record<string, string>;
  leftColumnIds: string[];
  rightColumnIds: string[];
}

export interface ResumeDocument {
  id: string;
  title: string;
  templateId: string;
  layoutKey: LayoutKey;
  content: ResumeContent;
  design: ResumeDesign;
  isComplete?: boolean;
  updatedAt?: string;
}

export type TrackerStage =
  | "recommended"
  | "shortlist"
  | "auto_apply"
  | "applied"
  | "interview"
  | "offer"
  | "rejected";

export interface TemplateMeta {
  id: string;
  name: string;
  department: string;
  layoutKey: LayoutKey;
  accentColor: string;
  fontFamily: string;
  isPremium: boolean;
  previewLabel: string;
}

export interface ImproveSuggestion {
  id: string;
  category: "spellcheck" | "wording" | "recommendation";
  severity: "error" | "warning" | "info";
  original: string;
  suggestion: string;
  reason: string;
  sectionId?: string;
  itemId?: string;
  /** Path inside the section, e.g. content, items[0].bullets[2] */
  fieldPath?: string;
  /** Human-readable place, e.g. Experience · Al Nafi · bullet 2 */
  locationLabel?: string;
}

export interface AtsResult {
  score: number;
  matchedKeywords: string[];
  missingKeywords: string[];
  suggestions: { area: string; advice: string }[];
  summary: string;
  /** Set when the job description was rejected and must not be treated as a score. */
  rejected?: boolean;
}
