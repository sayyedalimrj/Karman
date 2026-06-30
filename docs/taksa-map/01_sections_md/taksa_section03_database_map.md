# بخش ۳ — تحلیل دیتابیس و روابط جدول‌ها

## وضعیت
- [x] تحلیل اسکریپت‌های دیتابیس انجام شد
- [ ] تحلیل خود فایل‌های MDB و دیتابیس اجرایی بزرگ در بخش بعدی/تکمیلی انجام می‌شود

## منابع بررسی‌شده
- `myscr.sql` — encoding: `utf-16` — size: 332,088 bytes
- `ScriptConst.sql` — encoding: `utf-16` — size: 141,940 bytes
- `ScriptXML.sql` — encoding: `utf-8-sig` — size: 77,298 bytes
- `prjAll.scp` — encoding: `utf-16` — size: 3,206 bytes
- `prjPK.scp` — encoding: `utf-16` — size: 3,206 bytes
- `prjFK.scp` — encoding: `utf-16` — size: 3,206 bytes
- `prjSpDTDF.scp` — encoding: `utf-16` — size: 3,206 bytes

## جمع‌بندی عددی
- جدول‌های ساخته‌شده در `myscr.sql`: **157**
- ستون‌های استخراج‌شده از CREATE TABLEها: **2795**
- Primary Keyهای استخراج‌شده: **72**
- Foreign Keyهای استخراج‌شده از `ScriptConst.sql`: **190**
- جدول‌هایی که در `SpProjectXMLToDB` از XML وارد می‌شوند: **52**
- دیتابیس‌های موقت/تبدیلی شناسایی‌شده در `myscr.sql`: `faragamara_taksa` (1), `brv_importer` (44), `psn_importer` (45), `svz_importer` (49), `taksa_temp` (18)

## نتیجه معماری
اسکریپت‌ها نشان می‌دهند تکسا برای تبدیل/ایمپورت فایل‌ها، دیتابیس‌های موقت جدا می‌سازد: `brv_importer` برای برآورد، `psn_importer` برای پیشنهاد/پیمان، `svz_importer` برای صورت‌وضعیت و `taksa_temp` برای پردازش موقت. بنابراین نسخه وب نباید فایل تکسا را مستقیم به مدل نهایی بریزد؛ باید یک لایه staging/raw داشته باشد و بعد از آن mapping به مدل نرمال وب انجام شود.

## خانواده جدول‌ها
| خانواده | تعداد CREATE TABLE | تعداد XML Import | برداشت اولیه |
|---|---:|---:|---|
| `secu` | 5 | 0 | نامشخص/نیازمند بررسی |
| `sorc` | 5 | 0 | منابع/جمع‌بندی |
| `fhbh` | 4 | 0 | فهرست‌بها/ردیف |
| `acti` | 3 | 0 | فعالیت/اکشن |
| `acts` | 3 | 0 | فعالیت‌ها/فهرست فعالیت |
| `ahta` | 3 | 0 | تعدیل/آحاد |
| `bgml` | 3 | 0 | برگه مالی |
| `bmac` | 3 | 0 | پایه/ماشین‌آلات? |
| `contract` | 3 | 0 | قرارداد/پروژه |
| `dstb` | 3 | 0 | حمل/فاصله |
| `dstn` | 3 | 0 | فاصله/حمل |
| `dstn2` | 3 | 0 | نامشخص/نیازمند بررسی |
| `dstn2c` | 3 | 0 | نامشخص/نیازمند بررسی |
| `fhpy` | 3 | 0 | فهرست پیمان/فصل‌بندی |
| `fspy` | 3 | 0 | فصل/صورتجلسه/پیشنهاد |
| `hmpy` | 3 | 0 | حمل/فاصله |
| `hsha` | 3 | 0 | شاخص/حساب? |
| `hshm` | 3 | 0 | شاخص/حساب? |
| `itac` | 3 | 0 | آیتم/فعالیت |
| `item` | 3 | 0 | آیتم‌ها |
| `khmt` | 3 | 0 | خدمات/کسورات/کارکرد مرتبط |
| `kmac` | 3 | 0 | پایه/ماشین‌آلات? |
| `mogs` | 3 | 0 | صورتجلسه/مقادیر |
| `mult` | 3 | 0 | ضرایب/چندگانه |
| `nmac` | 3 | 0 | پایه/ماشین‌آلات? |
| `nmmh` | 3 | 0 | منابع/مصالح/حمل |
| `nots` | 3 | 0 | یادداشت‌ها |
| `ntac` | 3 | 0 | نامشخص/نیازمند بررسی |
| `pjsz` | 3 | 0 | پروژه/سازمان |
| `rplc` | 3 | 0 | جایگزینی/رابطه |

## جدول‌های محوری رابطه‌ای
| جدول | FK child | FK parent | برداشت |
|---|---:|---:|---|
| `brv_type` | 2 | 16 | پروژه/برآورد/صورت‌وضعیت Taksa |
| `brv_situ` | 1 | 16 | پروژه/برآورد/صورت‌وضعیت Taksa |
| `brv_acts` | 3 | 9 | پروژه/برآورد/صورت‌وضعیت Taksa |
| `brv_fhbh` | 3 | 8 | پروژه/برآورد/صورت‌وضعیت Taksa |
| `base_fhbh` | 3 | 6 | داده پایه/کدینگ مشترک |
| `atm_Detail_Parts` | 3 | 5 | نامشخص/نیازمند بررسی |
| `base_book` | 2 | 5 | داده پایه/کدینگ مشترک |
| `base_unit` | 0 | 6 | داده پایه/کدینگ مشترک |
| `brv_fhpy` | 2 | 4 | پروژه/برآورد/صورت‌وضعیت Taksa |
| `brv_mogs` | 2 | 4 | پروژه/برآورد/صورت‌وضعیت Taksa |
| `Pek_detail_property` | 5 | 0 | پایگاه فهرست/پیمان/مدیریت پایه |
| `brv_contract` | 0 | 5 | پروژه/برآورد/صورت‌وضعیت Taksa |
| `brv_grop` | 1 | 4 | پروژه/برآورد/صورت‌وضعیت Taksa |
| `brv_intp` | 4 | 1 | پروژه/برآورد/صورت‌وضعیت Taksa |
| `brv_sorc_all` | 3 | 2 | پروژه/برآورد/صورت‌وضعیت Taksa |
| `Pek_Ostan` | 0 | 4 | پایگاه فهرست/پیمان/مدیریت پایه |
| `atm_Detail_Parts_Project` | 2 | 2 | نامشخص/نیازمند بررسی |
| `base_grop` | 2 | 2 | داده پایه/کدینگ مشترک |
| `base_pvst` | 0 | 4 | داده پایه/کدینگ مشترک |
| `base_year` | 1 | 3 | داده پایه/کدینگ مشترک |
| `brv_Packages_Reports` | 3 | 1 | پروژه/برآورد/صورت‌وضعیت Taksa |
| `brv_dstb` | 2 | 2 | پروژه/برآورد/صورت‌وضعیت Taksa |
| `brv_hmbs` | 2 | 2 | پروژه/برآورد/صورت‌وضعیت Taksa |
| `brv_mult` | 2 | 2 | پروژه/برآورد/صورت‌وضعیت Taksa |
| `brv_sorc` | 2 | 2 | پروژه/برآورد/صورت‌وضعیت Taksa |

## جدول‌های اصلی ورودی XML
این جدول‌ها در `SpProjectXMLToDB` مستقیماً از `/NewDataSet/...` خوانده می‌شوند و برای import فایل‌های پروژه/صورت‌وضعیت حیاتی‌اند.

| جدول | مسیر XML | تعداد ستون | برداشت |
|---|---|---:|---|
| `base_unit` | `/NewDataSet/base_unit` | 1 | داده پایه/کدینگ مشترک |
| `base_tyun` | `/NewDataSet/base_tyun` | 2 | داده پایه/کدینگ مشترک |
| `base_zrtj` | `/NewDataSet/base_zrtj` | 1 | داده پایه/کدینگ مشترک |
| `base_acts_unit` | `/NewDataSet/base_acts_unit` | 1 | داده پایه/کدینگ مشترک |
| `brv_contract` | `/NewDataSet/brv_contract` | 171 | پروژه/برآورد/صورت‌وضعیت Taksa |
| `brv_report_history` | `/NewDataSet/brv_report_history` | 4 | پروژه/برآورد/صورت‌وضعیت Taksa |
| `brv_type` | `/NewDataSet/brv_type` | 10 | پروژه/برآورد/صورت‌وضعیت Taksa |
| `brv_situ` | `/NewDataSet/brv_situ` | 4 | پروژه/برآورد/صورت‌وضعیت Taksa |
| `brv_elhagh` | `/NewDataSet/brv_elhagh` | 8 | پروژه/برآورد/صورت‌وضعیت Taksa |
| `brv_takhir_ve` | `/NewDataSet/brv_takhir_ve` | 6 | پروژه/برآورد/صورت‌وضعیت Taksa |
| `brv_takhir_svz` | `/NewDataSet/brv_takhir_svz` | 17 | پروژه/برآورد/صورت‌وضعیت Taksa |
| `brv_type_situ` | `/NewDataSet/brv_type_situ` | 49 | پروژه/برآورد/صورت‌وضعیت Taksa |
| `brv_type` | `/NewDataSet/brv_TadilKosorat` | 6 | پروژه/برآورد/صورت‌وضعیت Taksa |
| `brv_kosorat` | `/NewDataSet/brv_kosorat` | 9 | پروژه/برآورد/صورت‌وضعیت Taksa |
| `brv_ovtj` | `/NewDataSet/brv_ovtj` | 11 | پروژه/برآورد/صورت‌وضعیت Taksa |
| `brv_ovpr` | `/NewDataSet/brv_ovpr` | 11 | پروژه/برآورد/صورت‌وضعیت Taksa |
| `brv_ovma` | `/NewDataSet/brv_ovma` | 18 | پروژه/برآورد/صورت‌وضعیت Taksa |
| `brv_ovhd` | `/NewDataSet/brv_ovhd` | 9 | پروژه/برآورد/صورت‌وضعیت Taksa |
| `brv_intp` | `/NewDataSet/brv_intp` | 16 | پروژه/برآورد/صورت‌وضعیت Taksa |
| `brv_fhpy` | `/NewDataSet/brv_fhpy` | 322 | پروژه/برآورد/صورت‌وضعیت Taksa |
| `brv_documents` | `/NewDataSet/brv_documents` | 8 | پروژه/برآورد/صورت‌وضعیت Taksa |
| `brv_fspy` | `/NewDataSet/brv_fspy` | 29 | پروژه/برآورد/صورت‌وضعیت Taksa |
| `brv_zrtb` | `/NewDataSet/brv_zrtb` | 10 | پروژه/برآورد/صورت‌وضعیت Taksa |
| `brv_tonl` | `/NewDataSet/brv_tonl` | 8 | پروژه/برآورد/صورت‌وضعیت Taksa |
| `brv_acts` | `/NewDataSet/brv_acts` | 39 | پروژه/برآورد/صورت‌وضعیت Taksa |
| `brv_ahta` | `/NewDataSet/brv_ahta` | 39 | پروژه/برآورد/صورت‌وضعیت Taksa |
| `brv_mult` | `/NewDataSet/brv_mult` | 295 | پروژه/برآورد/صورت‌وضعیت Taksa |
| `brv_fhpy_Acts` | `/NewDataSet/brv_fhpy_Acts` | 187 | پروژه/برآورد/صورت‌وضعیت Taksa |
| `brv_sorc_all` | `/NewDataSet/ brv_sorc_all` | 19 | پروژه/برآورد/صورت‌وضعیت Taksa |
| `brv_mult_acts` | `/NewDataSet/brv_mult_acts` | 171 | پروژه/برآورد/صورت‌وضعیت Taksa |
| `brv_acts_items` | `/NewDataSet/brv_acts_items` | 9 | پروژه/برآورد/صورت‌وضعیت Taksa |
| `brv_Prodecessors` | `/NewDataSet/brv_Prodecessors` | 6 | پروژه/برآورد/صورت‌وضعیت Taksa |
| `brv_sorc_price` | `/NewDataSet/brv_sorc_price` | 15 | پروژه/برآورد/صورت‌وضعیت Taksa |
| `brv_sorc` | `/NewDataSet/brv_sorc` | 46 | پروژه/برآورد/صورت‌وضعیت Taksa |
| `brv_fhbh` | `/NewDataSet/brv_fhbh` | 37 | پروژه/برآورد/صورت‌وضعیت Taksa |
| `brv_mogs` | `/NewDataSet/brv_mogs` | 24 | پروژه/برآورد/صورت‌وضعیت Taksa |
| `brv_grop` | `/NewDataSet/brv_grop` | 7 | پروژه/برآورد/صورت‌وضعیت Taksa |
| `brv_nmmhb` | `/NewDataSet/brv_nmmhb` | 15 | پروژه/برآورد/صورت‌وضعیت Taksa |
| `brv_sorc_acts` | `/NewDataSet/brv_sorc_acts` | 41 | پروژه/برآورد/صورت‌وضعیت Taksa |
| `brv_tatbigh` | `/NewDataSet/brv_tatbigh` | 10 | پروژه/برآورد/صورت‌وضعیت Taksa |
| `brv_bgml` | `/NewDataSet/ brv_bgml` | 53 | پروژه/برآورد/صورت‌وضعیت Taksa |
| `brv_khmt` | `/NewDataSet/brv_khmt` | 29 | پروژه/برآورد/صورت‌وضعیت Taksa |
| `brv_ader` | `/NewDataSet/brv_ader` | 13 | پروژه/برآورد/صورت‌وضعیت Taksa |
| `brv_rzmt` | `/NewDataSet/brv_rzmt` | 58 | پروژه/برآورد/صورت‌وضعیت Taksa |
| `brv_hmbs` | `/NewDataSet/brv_hmbs` | 19 | پروژه/برآورد/صورت‌وضعیت Taksa |
| `brv_dstn_main` | `/NewDataSet/brv_dstn_main` | 10 | پروژه/برآورد/صورت‌وضعیت Taksa |
| `brv_dstn_main_rzmt` | `/NewDataSet/brv_dstn_main_rzmt` | 11 | پروژه/برآورد/صورت‌وضعیت Taksa |
| `brv_dstb` | `/NewDataSet/brv_dstb` | 16 | پروژه/برآورد/صورت‌وضعیت Taksa |
| `brv_hmpy` | `/NewDataSet/brv_hmpy` | 11 | پروژه/برآورد/صورت‌وضعیت Taksa |
| `brv_hmpy_rzmt` | `/NewDataSet/brv_hmpy_rzmt` | 12 | پروژه/برآورد/صورت‌وضعیت Taksa |
| `brv_dstn_fromto` | `/NewDataSet/brv_dstn_fromto` | 18 | پروژه/برآورد/صورت‌وضعیت Taksa |
| `brv_dstn_fromto_rzmt` | `/NewDataSet/brv_dstn_fromto_rzmt` | 19 | پروژه/برآورد/صورت‌وضعیت Taksa |

## نقش فایل‌های SCP
فایل‌های `.scp` خودشان schema نیستند؛ پروژه تنظیمات ابزار MS SQL Database Comparer هستند. نقششان این است که مشخص کنند در مقایسه/تولید اسکریپت کدام نوع آبجکت‌ها فعال بوده‌اند.

| فایل | برداشت |
|---|---|
| `prjPK.scp` | تمرکز روی جدول‌ها، فیلدها، ایندکس‌ها، Primary Key و Checkها؛ FK/Trigger/View/Procedure خاموش است. |
| `prjFK.scp` | انتظار می‌رود برای مقایسه Foreign Keyها استفاده شده باشد؛ منبع واقعی FKها در پکیج فعلی `ScriptConst.sql` است. |
| `prjAll.scp` | تنظیمات کلی مقایسه کامل دیتابیس. |
| `prjSpDTDF.scp` | مربوط به SP/Default/Trigger/UDF یا بخش‌های تکمیلی مقایسه؛ خود فایل فقط تنظیمات دارد. |

## برداشت‌های محصولی برای نسخه وب
1. **لایه staging ضروری است.** جدول‌های importer کوتاه‌نام مثل `bgml`, `rzmt`, `fhbh`, `acts`, `seas`, `sorc`, `zrib` باید ابتدا خام نگهداری شوند.
2. **هسته پروژه در `brv_contract` و جدول‌های `brv_type`, `brv_situ`, `brv_type_situ` دیده می‌شود.** این‌ها برای Project/Contract/Role/Statement lifecycle در وب مهم‌اند.
3. **صورت‌وضعیت و برآورد از خانواده‌های مشترک استفاده می‌کنند.** نام‌های مشترک `bgml`, `seas`, `note`, `rzmt`, `fhbh`, `sorc` در گزارش‌ها و جدول‌ها دیده می‌شود؛ پس باید مدل وب مشترک با context نوع سند داشته باشیم.
4. **XML Import جدول‌های زیادی را با `@Project_ID` بازنویسی می‌کند.** یعنی فایل تکسا پروژه‌محور است و هنگام ورود به دیتابیس مقصد، شناسه پروژه جدید به بسیاری از رکوردها تزریق می‌شود.
5. **روابط رسمی در `ScriptConst.sql` بیشتر روی جدول‌های پایه `Pek/Pym/Pyr` و جدول‌های `brv_*` است.** بنابراین برای ساخت مدل وب باید هم master data و هم project transaction جدا شود.

## خروجی‌های این بخش
- `taksa_section03_table_schema_summary.csv`
- `taksa_section03_table_columns.csv`
- `taksa_section03_primary_keys.csv`
- `taksa_section03_foreign_keys.csv`
- `taksa_section03_xml_import_tables.csv`
- `taksa_section03_table_family_summary.csv`
- `taksa_section03_relation_hubs.csv`
- `taksa_section03_scp_comparer_options.csv`

## ابهام‌های باقی‌مانده
- معنی قطعی بعضی اختصارها مثل `sorc`, `khmt`, `khtd`, `mhjo/mhtd` فقط با ترکیب گزارش‌ها، MDBها و نمونه خروجی قطعی می‌شود.
- اسکریپت‌های SQL ساختار را می‌دهند، ولی فرمول‌های محاسباتی کامل احتمالاً در stored procedureهای اجرایی، RPTها، یا خود برنامه هستند؛ باید با PDFها و فایل نمونه `.svzt` تطبیق داده شود.
- فایل‌های MDB در بخش بعدی باید از نظر schema و نمونه داده بررسی شوند تا تفاوت BRVT/PSNT/SVZT دقیق شود.