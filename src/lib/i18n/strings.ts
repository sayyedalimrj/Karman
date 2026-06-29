/**
 * Centralized Persian (fa) UI strings. Components reference keys via the i18n
 * module rather than embedding literals, so future locales can be added without
 * editing components.
 *
 * Requirements: 1.2
 */
export const fa = {
  app: {
    name: "کارمان",
    tagline: "سامانه مدیریت مالی و گردش‌کار پروژه‌های عمرانی",
  },
  nav: {
    dashboard: "داشبورد",
    inbox: "کارتابل",
    projects: "پروژه‌ها",
    projectSetup: "تعریف پروژه",
    logout: "خروج",
    workspace: "فضای کاری",
    administration: "مدیریت سامانه",
    userManagement: "مدیریت کاربران",
    auditLog: "گزارش رخدادها",
    comingSoon: "به‌زودی",
  },
  auth: {
    loginTitle: "ورود به کارمان",
    loginSubtitle: "سامانه مدیریت مالی و گردش‌کار پروژه‌های عمرانی",
    email: "رایانامه",
    emailPlaceholder: "name@example.com",
    password: "گذرواژه",
    submit: "ورود",
    submitting: "در حال ورود…",
    invalidCredentials: "نام کاربری یا گذرواژه نادرست است.",
    genericError: "ورود ناموفق بود. لطفاً دوباره تلاش کنید.",
  },
  states: {
    emptyTitle: "موردی برای نمایش وجود ندارد",
    emptyDescription: "هنوز داده‌ای ثبت نشده است.",
    errorTitle: "خطایی رخ داد",
    errorDescription: "در دریافت اطلاعات مشکلی پیش آمد. لطفاً دوباره تلاش کنید.",
    loading: "در حال بارگذاری…",
    notFound: "موردی یافت نشد.",
    forbidden: "دسترسی مجاز نیست.",
  },
  dashboard: {
    title: "داشبورد",
    subtitle: "نمای کلی پروژه‌ها و کارهای جاری شما",
    noProjects: "هنوز پروژه‌ای ثبت نشده است.",
    noProjectsDescription:
      "با تعریف نخستین پروژه، اطلاعات و گردش‌کار آن در این بخش نمایش داده می‌شود.",
    createProject: "تعریف پروژه جدید",
    statProjects: "پروژه‌ها",
    statActiveCases: "کارهای جاری",
    statLockedCases: "اسناد قفل‌شده",
    projectsTitle: "پروژه‌های شما",
    statusLabel: "وضعیت",
  },
  inbox: {
    title: "کارتابل",
    subtitle: "کارهای در جریان مربوط به پروژه‌های شما",
    empty: "کارتابل شما خالی است.",
    emptyDescription: "در حال حاضر کار در انتظاری برای شما وجود ندارد.",
    caseTitle: "عنوان",
    caseState: "وضعیت",
    caseProject: "پروژه",
  },
  projectSetup: {
    title: "تعریف پروژه",
    subtitle: "ایجاد پروژه جدید و پیکربندی اولیه آن",
    placeholderTitle: "تعریف پروژه به‌زودی فعال می‌شود",
    placeholderDescription:
      "این بخش برای ایجاد پروژه و پیکربندی اعضا و قراردادها در نسخه‌های بعدی تکمیل می‌شود.",
    forbiddenTitle: "دسترسی به تعریف پروژه ندارید",
    forbiddenDescription:
      "برای ایجاد پروژه باید نقش مدیر پروژه یا مدیر سامانه داشته باشید.",
  },
  common: {
    loading: "در حال بارگذاری…",
    save: "ذخیره",
    cancel: "انصراف",
    retry: "تلاش مجدد",
    signedInAs: "کاربر واردشده",
  },
  projectStatus: {
    DRAFT: "پیش‌نویس",
    ACTIVE: "فعال",
    ARCHIVED: "بایگانی‌شده",
  },
} as const;

export type Messages = typeof fa;
