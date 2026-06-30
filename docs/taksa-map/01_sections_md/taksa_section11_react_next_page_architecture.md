# بخش ۱۱ — طراحی صفحات React/Next

## وضعیت

- [x] بخش ۱۱ انجام شد.
- هدف: تبدیل موجودیت‌ها و workflowهای بخش ۹ و ۱۰ به نقشه واقعی صفحات، routeها، کامپوننت‌ها و APIها.
- اصل طراحی: سایت باید workflow-first، RTL، فارسی‌محور، تمیزتر از تکسا، اما کاملاً سازگار با round-trip باشد.

---

## تصمیم فنی پیشنهادی

ساختار پیشنهادی برای Next.js App Router:

```text
app/
  (auth)/
    login/
  app/
    inbox/
    projects/
      page.tsx
      [projectId]/
        layout.tsx
        page.tsx
        setup/
        contract/
        parties/
        references/
        price-list/
        documents/
          page.tsx
          new/
          [documentId]/
            layout.tsx
            page.tsx
            items/
            coefficients/
            measurement/
            financial/
            review/
            employer/
            adjustment/
            reports/
            export/
            versions/
        reports/
        taksa/
          page.tsx
          artifacts/[artifactId]/
          artifacts/[artifactId]/diff/
```

نکته: routeها کاربرپسند و workflow-first هستند، نه کپی مستقیم tableهای تکسا.

---

## لایه‌های UI

### ۱. AppShell

برای کل سامانه:

```text
sidebar
topbar
project switcher
user menu
global inbox
RTL layout
```

### ۲. ProjectShell

برای داخل پروژه:

```text
breadcrumb
project status
Taksa health badge
project tabs
workflow warnings
```

### ۳. DocumentShell

برای سند مالی:

```text
document header
workflow timeline
state action bar
version badge
financial summary
document tabs
```

---

## صفحات اصلی

| صفحه | نقش |
|---|---|
| InboxPage | کارتابل من |
| ProjectDashboardPage | داشبورد پروژه |
| ProjectSetupWizardPage | ویزارد تعریف پروژه |
| ImportCenterPage | ورود فایل تکسا |
| PriceListExplorerPage | فهرست‌بها |
| CommercialDocumentListPage | اسناد مالی |
| PaymentCertificateBuilderPage | ساخت صورت‌وضعیت |
| MeasurementBuilderPage | متره و ریزمتره |
| ConsultantReviewDeskPage | رسیدگی مشاور |
| EmployerApprovalPage | تأیید کارفرما |
| AdjustmentEnginePage | تعدیل و شاخص |
| ReportsCenterPage | گزارش‌ها |
| DocumentExportCenterPage | خروجی PDF/Excel/SVZT |
| TaksaArtifactInspectorPage | بررسی raw تکسا |
| VersionHistoryPage | تاریخچه نسخه‌ها |

---

## مدل routeها

نمونه routeهای حیاتی:

```text
/app/inbox
/app/projects
/app/projects/[projectId]
/app/projects/[projectId]/setup
/app/projects/[projectId]/price-list
/app/projects/[projectId]/documents
/app/projects/[projectId]/documents/[documentId]
/app/projects/[projectId]/documents/[documentId]/measurement
/app/projects/[projectId]/documents/[documentId]/review
/app/projects/[projectId]/documents/[documentId]/employer
/app/projects/[projectId]/documents/[documentId]/adjustment
/app/projects/[projectId]/documents/[documentId]/export
/app/projects/[projectId]/taksa/artifacts/[artifactId]
```

---

## مسیر کاربر برای صورت‌وضعیت

```text
ProjectDashboard
  ↓
CommercialDocumentList
  ↓
NewCommercialDocumentWizard
  ↓
DocumentOverview
  ↓
MeasurementBuilder
  ↓
FinancialSummary
  ↓
SubmitToConsultant
  ↓
ConsultantReviewDesk
  ↓
EmployerApproval
  ↓
DocumentExportCenter
```

این مسیر با workflow بخش ۱۰ کاملاً match شده.

---

## کامپوننت‌های حیاتی

| کامپوننت | نقش |
|---|---|
| WorkflowTimeline | timeline سند |
| StateActionBar | actionهای مجاز بر اساس role/state |
| SmartDataGrid | جدول حرفه‌ای برای آیتم، متره، مالی، رسیدگی |
| ReviewDiffGrid | مقایسه پیمانکار/مشاور/کارفرما |
| FinancialSummaryCards | خلاصه مالی زنده |
| CoefficientMatrixEditor | ضرایب |
| AdjustmentFormulaPanel | فرمول و trace تعدیل |
| ImportValidationPanel | validation فایل تکسا |
| ExportValidationChecklist | چک خروجی تکسا |
| ExportDiffViewer | diff خروجی با raw |
| VersionHistoryTimeline | نسخه‌ها و برگشت‌ها |
| AuditDrawer | before/after و patch log |
| PersianNumberInput | عدد numeric با نمایش فارسی |
| JalaliDatePicker | تاریخ شمسی |

---

## APIهای اصلی

APIها باید action محور باشند، نه فقط CRUD خام.

نمونه‌ها:

```text
POST /api/imports
POST /api/imports/[importId]/validate
POST /api/imports/[importId]/approve-mapping

GET  /api/projects/[projectId]/documents
POST /api/projects/[projectId]/documents
GET  /api/documents/[documentId]
POST /api/documents/[documentId]/transitions/[transitionKey]

GET  /api/documents/[documentId]/measurement
POST /api/documents/[documentId]/measurement/lines
POST /api/documents/[documentId]/measurement/recalculate

GET  /api/documents/[documentId]/review
PATCH /api/documents/[documentId]/review/lines/[lineId]

POST /api/adjustments/[adjustmentRunId]/calculate

GET  /api/documents/[documentId]/export/check
POST /api/documents/[documentId]/export/svzt
GET  /api/exports/[exportJobId]/diff
```

---

## قانون مهم UI و round-trip

کاربر عادی نباید raw تکسا را ببیند. اما هرجا داده import شده، پشت صحنه باید این‌ها حفظ شود:

```text
raw_table_name
raw_row_order
raw_json
dirty_patch_json
taksa_type
taksa_nusv
taksa_situ
link_proj
nufh/nuse/cofh
```

نمایش کاربر تمیز است؛ export تکسا دقیق و محافظه‌کارانه.

---

## Gridهای اصلی

### DocumentItemsGrid

برای آیتم‌های فهرست‌بها / snapshot سند.

حساس برای round-trip:

```text
nufh
nuse
cofh
unit_price
row_order
```

### MeasurementGrid

برای ریزمتره.

حساس برای round-trip:

```text
formula raw
quantity numeric
link_mog
row_order
```

### ReviewDiffGrid

برای رسیدگی مشاور.

ستون‌ها:

```text
contractor_qty
consultant_qty
employer_qty
diff
status
comment
```

### FinancialStatementGrid

برای برگه مالی.

ستون‌های حیاتی:

```text
previous_qty
current_qty
total_qty
unit_price
current_amount
total_amount
```

### RawTableGrid

فقط برای پشتیبانی، نه کاربر عادی.

---

## Guardهای لازم

در هر صفحه باید این guardها اعمال شود:

```text
AuthGuard
ProjectMemberGuard
RoleGuard
WorkflowStateGuard
DocumentLockGuard
RoundtripAnchorGuard
```

یعنی حتی اگر UI دکمه را نشان ندهد، API هم باید همان permission و state را enforce کند.

---

## خروجی‌های این بخش

- `taksa_section11_route_map.csv`
- `taksa_section11_component_registry.csv`
- `taksa_section11_page_detail_specs.csv`
- `taksa_section11_navigation_map.csv`
- `taksa_section11_api_contracts.csv`
- `taksa_section11_state_to_route_map.csv`
- `taksa_section11_grid_specs.csv`

---

## نتیجه

بخش ۱۱ نقشه UI و routeهای نسخه وب را مشخص کرد.  
از اینجا به بعد طراحی موتور محاسبات باید دقیقاً با این صفحات و APIها هماهنگ شود:

```text
Measurement → Calculation → Review → Financial → Adjustment → Export Validation
```
