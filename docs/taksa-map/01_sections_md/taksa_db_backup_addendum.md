# بخش الحاقی — بررسی خروجی تحلیل Faragamara_Taksa.DB

## وضعیت

این بررسی قبل از ادامه بخش ۷ انجام شد تا اگر تحلیل دیتابیس اصلی یک‌گیگابایتی چیزی به نقشه قبلی اضافه می‌کند، اصلاح شود.

## ماهیت فایل

فایل `Faragamara_Taksa.DB` طبق گزارش محلی، یک فایل SQL Server backup-like با header نوع `TAPE` است، نه SQLite و نه یک دیتابیس قابل‌خواندن مستقیم بدون Restore. اندازه فایل: `1,026,639,360` بایت.

نکته: این پکیج، raw rows دیتابیس را ندارد؛ یک خروجی ساختاری/sanitized از backup است. بنابراین برای مقادیر واقعی جدول‌ها، هنوز Restore در SQL Server لازم است.

## تعداد آبجکت‌های SQL استخراج‌شده

بر اساس `metadata.json`:

| نوع آبجکت | تعداد entry |
|---|---:|
| Procedure | 143 |
| View | 63 |
| Function | 58 |
| Trigger | 11 |
| Table | 5 |

تعداد candidate table/object name شناسایی‌شده: `334`.

## اصلاح مهم نسبت به بخش ۳

بخش ۳ بر اساس اسکریپت‌های نصب و XML mapping بود. این فایل جدید نشان داد دیتابیس اصلی تکسا علاوه بر جدول‌های پروژه‌ای `brv_*`، یک لایه خیلی مهم‌تر از **مبانی فهرست‌بها و شاخص‌ها** دارد:

- `base_fhbh`
- `base_fsbs`
- `base_book`
- `base_sorc`
- `base_nmmhb`
- `base_shrs`, `base_shfs`, `base_shkl`
- `Base_ShakhesYerSeMahe`
- `base_unit_raw`
- `base_zrlc`
- `base_tatbigh`
- `base_fosi`

پس در نسخه وب، PDFهای فهرست‌بها کافی نیستند؛ باید یک **Reference Database / Price-list Knowledge Base** داشته باشیم.

## ماژول‌های جدید یا پررنگ‌شده

| ماژول | نتیجه |
|---|---|
| `base_*` | قلب فهرست‌بها، فصل‌ها، دفترچه، منابع، واحدها و شاخص‌ها |
| `brv_*` | پروژه، قرارداد، ریزمتره، برگه مالی، ضرایب، منابع و صورت‌وضعیت |
| `svz_importer` | مسیر ورود صورت‌وضعیت/SVZT |
| `psn_importer` | مسیر ورود پیشنهاد/پیمان |
| `brv_importer` | مسیر ورود برآورد/BRVT |
| `smn_*` | نظارت/صورت‌وضعیت ماهانه/نسخه‌های رسیدگی؛ قبلاً باید پررنگ‌تر شود |
| `dly_*` | تأخیرات و وضعیت‌های روزانه؛ باید در roadmap ثبت شود |
| `peik / pek_reports` | درخت گزارش‌ها و گروه‌بندی report center |
| `bhz_*` | ماژول خاص/بهای زیاد/نیازمند بررسی بیشتر |

## پروسیجرها و ویوهای حیاتی برای بازسازی منطق

### ایمپورت و سازگاری فایل‌ها

- `BRVIMPORT01_prepare`, `BRVIMPORT02_unit`, `BRVIMPORT05_add_ader`
- `SVZIMPORT01_prepare`, `SVZIMPORT02_unit`, `SVZIMPORT03_01_nusv`, `SVZIMPORT05_add_ader`
- `PSNIMPORT01_prepare`, `PSNIMPORT02_unit`, `PSNIMPORT05_add_ader`

تصمیم: بخش ۵ درست بود، ولی باید با این پروسیجرها تکمیل شود. Import در وب باید شامل prepare/unit/additional-row normalization باشد.

### تبدیل سال، فهرست‌بها و مبانی

- `Change_Year_in_project`
- `change_book_in_project`
- `change_book_zarib_name_in_project`
- `ChangeNufhCode`
- `copy_base_*`
- `CNV00_definitions` تا `CNV09_shkh_update_all`
- `UpdateYearCol_Taksa`, `UpdateYearCol_Mabna`, `UpdateYearCol_Biharz`

تصمیم: نسخه وب باید مفهوم «بروزرسانی مبانی/فهرست‌بها/سال پروژه» داشته باشد.

### ضرایب و ساختار پروژه‌ای

- `CreateBrvFhbh`
- `CreateBrvMult`
- `CreateBrvFhbhFk`
- `CreateBrvMultFk`
- `update_zarib_fhpy_mult`

تصمیم: موتور ضرایب در وب باید محصول جدا باشد، چون ترتیب ضرب ضرایب و variantهای پیمان/صورت‌وضعیت/پیشنهاد در SQL دیده می‌شود.

### قفل، نسخه و حذف امن

- `Fn_TypeIsLocked`
- `Fn_VersionNztIsLocked`
- `SpDeleteTypeSituDependencies`
- `type_situ_DELETE`
- `brv_contract_DELETE`
- `smn_contract_DELETE`

تصمیم: Workflow وب باید قفل سند، version lock، delete dependency و audit داشته باشد.

### ویوهای گزارش و محاسبه

- `viwSooratVaziat`
- `viwTadil`
- `viwTatbigh_Paykar`
- `viwTakhirat`
- `distance_view`
- `V_Shakhes*`
- `viwBase1400` تا `viwBase1404`

تصمیم: بخش ۲ باید با data source واقعی این ویوها تکمیل شود. RPT فقط اسم خروجی است؛ منبع محاسبه بخشی از همین views است.

## اصلاحات لازم در نقشه قبلی

1. بخش ۳ تیک باقی می‌ماند، اما یک addendum جدید به آن اضافه می‌شود: `DB Backup Object Map`.
2. بخش ۵ درست است، ولی import/export باید به پروسیجرهای `BRVIMPORT/SVZIMPORT/PSNIMPORT` وصل شود.
3. بخش ۶ درست است، ولی workflow باید `قفل نسخه`، `حذف وابسته` و `نظارت/ماهانه smn` را پررنگ‌تر کند.
4. بخش ۷ را متوقف نمی‌کنیم، اما بخش ۸ باید علاوه بر PDFها، از `base_*` و viewهای سالانه هم استفاده کند.
5. برای product roadmap، ماژول‌های `تأخیرات dly` و `نظارت/نسخه smn` باید به عنوان فاز بعدی ثبت شوند.

## نکته امنیتی

در گزارش محلی فایل‌هایی برای connection string/password detection وجود دارد. این اطلاعات نباید در ریپو یا سند عمومی commit شود. برای تحلیل ما فقط ساختار آبجکت‌ها لازم است، نه مقادیر connection string.

## تصمیم نهایی

ادامه مسیر منطقی این است:

1. همین addendum به بخش ۳ اضافه شود.
2. برای بخش ۷، Excelها را بررسی کنیم.
3. برای بخش ۸، قوانین را از سه منبع با هم تطبیق بدهیم: PDF + base tables/views + SQL procedures/functions.
4. قبل از پیاده‌سازی، اگر خواستیم محاسبات دقیق شود، باید از چند آبجکت حیاتی extract متمرکز بگیریم: `viwSooratVaziat`, `viwTadil`, `update_zarib_fhpy_mult`, `SVZIMPORT*`, `BRVIMPORT*`, `CreateBrvFhbh`, `CreateBrvMult`.
