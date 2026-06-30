# بخش ۱۳ — نقشه پیاده‌سازی مرحله‌ای / Roadmap اجرایی

## وضعیت

- [x] بخش ۱۳ انجام شد.
- هدف: تبدیل تمام تحلیل‌ها، موجودیت‌ها، workflow، UI و engine به یک مسیر اجرایی قابل کدنویسی.
- اصل اجرایی: اول compatibility و data integrity، بعد workflow، بعد محاسبات، بعد report/export، بعد golden tests.

---

## چک‌لیست نهایی تحلیل

```text
[x] بخش 0  — دریافت، استخراج و چیدمان فایل‌ها
[x] بخش 1  — کنترل موجودی منابع و اولویت‌بندی فایل‌ها
[x] بخش 2  — تحلیل گزارش‌ها و خروجی‌های تکسا
[x] بخش 3  — تحلیل دیتابیس و روابط جدول‌ها
[x] بخش 3.1 — الحاقیه بررسی دیتابیس اصلی 1 گیگ
[x] بخش 4  — تحلیل فرمت‌های SVZT / BRVT / PSNT و Round-trip
[x] بخش 5  — تحلیل import/export و mapping
[x] بخش 6  — تحلیل ماژول‌ها، فرم‌ها، UI و اصطلاحات تکسا
[x] بخش 7  — تحلیل Excel و قالب‌های خروجی
[x] بخش 8  — تحلیل قوانین فهرست‌بها، شاخص، تعدیل، ضرایب و کسورات
[x] بخش 9  — طراحی نقشه موجودیت‌های نسخه وب
[x] بخش 10 — طراحی workflow، نقش‌ها، کارتابل‌ها و سیکل‌های کاری
[x] بخش 11 — طراحی صفحات React/Next
[x] بخش 12 — طراحی موتور محاسبات و تست تطبیق با تکسا
[x] بخش 13 — نقشه پیاده‌سازی مرحله‌ای / Roadmap اجرایی
```

---

## ترتیب درست پیاده‌سازی

نباید مستقیم برویم سراغ UI صورت‌وضعیت یا تعدیل. ترتیب درست این است:

```text
0. Architecture & Repo Foundation
1. Taksa Compatibility Layer
2. Project Core + Reference Database
3. Commercial Document + Workflow Base
4. Measurement Builder
5. Financial Calculation MVP
6. Review Desk + Employer Approval
7. Coefficients + Deductions + Adjustment
8. Reports + Excel/PDF
9. SVZT Export + Round-trip Validator
10. Golden Tests + Hardening
```

---

## فازهای اجرایی

### P0 — قفل معماری و آماده‌سازی ریپو

خروجی‌ها:

```text
AppShell RTL
Auth/Role Guard
DB migration base
Decimal policy
Audit base
Shared UI kit
```

Gate: پروژه باید بالا بیاید، RTL درست باشد، نقش‌ها enforce شوند.

---

### P1 — Compatibility Layer و Import تکسا

خروجی‌ها:

```text
TaksaArtifact
TaksaRawTable
TaksaRawRow
Import Center
Raw Inspector
Validation Report
```

Gate: یک فایل SVZT نمونه import شود و table count / row count / case نام‌ها حفظ شود.

---

### P2 — Project Core و Reference Database

خروجی‌ها:

```text
Project
Contract
ProjectParty
ReferenceBook
PriceListExplorer
Project Setup Wizard
```

Gate: پروژه و قرارداد ساخته شود و آیتم فهرست‌بها با واحد و قیمت انتخاب شود.

---

### P3 — Commercial Document و Workflow Base

خروجی‌ها:

```text
CommercialDocument
PaymentPeriod
DocumentVersion
WorkflowCase
Inbox
StateActionBar
```

Gate: سند از draft تا submitted state برود و actionها طبق نقش کنترل شوند.

---

### P4 — Measurement و صورتجلسه

خروجی‌ها:

```text
MeasurementBuilder
MeasurementGroup
MeasurementLine
AttachmentSidePanel
Quantity Calculation MVP
```

Gate: ردیف ریزمتره ثبت شود، مقدار Decimal محاسبه شود و به آیتم وصل شود.

---

### P5 — Financial Engine و برگه مالی MVP

خروجی‌ها:

```text
FinancialStatementLine
FinancialSummaryCards
ChapterSummary
CalculationRun
CalculationTrace
```

Gate: برگه مالی MVP با previous/current/total و trace تولید شود.

---

### P6 — Review Desk و Employer Approval

خروجی‌ها:

```text
ReviewDiffGrid
ReviewCommentThread
EmployerApprovalPage
VersionHistory
AuditLog
Document Lock
```

Gate: سیکل پیمانکار → مشاور → کارفرما → قفل کامل اجرا شود.

---

### P7 — Coefficient, Deduction و Adjustment MVP

خروجی‌ها:

```text
CoefficientMatrixEditor
DeductionGrid
AdjustmentEngine
Index Selector
Adjustment Trace
```

Gate: ضرایب، کسورات و تعدیل با trace محاسبه شوند.

---

### P8 — Reports Center و خروجی PDF/Excel

خروجی‌ها:

```text
ReportRegistry
bgml/seas/rzmt/tdil projections
PDF templates
Excel numeric exports
```

Gate: خروجی‌های اصلی PDF/Excel تولید شوند و Excelها numeric باشند.

---

### P9 — SVZT Export و Round-trip Validator

خروجی‌ها:

```text
ExportCenter
ExportValidationChecklist
ExportDiffViewer
SVZT Export Job
```

Gate: export با raw + patch ساخته شود و zero critical validation داشته باشد.

---

### P10 — Golden Tests و Hardening

خروجی‌ها:

```text
Golden Test Suite
Taksa comparison reports
Rounding fixes
Security review
Performance checks
Bug bash
```

Gate: اختلاف‌های عددی یا صفر شوند یا مستند و قابل قبول باشند.

---

## برنامه Sprint پیشنهادی

```text
S0  — Bootstrapping
S1  — Data foundation
S2  — Taksa raw import
S3  — Reference & price list
S4  — Commercial document workflow
S5  — Measurement builder
S6  — Financial MVP
S7  — Review & approval
S8  — Coefficients/deductions/adjustment
S9  — Reports & Excel
S10 — Round-trip export
S11 — Golden test & hardening
```

این زمان‌بندی تقریبی است؛ بسته به سرعت تیم می‌تواند فشرده‌تر یا طولانی‌تر شود.

---

## MVP واقعی چیست؟

MVP واقعی فقط صفحه قشنگ نیست. باید این‌ها را داشته باشد:

```text
ورود فایل تکسا
تعریف پروژه
فهرست‌بها و آیتم‌ها
ساخت صورت‌وضعیت
ریز‌متره
محاسبه مالی پایه
رسیدگی مشاور
تأیید کارفرما
قفل نسخه
گزارش‌های اصلی
خروجی Excel/PDF
Export سازگار با تکسا
تست تطبیق با خروجی تکسا
```

---

## چیزهایی که نباید زود انجام شوند

```text
ساخت گزارش‌های زیاد و غیرضروری
کپی کردن UI قدیمی تکسا
تکمیل transport/analysis قبل از financial core
قفل کردن فرمول‌های حساس بدون golden test
ساخت SVZT از صفر
حذف raw یا unknown fields
قرار دادن فایل‌های حساس/پسورد در ریپو
```

---

## ساختار پیشنهادی ریپو

```text
src/app/
src/components/layout
src/components/workflow
src/components/grids
src/components/taksa
src/components/financial
src/components/adjustment
src/lib/taksa
src/lib/calculation
src/lib/workflow
src/lib/reports
src/lib/decimal
src/server/api
prisma/schema.prisma
docs/taksa-map
```

---

## Gateهای کنترل کیفیت

قبل از رفتن به فاز بعد باید gate قبلی پاس شود:

```text
G0 Architecture Gate
G1 Raw Import Gate
G2 Workflow Gate
G3 Calculation Gate
G4 Review Gate
G5 Adjustment Gate
G6 Export Gate
G7 Golden Test Gate
```

مهم‌ترین gateها:

```text
Raw Import Gate
Calculation Gate
Export Gate
Golden Test Gate
```

---

## ریسک‌های حیاتی

| ریسک | کنترل |
|---|---|
| SVZT در تکسا باز نشود | raw + patch merge و validation |
| اختلاف مبلغ با تکسا | trace و golden tests |
| ضرایب اشتباه اعمال شوند | CoefficientTrace و تست با brv_mult |
| نسخه‌های رسیدگی overwrite شوند | DocumentVersion immutable |
| فایل حساس وارد ریپو شود | secret scan و gitignore |
| Excel numeric نباشد | cell type numeric و display format جدا |
| permission فقط UI باشد | enforcement در API |

---

## نتیجه نهایی Roadmap

مسیر درست اجرای پروژه:

```text
اول: سازگاری و raw تکسا
بعد: پروژه و workflow
بعد: متره و مالی
بعد: رسیدگی و قفل
بعد: تعدیل و ضرایب
بعد: گزارش و خروجی
آخر: Golden tests و سخت‌سازی
```

اصل نهایی محصول:

```text
کاربر با یک UI تمیز، مرحله‌ای و امروزی کار می‌کند؛
سیستم پشت صحنه منطق، اعداد، raw و خروجی قابل برگشت به تکسا را حفظ می‌کند.
```
