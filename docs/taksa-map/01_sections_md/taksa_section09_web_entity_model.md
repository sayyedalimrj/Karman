# بخش ۹ — نقشه موجودیت‌های نسخه وب

## وضعیت

- [x] بخش ۹ انجام شد.
- هدف این بخش تبدیل تحلیل تکسا به **مدل محصول وب** بود؛ نه کپی مستقیم جدول‌های تکسا.
- اصل round-trip همچنان حفظ می‌شود: مدل وب باید زیباتر و تمیزتر باشد، اما raw تکسا را از دست ندهد.

---

## تصمیم معماری اصلی

نسخه وب باید دو مدل هم‌زمان داشته باشد:

### ۱. مدل سازگاری تکسا

این مدل برای import/export، حفظ raw، patch و برگشت به تکساست.

```text
TaksaArtifact
  └── TaksaRawTable
        └── TaksaRawRow
              └── normalized_entity_id
```

### ۲. مدل محصول وب

این مدل برای UI، workflow، محاسبات، گزارش، رسیدگی و تجربه کاربری بهتر است.

```text
Project
Contract
ProjectParty
CommercialDocument
PaymentPeriod
DocumentVersion
ProjectItemSnapshot
MeasurementLine
ReviewedWorkLine
FinancialStatementLine
AdjustmentRun
ReportTemplate
WorkflowCase
AuditLog
```

نتیجه: نسخه وب از نظر کاربری بهتر از تکسا می‌شود، اما برای خروجی قابل برگشت، به raw anchor متصل می‌ماند.

---

## گروه‌های اصلی موجودیت‌ها

| گروه | موجودیت‌های اصلی | نقش در محصول |
|---|---|---|
| سازگاری تکسا | TaksaArtifact, TaksaRawTable, TaksaRawRow | import/export و حفظ ساختار خام |
| مبانی | ReferenceBook, PriceListChapter, PriceListItem, Unit, Resource, IndexPeriod | فهرست‌بها، منابع، شاخص، واحد |
| پروژه | Project, Contract, ProjectParty, Attachment | قرارداد، عوامل، پیوست‌ها |
| اسناد مالی | CommercialDocument, PaymentPeriod, DocumentVersion | برآورد، پیشنهاد، صورت‌وضعیت |
| آیتم‌ها | ProjectItemSnapshot, ChapterSummary, CoefficientAssignment | ردیف‌ها، فصل‌ها، ضرایب |
| متره و رسیدگی | MeasurementGroup, MeasurementLine, ActivitySchedule, ReviewedWorkLine | ریزمتره، صورتجلسه، رسیدگی |
| مالی | FinancialStatementLine, DeductionLine | برگه مالی، کسورات |
| تعدیل | AdjustmentRun, AdjustmentLine, IndexPeriod | تعدیل و شاخص |
| حمل و آنالیز | TransportDistance, AnalysisLine, Resource | حمل، فاصله، آنالیز بها |
| گزارش و workflow | ReportTemplate, WorkflowCase, AuditLog | خروجی‌ها، کارتابل، قفل، تاریخچه |

---

## مدل مشترک برای برآورد، پیشنهاد و صورت‌وضعیت

تکسا در سطح فایل/دیتابیس modeهای متفاوت دارد:

```text
brv → برآورد
psn → پیشنهاد / پیمان
svz → صورت‌وضعیت
```

در نسخه وب، به جای سه مدل کاملاً جدا، یک موجودیت مرکزی تعریف شد:

```text
CommercialDocument
```

با فیلدهای کلیدی:

```text
document_kind = estimate | bid | payment_certificate
taksa_type
taksa_nusv
taksa_situ
project_id
workflow_state
```

این تصمیم باعث می‌شود UI و workflow ساده‌تر شود، اما type/nusv/situ برای برگشت به تکسا حفظ شود.

---

## هسته حیاتی Round-trip

برای هر رکورد importشده باید این anchorها حفظ شوند:

```text
artifact_id
raw_table_name
raw_row_order
link_proj
type
nusv
nufh
nuse
cofh
link_mog
link_grop
raw_json
dirty_patch_json
```

قانون: خروجی `.svzt` نباید از صفر ساخته شود. باید از raw اصلی + patchهای کنترل‌شده ساخته شود.

---

## موجودیت‌های P0 برای MVP

این‌ها باید اول پیاده‌سازی شوند:

1. `TaksaArtifact / TaksaRawTable / TaksaRawRow`
2. `Project / Contract / ProjectParty`
3. `CommercialDocument / PaymentPeriod / DocumentVersion`
4. `ProjectItemSnapshot / ChapterSummary / CoefficientAssignment`
5. `MeasurementLine / ReviewedWorkLine / FinancialStatementLine`
6. `DeductionLine / AdjustmentRun / AdjustmentLine / IndexPeriod`

بدون این‌ها، import/export، صورت‌وضعیت، تعدیل و برگه مالی قابل اعتماد نمی‌شود.

---

## تأثیر روی UI

نسخه وب نباید table-first باشد. مدل پیشنهادی UI:

```text
Project Workbench
  ├── Contract
  ├── Price List
  ├── Estimate
  ├── Payment Certificate Builder
  ├── Review Desk
  ├── Adjustment
  ├── Reports
  └── Taksa Compatibility
```

کاربر عادی raw تکسا را نمی‌بیند. raw فقط برای پشتیبانی، validation و برگشت به تکساست.

---

## تصمیم‌های مهم طراحی

| تصمیم | دلیل |
|---|---|
| ProjectItemSnapshot جدا از PriceListItem | چون اسناد قدیمی نباید با تغییر مبانی/سال خراب شوند |
| CommercialDocument مدل مشترک باشد | چون brv/psn/svz ساختارهای مشابه ولی mode متفاوت دارند |
| DocumentVersion جدا باشد | چون رسیدگی پیمانکار/مشاور/کارفرما و قفل نسخه مهم است |
| TaksaRawRow همیشه حفظ شود | برای برگشت به تکسا و جلوگیری از حذف فیلدهای ناشناخته |
| AuditLog اجباری باشد | برای ردیابی اختلاف محاسبه و patchهای خروجی |
| ReportTemplate از export جدا باشد | PDF/Excel گزارش است؛ SVZT مسیر round-trip جدا دارد |

---

## خروجی‌های این بخش

- `taksa_section09_web_entity_catalog.csv`
- `taksa_section09_entity_relationships.csv`
- `taksa_section09_module_boundaries.csv`
- `taksa_section09_entity_roundtrip_rules.csv`
- `taksa_section09_taksa_to_web_entity_matrix.csv`
- `taksa_section09_mvp_entity_priority.csv`

---

## نتیجه

بخش ۹ نقشه داده نسخه وب را مشخص کرد. از اینجا به بعد می‌توانیم workflow را روی همین مدل ببندیم:

```text
Project → CommercialDocument → Measurement → Review → Financial → Adjustment → Reports → Export
```

بخش بعدی باید نقش‌ها، وضعیت‌ها، کارتابل و مسیر تأیید/رد/قفل را دقیق کند.
