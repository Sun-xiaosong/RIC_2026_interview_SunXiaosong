// 全部领域类型定义,与后端 API 的 JSON 字段(camelCase)一一对应。

export type GradeKey =
  | 'a_plus' | 'a' | 'a_minus'
  | 'b_plus' | 'b' | 'b_minus'
  | 'c_plus' | 'c' | 'c_minus'
  | 'd_plus' | 'd' | 'd_minus'
  | 'pass' | 'fail';

export type FeatureKey =
  | 'tutorial' | 'essay' | 'final'
  | 'presentation' | 'project' | 'attendance';

export interface CourseSummary {
  code: string;
  title: string;
  offerDept: string | null;
  reviewedCount: number;
  likedCount: number;
  dislikedCount: number;
}

export interface Vote {
  yes: number;
  no: number;
}

export interface Slot {
  day: number;
  venue: string;
  startTime: string;
  endTime: string;
  startDate: string;
  endDate: string;
  isTutorial: boolean;
}

export interface Subclass {
  id: number;
  semester: string | null;
  section: string | null;
  instructor: string | null;
  slots: Slot[];
  isActive: boolean;
}

export interface Review {
  id: number;
  yearTaken: string | null;
  semTaken: string | null;
  instructor: string | null;
  content: string;
  likedCount: number;
  dislikedCount: number;
  userId: number;
  courseCode: string;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface CourseDetail extends CourseSummary {
  requirement: string | null;
  description: string | null;
  gradeDistribution: Record<GradeKey, number>;
  featureVotes: Record<FeatureKey, Vote>;
  subclasses: Subclass[];
}

export interface CoursesResponse {
  courses: CourseSummary[];
}

export interface CourseDetailResponse {
  course: CourseDetail;
}

export interface ReviewsResponse {
  reviews: Review[];
  total: number;
  page: number;
  pageSize: number;
}

export interface Department {
  name: string;
  courseCount: number;
}

export interface DepartmentsResponse {
  departments: Department[];
}

export type ReviewSort = 'latest' | 'hot';
