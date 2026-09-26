export type UserRole = "SUPER_ADMIN" | "COMPANY_ADMIN" | "MANAGER" | "EMPLOYEE";

export type AttendanceStatus =
  | "PRESENT"
  | "ABSENT"
  | "LATE"
  | "HALF_DAY"
  | "ON_LEAVE"
  | "HOLIDAY"
  | "WEEK_OFF"
  | "WORK_FROM_HOME";

export type RequestStatus = "PENDING" | "APPROVED" | "REJECTED";

export type SubscriptionPlan = "FREE_TRIAL" | "STARTER" | "PROFESSIONAL" | "ENTERPRISE";

export interface WorkspaceFeatures {
  maxEmployees?: number;
  maxBranches?: number;
  hasPayroll?: boolean;
  hasApiAccess?: boolean;
  hasGeofence?: boolean;
  hasShiftPlanner?: boolean;
}

export interface WorkspaceEntitlement {
  state: string;
  allowApp: boolean;
  code?: string | null;
  message?: string | null;
  daysRemaining?: number | null;
  expiresAt?: string | Date | null;
}

export interface Organization {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  taxId?: string;
  subscriptionPlan?: SubscriptionPlan;
  subscriptionStatus?: string;
  subscriptionExpiresAt?: string | Date | null;
  trialEndsAt?: string | Date | null;
  maxEmployees?: number;
  planLocked?: boolean;
  unlockCode?: string;
  createdAt?: string | Date;
  branches?: Branch[];
  departments?: Department[];
}

export interface Branch {
  id: string;
  organizationId: string;
  name: string;
  address?: string;
  latitude: number | string;
  longitude: number | string;
  radiusMeters: number;
}

export interface Department {
  id: string;
  organizationId: string;
  name: string;
  managerId?: string;
  manager?: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

export interface Shift {
  id: string;
  organizationId: string;
  name: string;
  startTime: string;
  endTime: string;
  graceMinutes: number;
  workingDays: string;
}

export interface Employee {
  id: string;
  organizationId: string;
  userId?: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  phone?: string;
  avatarUrl?: string;
  status: "ACTIVE" | "INACTIVE" | "TERMINATED" | "PROBATION" | "NOTICE_PERIOD";
  branchId?: string;
  departmentId?: string;
  shiftId?: string;
  ctc?: number;
  panNumber?: string;
  uanNumber?: string;
  esiNumber?: string;
  bankName?: string;
  bankAccountNumber?: string;
  bankIfsc?: string;
  branch?: Branch;
  department?: Department;
  shift?: Shift;
  user?: {
    id: string;
    email: string;
    role: UserRole;
    avatarUrl?: string;
  };
  createdAt?: string;
}

export interface User {
  id: string;
  email: string;
  role: UserRole;
  organizationId: string;
  organization?: Organization;
  employee?: Employee;
  avatarUrl?: string;
  planLocked?: boolean;
  mustChangePassword?: boolean;
  entitlement?: WorkspaceEntitlement;
  features?: WorkspaceFeatures;
}

export interface BreakRecord {
  id?: string;
  start: string;
  end?: string | null;
  durationMinutes?: number;
}

export interface Attendance {
  id: string;
  organizationId: string;
  employeeId: string;
  date: string;
  checkIn?: string;
  checkOut?: string;
  status: AttendanceStatus;
  workHours?: number;
  workMinutes?: number;
  overtimeHours?: number;
  lateMinutes?: number;
  isWorkFromHome?: boolean;
  wfhNote?: string;
  totalBreakMinutes?: number;
  breaks?: BreakRecord[];
  checkInLatitude?: number;
  checkInLongitude?: number;
  checkOutLatitude?: number;
  checkOutLongitude?: number;
  checkInLocation?: string | null;
  checkOutLocation?: string | null;
  employee?: Employee;
  branch?: Branch;
}

export interface AttendanceTodayStatus {
  hasCheckedIn: boolean;
  hasCheckedOut: boolean;
  isOnBreak: boolean;
  isWorkFromHome: boolean;
  attendance?: Attendance;
  currentBreak?: BreakRecord;
  shift?: Shift;
  totalBreakMinutes?: number;
  workedMinutesToday?: number;
}

export interface AttendanceCorrection {
  id: string;
  attendanceId: string;
  employeeId: string;
  requestedCheckIn?: string;
  requestedCheckOut?: string;
  reason: string;
  status: RequestStatus;
  reviewNote?: string;
  createdAt: string;
  employee?: Employee;
  attendance?: Attendance;
}

export interface LeaveType {
  id: string;
  name: string;
  code: string;
  daysAllowed: number;
}

export interface LeaveBalance {
  id: string;
  employeeId: string;
  leaveTypeId: string;
  totalDays: number;
  usedDays: number;
  remainingDays: number;
  leaveType?: LeaveType;
}

export interface LeaveRequest {
  id: string;
  employeeId: string;
  leaveTypeId: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  isHalfDay?: boolean;
  reason: string;
  status: RequestStatus;
  reviewNote?: string;
  createdAt: string;
  employee?: Employee;
  leaveType?: LeaveType;
}

export interface CompOffBalance {
  id: string;
  employeeId: string;
  balanceDays: number;
  earnedDate?: string;
  expiryDate?: string;
}

export interface CompOffRedemption {
  id: string;
  employeeId: string;
  requestedDate: string;
  days: number;
  reason?: string;
  status: RequestStatus;
  createdAt: string;
  employee?: Employee;
}

export interface OvertimeRequest {
  id: string;
  employeeId: string;
  attendanceId?: string;
  date: string;
  hours: number;
  reason?: string;
  status: RequestStatus;
  reviewNote?: string;
  createdAt: string;
  employee?: Employee;
}

export interface SalaryStructure {
  id: string;
  employeeId: string;
  basicSalary: number;
  hra: number;
  conveyance: number;
  medicalAllowance: number;
  specialAllowance: number;
  pfDeduction: number;
  esiDeduction: number;
  taxDeduction: number;
  grossSalary: number;
  netSalary: number;
}

export interface Payslip {
  id: string;
  payrollBatchId?: string;
  employeeId: string;
  month: number;
  year: number;
  basicSalary: number;
  hra: number;
  allowances: number;
  grossSalary: number;
  totalDeductions: number;
  lopDeduction: number;
  overtimePay: number;
  netSalary: number;
  status: "DRAFT" | "GENERATED" | "APPROVED" | "PAID" | "DISBURSED";
  paidAt?: string;
  createdAt: string;
  employee?: Employee;
}

export interface PayrollBatch {
  id: string;
  month: number;
  year: number;
  totalEmployees: number;
  totalNetPayout: number;
  status: "DRAFT" | "PROCESSED" | "APPROVED" | "DISBURSED";
  payslips?: Payslip[];
  createdAt: string;
}

export interface ExpenseClaim {
  id: string;
  employeeId: string;
  category: "TRAVEL" | "CLIENT_ENTERTAINMENT" | "FUEL" | "INTERNET" | "LEARNING" | "OTHER" | "FOOD" | "ACCOMMODATION" | "SUPPLIES" | "UTILITIES" | "MISCELLANEOUS" | string;
  amount: number;
  currency?: string;
  title?: string;
  receiptUrl?: string;
  description?: string;
  status: "PENDING" | "SUBMITTED" | "UNDER_REVIEW" | "APPROVED" | "REJECTED" | "PAID";
  reviewedBy?: string;
  reviewNote?: string;
  createdAt: string;
  employee?: Employee;
}

export interface OnboardingCandidate {
  id: string;
  organizationId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  departmentId?: string;
  branchId?: string;
  designation: string;
  offeredSalary: number;
  joiningDate?: string;
  status:
    | "INVITED"
    | "PROFILE_SUBMITTED"
    | "UNDER_HR_REVIEW"
    | "HR_VERIFIED"
    | "ADMIN_APPROVED"
    | "OFFER_GENERATED"
    | "OFFER_SENT"
    | "OFFER_ACCEPTED"
    | "OFFER_REJECTED"
    | "ACTIVATED"
    | "REJECTED"
    | "APPLIED"
    | "INTERVIEWING"
    | "OFFERED"
    | "ACCEPTED"
    | "ONBOARDED";
  token?: string;
  portalToken?: string;
  proposedSalary?: number;
  expectedJoinDate?: string;
  offerLetterUrl?: string;
  offerExpiresAt?: string;
  documents?: CandidateDocument[];
  department?: Department;
  branch?: Branch;
  createdAt: string;
}

export interface CandidateDocument {
  id: string;
  candidateId: string;
  documentType: "AADHAAR" | "PAN" | "DEGREE_CERTIFICATE" | "RELIEVING_LETTER" | "OTHER";
  fileUrl: string;
  status: "PENDING" | "VERIFIED" | "REJECTED";
  verifiedAt?: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  [key: string]: any;
}

export type EmployeeDocumentType =
  | "AADHAAR"
  | "PAN"
  | "PASSPORT"
  | "DRIVING_LICENCE"
  | "EDUCATION_CERTIFICATE"
  | "EXPERIENCE_LETTER"
  | "OFFER_LETTER"
  | "EMPLOYMENT_CONTRACT"
  | "BANK_DOCUMENT"
  | "OTHER";

export type DocumentVerificationStatus = "PENDING" | "VERIFIED" | "REJECTED";

export interface EmployeeDocument {
  id: string;
  organizationId: string;
  employeeId: string;
  documentType: EmployeeDocumentType;
  title?: string | null;
  fileName: string;
  fileUrl: string;
  fileSize?: number | null;
  mimeType?: string | null;
  status: DocumentVerificationStatus;
  rejectionReason?: string | null;
  verifiedBy?: string | null;
  verifiedAt?: string | null;
  expiryDate?: string | null;
  expiryReminderSent: boolean;
  isExpired?: boolean;
  isExpiringSoon?: boolean;
  daysUntilExpiry?: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface EmployeeDocumentChecklistItem {
  type: EmployeeDocumentType;
  label: string;
  description: string;
  isMandatory: boolean;
  hasExpiry: boolean;
  isUploaded: boolean;
  isVerified: boolean;
  status: "VERIFIED" | "PENDING" | "REJECTED" | "UPLOADED" | "MISSING";
  uploadedCount: number;
  latestDocument?: EmployeeDocument | null;
}

export interface EmployeeDocumentsData {
  employee: {
    id: string;
    employeeCode: string;
    firstName: string;
    lastName?: string | null;
    name: string;
    email?: string | null;
    department?: string;
    branch?: string;
  };
  summary: {
    totalDocuments: number;
    verifiedCount: number;
    pendingCount: number;
    rejectedCount: number;
    expiredCount: number;
    expiringSoonCount: number;
    completionPercentage: number;
    totalMandatory: number;
    uploadedMandatory: number;
    verifiedMandatory: number;
  };
  checklist: EmployeeDocumentChecklistItem[];
  documents: EmployeeDocument[];
}

// ─── Offboarding & Full & Final (F&F) Types ──────────────────────────────────
export type ExitType = "RESIGNATION" | "TERMINATION" | "RETIREMENT" | "MUTUAL_SEPARATION";

export type ExitStatus =
  | "RESIGNED"
  | "UNDER_HR_REVIEW"
  | "NOTICE_PERIOD"
  | "CLEARANCE_IN_PROGRESS"
  | "SETTLEMENT_CALCULATED"
  | "SETTLED"
  | "TERMINATED"
  | "REJECTED"
  | "WITHDRAWN";

export type ClearanceDept =
  | "IT_ASSETS"
  | "REPORTING_MANAGER"
  | "FINANCE_PAYROLL"
  | "HR_OPERATIONS"
  | "ADMIN_FACILITY";

export type ClearanceItemStatus = "PENDING" | "CLEARED" | "RECOVERABLE_DUE" | "WAIVED";

export interface EmployeeClearance {
  id: string;
  organizationId: string;
  exitId: string;
  department: ClearanceDept;
  itemName: string;
  itemDescription?: string | null;
  status: ClearanceItemStatus;
  recoveryAmount: number;
  clearedBy?: string | null;
  clearedAt?: string | null;
  remarks?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ExitInterview {
  id: string;
  organizationId: string;
  exitId: string;
  reasonCategory?: string | null;
  feedbackRatings?: {
    managementRating?: number;
    cultureRating?: number;
    payRating?: number;
    workLifeRating?: number;
    [key: string]: any;
  } | null;
  whatWeDidWell?: string | null;
  whatCanWeImprove?: string | null;
  wouldRecommendCompany: boolean;
  conductedBy?: string | null;
  conductedAt?: string | null;
  notes?: string | null;
}

export interface FinalSettlement {
  id: string;
  organizationId: string;
  exitId: string;
  employeeId: string;
  workedDaysInFinalMonth: number;
  finalSalaryPayable: number;
  overtimePay: number;
  leaveEncashmentDays: number;
  leaveEncashmentAmount: number;
  pendingReimbursements: number;
  gratuityOrBonus: number;
  otherEarnings: number;
  lopDays: number;
  lopDeduction: number;
  noticeShortfallDays: number;
  noticeShortfallDeduction: number;
  assetRecoveryAmount: number;
  loanOrAdvanceRecovery: number;
  statutoryDeductions: number;
  otherDeductions: number;
  grossEarnings: number;
  totalDeductions: number;
  netPayable: number;
  status: "DRAFT" | "APPROVED" | "DISBURSED";
  approvedBy?: string | null;
  approvedAt?: string | null;
  disbursedAt?: string | null;
  paymentReference?: string | null;
  remarks?: string | null;
}

export interface EmployeeExit {
  id: string;
  organizationId: string;
  employeeId: string;
  exitType: ExitType;
  status: ExitStatus;
  resignationDate: string;
  preferredLastWorkingDate?: string | null;
  approvedLastWorkingDate?: string | null;
  noticePeriodDays: number;
  isNoticeWaived: boolean;
  waivedNoticeDays: number;
  reason: string;
  employeeComments?: string | null;
  hrNotes?: string | null;
  hrReviewerId?: string | null;
  hrReviewedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  employee: Employee;
  clearances?: EmployeeClearance[];
  interview?: ExitInterview | null;
  finalSettlement?: FinalSettlement | null;
  metrics?: {
    totalClearances: number;
    clearedCount: number;
    pendingClearances: number;
    clearanceProgress: number;
    hasSettlement: boolean;
    settlementStatus: string;
    netSettlementPayable?: number | null;
    allClearancesApproved?: boolean;
  };
  clearancesByDept?: Record<string, EmployeeClearance[]>;
}

// ─── Asset Management Types ──────────────────────────────────────────────────
export type AssetCategory =
  | "LAPTOP"
  | "DESKTOP"
  | "MONITOR"
  | "MOBILE_PHONE"
  | "TABLET"
  | "HEADPHONES_PERIPHERALS"
  | "SECURITY_TOKEN_KEY"
  | "OFFICE_FURNITURE"
  | "VEHICLE"
  | "OTHER";

export type AssetStatus =
  | "AVAILABLE"
  | "ASSIGNED"
  | "UNDER_MAINTENANCE"
  | "DAMAGED"
  | "RETIRED"
  | "LOST";

export type AssetCondition = "NEW" | "EXCELLENT" | "GOOD" | "FAIR" | "DAMAGED";

export type AssetAssignmentType = "ASSIGNMENT" | "RETURN" | "TRANSFER";

export interface AssetAssignment {
  id: string;
  organizationId: string;
  assetId: string;
  type: AssetAssignmentType;
  employeeId?: string | null;
  fromEmployeeId?: string | null;
  assignedDate: string;
  returnedDate?: string | null;
  conditionOnAssign: AssetCondition;
  conditionOnReturn?: AssetCondition | null;
  assignedBy?: string | null;
  returnedTo?: string | null;
  recoveryCharge?: number | null;
  remarks?: string | null;
  createdAt: string;
  employee?: {
    id: string;
    employeeCode: string;
    firstName: string;
    lastName?: string | null;
    department?: { name: string } | null;
  } | null;
  asset?: {
    id: string;
    assetCode: string;
    name: string;
    category: AssetCategory;
    brand?: string | null;
    modelNumber?: string | null;
    serialNumber?: string | null;
  } | null;
}

export interface AssetMaintenance {
  id: string;
  organizationId: string;
  assetId: string;
  issueDescription: string;
  vendorName?: string | null;
  cost?: number | null;
  startDate: string;
  completedDate?: string | null;
  status: "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Asset {
  id: string;
  organizationId: string;
  assetCode: string;
  name: string;
  category: AssetCategory;
  brand?: string | null;
  modelNumber?: string | null;
  serialNumber?: string | null;
  purchaseDate?: string | null;
  purchaseCost?: number | null;
  warrantyExpiry?: string | null;
  status: AssetStatus;
  condition: AssetCondition;
  specifications?: Record<string, any> | null;
  assignedToId?: string | null;
  assignedDate?: string | null;
  assignedCondition?: AssetCondition | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  assignedTo?: {
    id: string;
    employeeCode: string;
    firstName: string;
    lastName?: string | null;
    phone?: string | null;
    department?: { name: string } | null;
    user?: { email: string } | null;
  } | null;
  assignments?: AssetAssignment[];
  maintenances?: AssetMaintenance[];
  _count?: {
    assignments: number;
    maintenances: number;
  };
}

export interface AssetMetrics {
  totalAssets: number;
  assignedCount: number;
  availableCount: number;
  underMaintenanceCount: number;
  damagedCount: number;
  retiredCount: number;
  totalAssetValue: number;
}



