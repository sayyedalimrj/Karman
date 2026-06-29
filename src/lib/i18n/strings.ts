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
    projectSetup: "تنظیمات پروژه",
    logout: "خروج",
  },
  auth: {
    loginTitle: "ورود به کارمان",
    email: "رایانامه",
    password: "گذرواژه",
    submit: "ورود",
    invalidCredentials: "نام کاربری یا گذرواژه نادرست است.",
  },
  states: {
    emptyTitle: "موردی برای نمایش وجود ندارد",
    emptyDescription: "هنوز داده‌ای ثبت نشده است.",
    errorTitle: "خطایی رخ داد",
    notFound: "موردی یافت نشد.",
    forbidden: "دسترسی مجاز نیست.",
  },
  common: {
    loading: "در حال بارگذاری…",
    save: "ذخیره",
    cancel: "انصراف",
  },
} as const;

export type Messages = typeof fa;
