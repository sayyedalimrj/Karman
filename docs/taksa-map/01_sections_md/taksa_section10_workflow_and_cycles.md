# بخش ۱۰ — طراحی Workflow، نقش‌ها، کارتابل و سیکل‌های کاری

## وضعیت

- [x] بخش ۱۰ انجام شد.
- هدف: طراحی گردش کار نسخه وب بر اساس منطق تکسا، با UI و تجربه کاربری بهتر.
- اصل ثابت: workflow وب باید تمیزتر باشد، اما به `type / situ / nusv / version / raw anchor` قابل ترجمه بماند.

---

## تصمیم اصلی

سایت نباید فقط فرم و جدول باشد. باید **workflow-first** باشد:

```text
پروژه
  ↓
سند مالی
  ↓
متره / ریزمتره
  ↓
ارسال پیمانکار
  ↓
رسیدگی مشاور
  ↓
تأیید کارفرما
  ↓
قفل
  ↓
گزارش / خروجی تکسا
```

برای همین موجودیت‌های بخش ۹ روی یک state machine قرار گرفتند.

---

## نقش‌های اصلی

| نقش | مسئولیت |
|---|---|
| مدیر پروژه / ادمین | تعریف پروژه، قرارداد، عوامل، مبانی، import/export |
| پیمانکار | تهیه متره، صورت‌وضعیت و ارسال برای رسیدگی |
| مشاور | رسیدگی خط به خط، اصلاح مقدار، برگشت یا تأیید |
| کارفرما | بررسی خلاصه مالی، تأیید یا برگشت، قفل نهایی |
| کنترل مالی | کنترل برگه مالی، کسورات، تعدیل و اختلافات |
| مشاهده‌گر | مشاهده پروژه و گزارش‌ها |
| پشتیبان فنی | raw، mapping، validation و خروجی سازگار با تکسا |

---

## سیکل اصلی صورت‌وضعیت

```text
Draft
  ↓
Measurement In Progress
  ↓
Contractor Internal Check
  ↓
Submitted To Consultant
  ↓
Consultant Reviewing
  ├── Returned To Contractor
  │       ↓
  │   Resubmitted To Consultant
  │       ↓
  └── Consultant Approved
          ↓
      Submitted To Employer
          ↓
      Employer Reviewing
          ├── Returned By Employer
          │       ↓
          │   Resubmitted To Employer
          │       ↓
          └── Employer Approved
                  ↓
              Document Locked
                  ↓
              Export Ready
                  ↓
              Exported To Taksa
```

---

## سیکل‌های کاری ثبت‌شده

1. Import / Round-trip Cycle
2. Project Setup Cycle
3. Payment Certificate Cycle
4. Measurement / Site Minute Cycle
5. Consultant Review Cycle
6. Employer Approval Cycle
7. Adjustment Cycle
8. Report / Export Cycle
9. Correction / Revision Cycle

---

## تفاوت نسخه وب با تکسا

تکسا بیشتر table-first است؛ نسخه وب باید process-first باشد.

### بهبودهای UX ثبت‌شده

| بخش | بهبود پیشنهادی |
|---|---|
| تعریف پروژه | wizard مرحله‌ای با checklist |
| صورت‌وضعیت | builder با timeline و خلاصه مالی زنده |
| ریزمتره | فرمول‌نویسی ساده، پیوست کنار ردیف، کپی از دوره قبل |
| رسیدگی مشاور | diff پیمانکار/مشاور/کارفرما، فیلتر اختلاف، کامنت |
| تأیید کارفرما | صفحه خلاصه مدیریتی، نه جدول خام |
| تعدیل | نمایش شاخص، فرمول، دوره و خروجی قابل چاپ |
| خروجی تکسا | export health badge و diff قبل/بعد |
| تاریخچه | مقایسه نسخه‌ها و دلیل برگشت‌ها |

---

## قوانین قفل و نسخه‌بندی

قانون‌های حیاتی:

```text
بعد از ارسال پیمانکار، نسخه پیمانکار read-only شود.
بعد از تأیید مشاور، نسخه مشاور قفل شود.
بعد از تأیید کارفرما، نسخه نهایی قفل شود.
اصلاح سند قفل‌شده فقط با revision جدید و audit مجاز است.
هیچ raw row بدون patch log تغییر نکند.
خروجی SVZT قبل از export باید validation شود.
```

---

## ارتباط با تکسا

workflow وب باید به این anchorها وصل بماند:

```text
brv_type
brv_situ
brv_type_situ
taksa_type
taksa_nusv
taksa_situ
DocumentVersion
Fn_TypeIsLocked
Fn_VersionNztIsLocked
SpDeleteTypeSituDependencies
```

این یعنی UI ما مدرن‌تر است، اما وقتی خروجی می‌گیریم، هنوز ساختار تکسا قابل فهم و قابل برگشت می‌ماند.

---

## صفحات اصلی پیشنهادی

| صفحه | نقش |
|---|---|
| Project Dashboard | دید کلی پروژه و وضعیت‌ها |
| Project Setup Wizard | تعریف پروژه، قرارداد، عوامل، مبانی |
| Import Center | ورود و validation فایل تکسا |
| Payment Certificate Builder | ساخت صورت‌وضعیت |
| Measurement Grid | متره، ریزمتره و صورتجلسه |
| Review Desk | رسیدگی مشاور |
| Employer Approval | تأیید کارفرما |
| Adjustment Engine | تعدیل و شاخص |
| Reports Center | خروجی PDF/Excel |
| Version History | تاریخچه نسخه‌ها |
| Taksa Compatibility Inspector | raw، patch، validation، export |

---

## خروجی‌های این بخش

- `taksa_section10_role_permission_matrix.csv`
- `taksa_section10_workflow_states.csv`
- `taksa_section10_transition_matrix.csv`
- `taksa_section10_cycle_map.csv`
- `taksa_section10_screen_workflow_map.csv`
- `taksa_section10_lock_audit_rules.csv`
- `taksa_section10_action_permission_matrix.csv`
- `taksa_section10_ux_workflow_recommendations.csv`

---

## نتیجه

بخش ۱۰ مسیر عملیاتی سیستم را مشخص کرد. از اینجا به بعد طراحی صفحات و کامپوننت‌ها باید دقیقاً روی همین سیکل‌ها سوار شود.

اصل طراحی:

```text
کاربر با workflow ساده و زیبا کار می‌کند؛
سیستم پشت صحنه raw و mapping تکسا را حفظ می‌کند.
```
