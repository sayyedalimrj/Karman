# تصمیم‌نامه دیتابیس‌ها و منابع داده تکسا/وب

## خلاصه اجرایی

برای نسخه وب، دیتابیس اصلی محصول باید **PostgreSQL جدید** باشد.  
دیتابیس‌ها و فایل‌های تکسا نباید مستقیم runtime سامانه وب شوند؛ باید به عنوان **منبع استخراج، mapping، reference و golden test** استفاده شوند.

مدل درست:

```text
Taksa Sources
  ├── SQL scripts / DB backup / MDB / SVZT / Excel / RPT / PDF
  ↓
Extraction + Mapping + Validation
  ↓
Web PostgreSQL
  ├── app/workflow/business tables
  ├── taksa raw compatibility tables
  ├── reference data
  ├── calculation trace
  ├── reports/export jobs
  └── audit logs
```

---

## دیتابیس‌هایی که داریم و قابل استفاده‌اند

### 1. فایل‌های SQL داخل DB

```text
myscr.sql
ScriptConst.sql
ScriptXML.sql
prjAll.scp
prjPK.scp
prjFK.scp
prjSpDTDF.scp
```

کاربرد:

```text
schema understanding
relationships
import/export XML paths
constraints
stored procedure/function/trigger discovery
```

وضعیت: قابل استفاده برای تحلیل و تبدیل به مدل وب.  
اما مستقیم در PostgreSQL اجرا نمی‌شوند.

---

### 2. دیتابیس اصلی 1 گیگ Taksa

```text
Faragamara_Taksa.DB
```

وضعیت: فایل backup-like با header نوع TAPE است.  
برای استفاده کامل باید روی SQL Server restore شود یا با ابزار مناسب extract شود.

کاربرد مهم:

```text
base_* tables
V_Shakhes*
viwSooratVaziat
viwTadil
stored procedures
functions
triggers
reference data
business rules
```

این منبع برای Reference Database و Calculation Engine خیلی ارزشمند است.

هشدار امنیتی:

```text
taksa_passwords_found.*
readable_strings.txt
sql_objects.txt
```

این‌ها نباید وارد GitHub یا package عمومی شوند.

---

### 3. فایل‌های MDB

```text
SVZT.MDB
BRVT.MDB
PSNT.MDB
MSPSchema.mdb
```

کاربرد: template/reference برای file format و مسیرهای workflow.  
وضعیت: قابل استفاده تکمیلی، اما نه به عنوان دیتابیس runtime.  
برای استخراج دقیق‌تر نیاز به Access/ODBC/Windows tooling داریم.

---

### 4. فایل SVZT واقعی

این دیتابیس نیست، ولی از نظر round-trip بسیار مهم‌تر از خیلی از scriptهاست.

کاربرد:

```text
actual XML tag names
table order
row order
field presence
case-sensitive table names
golden import/export sample
```

---

### 5. Excel / RPT / PDF

این‌ها دیتابیس نیستند، اما برای اعتبارسنجی خروجی‌ها ضروری‌اند:

```text
Excel → ستون‌ها و numeric export
RPT → خانواده گزارش‌ها
PDF → قوانین رسمی
```

---

## دیتابیس‌هایی که باید بسازیم

### A. PostgreSQL اصلی سامانه وب

schemaهای پیشنهادی:

```text
app
taksa_raw
reference
workflow
calculation
reporting
audit
```

موجودیت‌های اصلی:

```text
Project
Contract
ProjectParty
CommercialDocument
PaymentPeriod
DocumentVersion
MeasurementLine
FinancialStatementLine
AdjustmentRun
TaksaArtifact
TaksaRawTable
TaksaRawRow
CalculationRun
CalculationTrace
ExportJob
AuditLog
```

---

### B. Reference Database

برای:

```text
فهرست‌بها
فصل‌ها
ردیف‌ها
واحدها
منابع
شاخص‌ها
ضرایب پایه
تطبیق سال‌ها
```

منابع تغذیه:

```text
Faragamara_Taksa.DB
base_* tables
PDFهای رسمی
Excel/Reports cross-check
```

---

### C. Object Storage

برای فایل‌های بزرگ:

```text
فایل اصلی SVZT
فایل‌های export شده
PDF/Excel خروجی
پیوست‌ها
golden fixtures
```

گزینه‌ها:

```text
S3
MinIO
local volume در MVP
```

---

### D. Golden Test Store

برای نگهداری:

```text
خروجی واقعی تکسا
خروجی وب
diff عددی
rounding evidence
validation reports
```

بدون این، فرمول‌های حساس نباید نهایی شوند.

---

## از کدام‌ها نمی‌شود مستقیم استفاده کرد؟

```text
Faragamara_Taksa.DB
```

مستقیم در وب قابل استفاده نیست؛ نیاز به restore/extract دارد.

```text
MDBها
```

برای runtime مناسب نیستند؛ فقط reference/template.

```text
DTSها
```

باینری/قدیمی‌اند؛ برای فهم flow خوب‌اند ولی engine وب نباید به آن‌ها وابسته باشد.

```text
EXE/DLL/OCX/SYS/Lock
```

نباید decompile یا استفاده مستقیم شوند.

```text
password/readable strings outputs
```

نباید وارد repo/package عمومی شوند.

---

## تصمیم نهایی

برای اجرای پروژه:

```text
1. PostgreSQL جدید = دیتابیس اصلی وب
2. taksa_raw schema = حفظ raw و round-trip
3. reference schema = فهرست‌بها/شاخص/منابع
4. object storage = فایل‌ها و خروجی‌ها
5. golden test fixtures = تطبیق با تکسا
6. SQL Server restored Taksa DB = منبع استخراج/تحقیق، نه runtime وب
```
