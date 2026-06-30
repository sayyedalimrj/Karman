/**
 * Centralized Persian (fa) UI strings. Components reference keys via the i18n
 * module rather than embedding literals, so future locales can be added without
 * editing components.
 *
 * Phase 1 (Taksa-first operational workbench) extends this catalog with strings
 * for the Taksa-first navigation, the operational workbench dashboard, the
 * reference + Taksa workbench routes, and reference-gated project setup. No
 * official values (شاخص/فهرست‌بها/ضرایب/...) are ever encoded here — only UI copy.
 *
 * Requirements: 1.2
 */
export const fa = {
  app: {
    name: "کارمان",
    tagline: "سامانه مدیریت مالی و گردش‌کار پروژه‌های عمرانی",
  },
  nav: {
    // Section titles
    workspace: "فضای کاری عملیاتی",
    administration: "مدیریت سامانه",
    // Main Taksa-first navigation labels
    workbench: "میز کار",
    inboxReview: "کارتابل رسیدگی",
    taksaIntake: "ورود اطلاعات تکسا",
    taksaOverview: "نمای کلی تکسا",
    taksaImports: "منابع و واردسازی",
    taksaRaw: "داده خام تکسا",
    taksaSources: "منابع کشف‌شده",
    taksaAnalyze: "تحلیل تکسا",
    taksaAnalyzeRuns: "اجراهای تحلیل",
    taksaAnalyzeScriptXml: "نگاشت ScriptXML",
    taksaAnalyzeSql: "تحلیل اسکریپت SQL",
    taksaAnalyzeBackupStrings: "رشته‌های پشتیبان",
    taksaAnalyzeTemplates: "قالب‌های اکسل",
    taksaAnalyzeDocs: "برچسب‌ها و رفتار UI",
    referenceLibrary: "کتابخانه فنی و مرجع",
    referenceOverview: "نمای کلی مرجع",
    referenceSources: "منابع مرجع",
    referenceLibraryItems: "کتابخانه مرجع",
    projectsContracts: "پروژه‌ها و قراردادها",
    projectsOverview: "فهرست پروژه‌ها",
    projectSetup: "تعریف پروژه",
    statements: "صورت‌وضعیت‌ها",
    metering: "متره و ریزمتره",
    indexAdjustment: "شاخص، تعدیل و ضرایب",
    reportsExports: "گزارش‌ها و خروجی تکسا",
    systemAdmin: "مدیریت سامانه",
    userManagement: "مدیریت کاربران",
    auditLog: "گزارش رخدادها",
    // Disabled-reason notes (honest unavailable states)
    comingSoon: "به‌زودی",
    futureLabel: "آینده",
    statementsReason: "پس از تکمیل پروژه و داده مرجع فعال می‌شود.",
    meteringReason: "پس از تکمیل صورت‌وضعیت فعال می‌شود.",
    reportsReason: "پس از تکمیل محاسبات و خروجی‌ها فعال می‌شود.",
    // Back-compat keys
    dashboard: "میز کار",
    inbox: "کارتابل رسیدگی",
    projects: "پروژه‌ها",
    logout: "خروج",
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
    title: "میز کار عملیاتی کارمان",
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
  /**
   * Operational workbench («میز کار عملیاتی کارمان»). Every count rendered under
   * these labels comes from a real Prisma query — never a constant.
   */
  workbench: {
    title: "میز کار عملیاتی کارمان",
    subtitle:
      "نمای واقعی وضعیت داده‌های مرجع، داده خام تکسا، پروژه‌ها و آمادگی بهره‌برداری — همهٔ اعداد از پایگاه‌داده واقعی محاسبه می‌شوند.",
    // S1 — reference data status
    referenceTitle: "وضعیت داده‌های مرجع",
    referenceSource: "منابع مرجع",
    referenceImportRun: "اجراهای ورود داده",
    referenceBook: "کتاب‌های مرجع (فهرست‌بها)",
    referenceChapter: "فصل‌ها",
    referenceItem: "ردیف‌های فهرست‌بها",
    referenceUnit: "واحدها",
    referenceResource: "منابع (مصالح/نیرو/ماشین)",
    referenceIndexPeriod: "دوره‌های شاخص",
    referenceCircular: "بخشنامه‌ها",
    referenceCoefficientRule: "ضرایب",
    referenceDeductionRule: "کسورات",
    referenceMapping: "نگاشت داده خام به مرجع",
    // S2 — raw Taksa status
    taksaTitle: "وضعیت داده خام تکسا",
    taksaArtifact: "آرتیفکت‌های تکسا",
    taksaRawTable: "جدول‌های خام",
    taksaRawRow: "ردیف‌های خام",
    // S3 — projects & contracts
    projectsTitle: "وضعیت پروژه‌ها و قراردادها",
    project: "پروژه‌ها",
    contract: "قراردادها",
    projectParty: "طرف‌های پروژه",
    projectMember: "اعضای پروژه",
    projectsScopeAdmin: "نمایش همهٔ پروژه‌ها (مدیر سامانه)",
    projectsScopeMember: "تنها پروژه‌هایی که عضو آن هستید",
    // S4 — workflow / inbox
    workflowTitle: "وضعیت کارتابل و گردش‌کار",
    workflowTotal: "کل پرونده‌های گردش‌کار",
    workflowLocked: "پرونده‌های قفل‌شده",
    workflowOpen: "پرونده‌های در جریان",
    // S5 — operational readiness
    readinessTitle: "وضعیت آمادگی بهره‌برداری",
    readinessProgress: "درصد آمادگی داده مرجع",
    readinessComplete: "داده‌های مرجع پایه تکمیل است.",
    readinessWarning:
      "برای شروع بهره‌برداری واقعی، ابتدا داده‌های مرجع تکسا، فهرست‌بها، شاخص‌ها، واحدها، منابع و بخشنامه‌های رسمی باید ثبت یا وارد شوند.",
    groupReady: "تکمیل",
    groupMissing: "ناقص",
    groupHasReferenceSource: "منبع مرجع",
    groupHasReferenceBook: "کتاب مرجع/فهرست‌بها",
    groupHasReferenceItem: "ردیف فهرست‌بها",
    groupHasReferenceUnit: "واحدها",
    groupHasReferenceIndexPeriod: "شاخص‌ها",
    groupHasReferenceCircular: "بخشنامه‌ها",
    groupHasReferenceMapping: "نگاشت داده",
  },
  /** Reference workbench routes (/reference, /reference/sources, /reference/library). */
  reference: {
    title: "کتابخانه فنی و مرجع",
    overviewSubtitle:
      "وضعیت داده‌های مرجع تکسا و رسمی که محاسبات، گزارش‌ها و اعتبارسنجی بر آن استوار است.",
    empty: "هنوز داده مرجع تکسا بارگذاری نشده است.",
    mustComeFromTitle: "منشأ داده‌های مرجع",
    mustComeFrom:
      "داده‌های مرجع باید از پایگاه‌داده تکسا، اسکریپت‌های SQL، فایل‌ها و اسناد رسمی وارد و نگاشت شوند. هیچ مقدار رسمی (شاخص/فهرست‌بها/ضریب/...) در کد ثابت نمی‌شود.",
    requiredDataTitle: "داده‌های مرجع مورد نیاز",
    requiredData: [
      "فهرست‌بها",
      "ردیف‌ها",
      "فصل‌ها",
      "واحدها",
      "منابع",
      "شاخص‌ها",
      "بخشنامه‌ها",
      "ضرایب",
      "کسورات",
      "نگاشت داده خام به داده مرجع",
    ] as readonly string[],
    missingGroupsTitle: "گروه‌های داده ناقص",
    goToSources: "ثبت و مدیریت منابع مرجع",
    goToLibrary: "مشاهده کتابخانه مرجع",
    countsTitle: "شمارش جداول مرجع",
    importBlockedPhase2:
      "ورود داده مرجع رسمی بعد از تکمیل تحلیل کنترل‌شده دیتابیس/اسکریپت‌های تکسا و تأیید mapping انجام می‌شود. در این مرحله هیچ عدد رسمی از Excel یا PDF وارد نمی‌شود.",
    sources: {
      title: "منابع مرجع",
      subtitle:
        "ثبت منابع تکسا/رسمی (پایگاه‌داده، اسکریپت، SVZT/BRVT/PSNT، اکسل، PDF). استخراج و نگاشت داده‌ها در مرحلهٔ بعد انجام می‌شود.",
      empty: "هنوز هیچ منبع مرجعی ثبت نشده است.",
      listTitle: "منابع ثبت‌شده",
      registerTitle: "ثبت منبع مرجع جدید",
      colType: "نوع منبع",
      colName: "نام نمایشی",
      colFile: "نام فایل اصلی",
      colDb: "نام پایگاه‌داده اصلی",
      colScript: "نام اسکریپت اصلی",
      colChecksum: "checksum",
      colCreatedAt: "تاریخ ثبت",
      fieldType: "نوع منبع",
      fieldName: "نام نمایشی",
      fieldFile: "نام فایل اصلی (اختیاری)",
      fieldDb: "نام پایگاه‌داده اصلی (اختیاری)",
      fieldScript: "نام اسکریپت اصلی (اختیاری)",
      fieldDescription: "توضیحات (اختیاری)",
      fieldChecksum: "checksum (اختیاری)",
      submit: "ثبت منبع",
      submitting: "در حال ثبت…",
      success: "منبع مرجع ثبت شد. استخراج و mapping داده‌ها در مرحله بعد انجام می‌شود.",
      forbidden: "برای ثبت منبع مرجع باید نقش مدیر سامانه یا مدیر پروژه داشته باشید.",
      invalid: "ورودی نامعتبر است. لطفاً نوع و نام منبع را بررسی کنید.",
      noteNoParse:
        "این فرم تنها فراداده منبع را ثبت می‌کند؛ هیچ فایلی آپلود یا تجزیه نمی‌شود و هیچ داده‌ای ساختگی ایجاد نمی‌شود.",
    },
    library: {
      title: "کتابخانه مرجع",
      subtitle: "خلاصه و شمارش واقعی موجودیت‌های مرجع نرمال‌شده.",
      empty:
        "کتابخانه مرجع هنوز تکمیل نشده است. ابتدا منابع تکسا/اسناد رسمی را ثبت و سپس داده‌ها را import کنید.",
      countsTitle: "شمارش موجودیت‌های مرجع",
    },
  },
  /** Reference source types (Persian labels for the ReferenceSourceType enum). */
  referenceSourceType: {
    TAKSA_DB: "پایگاه‌داده تکسا",
    TAKSA_SQL_SCRIPT: "اسکریپت SQL تکسا",
    SVZT: "فایل SVZT",
    BRVT: "فایل BRVT",
    PSNT: "فایل PSNT",
    EXCEL: "قالب اکسل",
    PDF_OFFICIAL_DOC: "سند رسمی PDF",
    MANUAL_VERIFIED: "ثبت دستی تأییدشده",
  },
  /** Taksa workbench routes (/taksa, /taksa/imports, /taksa/raw). */
  taksa: {
    title: "ورود اطلاعات تکسا",
    overviewSubtitle:
      "تکسا منبع مرجع/master است، نه پایگاه‌دادهٔ عملیاتی. داده خام تکسا به‌صورت بیت‌به‌بیت برای حفظ و round-trip نگهداری می‌شود.",
    preservationTitle: "حفظ داده خام (round-trip)",
    preservation:
      "هر ردیف تکسا با نام جدول، ترتیب و محتوای خام دست‌نخورده ذخیره می‌شود؛ ویرایش‌ها تنها در لایهٔ patch اعمال می‌شوند تا منبع اصلی قابل بازسازی بماند.",
    countsTitle: "شمارش داده خام تکسا",
    goToImports: "منابع و وضعیت واردسازی",
    goToRaw: "مشاهده داده خام",
    raw: {
      title: "داده خام تکسا",
      subtitle: "فهرست و شمارش واقعی آرتیفکت‌ها، جدول‌ها و ردیف‌های خام تکسا.",
      empty: "هنوز داده خام تکسا وارد نشده است.",
      colArtifact: "آرتیفکت",
      colImport: "وضعیت ورود",
      colExport: "وضعیت خروج",
      colTables: "جدول‌ها",
    },
    imports: {
      title: "منابع و واردسازی تکسا",
      subtitle:
        "نقشهٔ صادقانهٔ آنچه اکنون پیاده‌سازی شده در برابر آنچه عمداً به مراحل بعد موکول شده است.",
      requiredTitle: "انواع منابع موردنیاز",
      requiredSources: [
        "پایگاه‌داده تکسا (Taksa DB)",
        "اسکریپت‌های SQL",
        "فایل‌های SVZT",
        "فایل‌های BRVT",
        "فایل‌های PSNT",
        "قالب‌های اکسل",
        "اسناد رسمی PDF",
      ] as readonly string[],
      implementedTitle: "آنچه پیاده‌سازی شده است",
      implemented: [
        "ثبت فرادادهٔ منبع مرجع (ReferenceSource)",
        "شِمای کامل داده مرجع نرمال‌شده (Reference*)",
        "شِمای حفظ داده خام (TaksaArtifact/RawTable/RawRow)",
        "قراردادهای نگاشت داده خام به مرجع و چرخهٔ وضعیت نگاشت",
        "پایهٔ خط‌لولهٔ واردسازی مرجع (schema/کشف فایل/اعتبارسنجی/dry-run)",
      ] as readonly string[],
      deferredTitle: "آنچه عمداً هنوز پیاده‌سازی نشده است",
      deferred: [
        "بازیابی کامل پایگاه‌داده تکسا (Taksa DB restore)",
        "تجزیهٔ کامل SVZT/BRVT/PSNT",
        "استخراج خودکار از اسناد رسمی PDF",
        "سریال‌سازی و خروجی به تکسا",
      ] as readonly string[],
      honestNote:
        "این موارد به‌صورت قراردادهای تایپ‌شده و شِما آماده شده‌اند تا واردکننده‌های آینده بدون بازنویسی، جدول‌های مرجع را پر کنند.",
      // Phase 2 — server-aware ingestion guidance + exact paths/commands.
      serverPathsTitle: "مسیر منابع در سرور",
      prodAppPath: "مسیر برنامه (production): /opt/civilic/data/incoming/taksa",
      realServerPath: "مسیر واقعی سرور: /opt/karman-data/app-data/incoming/taksa",
      symlinkNote: "پیوند نمادین: /opt/civilic/data -> /opt/karman-data/app-data",
      sourcesPreparedNote:
        "فایل‌های منبع از قبل روی سرور آماده شده‌اند؛ وب‌سایت هرگز فایل خام تکسا را به‌عنوان منبع داده نمی‌خواند و تنها فراداده‌ی PostgreSQL را نمایش می‌دهد.",
      restoreBlockedTitle: "وضعیت بازیابی پایگاه‌داده SQL Server",
      restoreBlocked:
        "بازیابی کامل پایگاه‌داده SQL Server در حال حاضر به‌دلیل خطای گذرواژه‌ی فایل پشتیبان (SQL Server Msg 3279) مسدود است.",
      phase2ContinuesNote:
        "فاز ۲ بدون بازیابی، از طریق SQL/SCP، ScriptXML، رشته‌های امن پشتیبان، MDB، قالب‌های اکسل، اسناد و فراداده‌ی PDF ادامه می‌یابد.",
      commandsTitle: "دستورهای سمت سرور (با KARMAN_DATA_ROOT)",
      commands: [
        "KARMAN_DATA_ROOT=/opt/civilic/data npm run taksa:discover",
        "KARMAN_DATA_ROOT=/opt/civilic/data npm run taksa:register-sources",
        "KARMAN_DATA_ROOT=/opt/civilic/data npm run taksa:analyze",
        "KARMAN_DATA_ROOT=/opt/civilic/data npm run taksa:db:inspect",
        "KARMAN_DATA_ROOT=/opt/civilic/data npm run taksa:scriptxml:audit",
        "KARMAN_DATA_ROOT=/opt/civilic/data npm run taksa:sql:audit",
        "KARMAN_DATA_ROOT=/opt/civilic/data npm run taksa:backup-strings:audit",
        "KARMAN_DATA_ROOT=/opt/civilic/data npm run taksa:mdb:audit",
        "KARMAN_DATA_ROOT=/opt/civilic/data npm run taksa:excel:audit",
        "KARMAN_DATA_ROOT=/opt/civilic/data npm run taksa:docs:audit",
        "KARMAN_DATA_ROOT=/opt/civilic/data npm run taksa:pdf:audit",
        "KARMAN_DATA_ROOT=/opt/civilic/data npm run import:reference -- --dry-run",
      ] as readonly string[],
      applyBlockedNote:
        "اجرای import:reference -- --apply تا زمان بازبینی و تأیید mapping در فاز ۳ مسدود است.",
    },
    sources: {
      title: "منابع کشف‌شده تکسا",
      subtitle:
        "فهرست فایل‌های کشف و ثبت‌شده از روی فراداده‌ی PostgreSQL؛ هیچ فایلی هنگام نمایش اسکن نمی‌شود.",
      empty:
        "هنوز هیچ منبعی ثبت نشده است. روی سرور دستور taksa:register-sources را اجرا کنید.",
      colPath: "مسیر نسبی",
      colType: "نوع منبع",
      colCategory: "دسته",
      colSize: "اندازه (بایت)",
      colAnalysis: "قابل تحلیل",
      countsTitle: "شمارش بر اساس نوع",
      adminNote: "ثبت و تحلیل منابع تنها برای مدیر سامانه مجاز است.",
    },
    analyze: {
      title: "تحلیل تکسا",
      subtitle:
        "خلاصه‌ی اجراهای تحلیل از روی فراداده‌ی PostgreSQL — بدون اسکن فایل خام در زمان اجرا و بدون اعداد ساختگی.",
      empty:
        "هنوز هیچ اجرای تحلیلی ثبت نشده است. روی سرور دستور taksa:analyze را اجرا کنید.",
      runsTitle: "اجراهای تحلیل",
      colAnalyzer: "تحلیل‌گر",
      colStatus: "وضعیت",
      colFiles: "فایل‌ها",
      colStarted: "شروع",
      links: "بخش‌های تحلیل",
      scriptXmlTitle: "نگاشت ScriptXML",
      scriptXmlEmpty: "هنوز نگاشتی ثبت نشده است.",
      sqlTitle: "جدول‌های شناسایی‌شده‌ی SQL",
      sqlEmpty: "هنوز جدولی شناسایی نشده است.",
      backupStringsTitle: "نامزدهای جدول از رشته‌های پشتیبان",
      backupStringsEmpty: "هنوز نامزدی ثبت نشده است.",
      templatesTitle: "شیت‌های قالب اکسل",
      templatesEmpty: "هنوز شیتی ثبت نشده است.",
      docsTitle: "برچسب‌ها و رفتار UI",
      docsLabels: "برچسب‌های UI",
      docsHints: "نکات رفتاری",
      docsEmpty: "هنوز برچسب یا نکته‌ای ثبت نشده است.",
      colProc: "رویه",
      colXmlPath: "مسیر XML",
      colTarget: "جدول مقصد",
      colName: "نام",
      colSource: "منبع",
      colLabel: "برچسب",
      colTopic: "موضوع",
      colText: "متن",
    },
  },
  inbox: {
    title: "کارتابل رسیدگی",
    subtitle: "کارهای در جریان مربوط به پروژه‌های شما",
    empty: "کارتابل شما خالی است.",
    emptyDescription: "در حال حاضر کار در انتظاری برای شما وجود ندارد.",
    caseTitle: "عنوان",
    caseState: "وضعیت",
    caseProject: "پروژه",
  },
  projectSetup: {
    title: "تعریف پروژه و قرارداد",
    subtitle: "ایجاد پروژه بر پایهٔ داده مرجع تکسا — وابسته به آمادگی داده مرجع",
    placeholderTitle: "تعریف پروژه به‌زودی فعال می‌شود",
    placeholderDescription:
      "این بخش برای ایجاد پروژه و پیکربندی اعضا و قراردادها در نسخه‌های بعدی تکمیل می‌شود.",
    forbiddenTitle: "دسترسی به تعریف پروژه ندارید",
    forbiddenDescription:
      "برای ایجاد پروژه باید نقش مدیر پروژه یا مدیر سامانه داشته باشید.",
    // Reference-gated init modes
    modesTitle: "حالت‌های تعریف پروژه",
    mode1Title: "تعریف پروژه بر اساس داده مرجع/فهرست‌بها",
    mode1Description:
      "پروژه با اتصال به فهرست‌بها، واحدها، شاخص‌ها و ضرایب مرجع تعریف می‌شود.",
    mode2Title: "اتصال به منبع تکسا یا خروجی SVZT/BRVT/PSNT",
    mode2Description:
      "پروژه از یک منبع تکسا یا خروجی رسمی واردشده مقداردهی می‌شود.",
    checklistTitle: "فهرست آمادگی داده مرجع",
    blockedTitle: "تعریف پروژه هنوز فعال نیست",
    blocked:
      "تعریف پروژه واقعی وابسته به داده‌های مرجع است. ابتدا فهرست‌بها، شاخص‌ها، واحدها، منابع و بخشنامه‌های رسمی را ثبت یا وارد کنید.",
    readyTitle: "آمادگی داده مرجع تأیید شد",
    readyNote:
      "حداقل داده مرجع موجود است؛ گام‌های بعدی تعریف پروژهٔ تکسا-محور در مراحل آینده تکمیل می‌شود.",
    checkReferenceSource: "منبع مرجع ثبت شده است",
    checkReferenceBook: "کتاب مرجع/فهرست‌بها موجود است",
    checkReferenceItem: "ردیف فهرست‌بها موجود است",
    checkReferenceUnit: "واحدها موجود است",
    checkReferenceIndexPeriod: "شاخص‌ها موجود است",
    checkReferenceCircular: "بخشنامه‌ها موجود است",
    linkSources: "ثبت منابع مرجع",
    linkReference: "کتابخانه فنی و مرجع",
    linkTaksaImports: "منابع و واردسازی تکسا",
    phase2Blocked:
      "تعریف پروژه واقعی بعد از تکمیل تحلیل تکسا، mapping داده مرجع و ورود کنترل‌شده فهرست‌بها/شاخص به PostgreSQL فعال می‌شود.",
  },
  common: {
    loading: "در حال بارگذاری…",
    save: "ذخیره",
    cancel: "انصراف",
    retry: "تلاش مجدد",
    signedInAs: "کاربر واردشده",
    yes: "بله",
    no: "خیر",
  },
  projectStatus: {
    DRAFT: "پیش‌نویس",
    ACTIVE: "فعال",
    ARCHIVED: "بایگانی‌شده",
  },
} as const;

export type Messages = typeof fa;
