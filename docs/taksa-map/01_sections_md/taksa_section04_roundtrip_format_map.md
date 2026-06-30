# بخش ۴ — تحلیل فرمت‌های SVZT / BRVT / PSNT و الزامات Round-trip

## وضعیت
- [x] انجام شد

## فایل‌های بررسی‌شده
- `اجراي_سازه_ساختمان_پاركينگ_شرقي_پروژه_مجموعه_آموزشي_و_فناوري_خاتم.svzt`
- `Main/SVZT.MDB`
- `Main/BRVT.MDB`
- `Main/PSNT.MDB`
- `Main/svz_importer.dts`
- `Main/brv_importer.dts`
- `Main/psn_importer.dts`
- `DB/ScriptXML.sql`
- `taksa_section03_xml_import_tables.csv`

## نتیجه قطعی درباره فایل نمونه SVZT
- فایل نمونه `.svzt` یک XML مستقیم با root برابر `NewDataSet` است.
- ساختار فایل به شکل تکرار table-row است: هر direct child زیر `NewDataSet` یک ردیف از یک جدول است و نام tag همان نام جدول/دسته داده است.
- اندازه فایل: `74,032,215` بایت
- SHA256: `1976dbb3f237d0ac855f4598ff939b44723adc7acd0fe96571ea45767d2b492a`
- تعداد table/tag یکتا در فایل واقعی: `45`
- تعداد کل rowهای XML: `78,988`

## جدول‌های بزرگ و محوری در فایل نمونه

| جدول | ردیف | تعداد فیلد | نقش احتمالی در نسخه وب |
|---|---:|---:|---|
| `brv_dstn_main_rzmt` | 28,652 | 11 | حمل/فاصله |
| `brv_rzmt` | 8,551 | 37 | ریزمتره |
| `brv_khmt` | 7,726 | 22 | کارکرد/خدمات |
| `brv_mult` | 6,705 | 198 | ضرایب |
| `brv_fhbh` | 5,116 | 29 | فهرست‌بها/فصل‌بندی |
| `brv_ader` | 4,411 | 12 | آیتم/افزوده/ردیف‌های مرتبط |
| `brv_hmpy_rzmt` | 3,382 | 12 | حمل/فاصله/همپایگی |
| `brv_bgml` | 2,122 | 32 | برگه مالی |
| `brv_grop` | 1,830 | 10 | گروه‌بندی |
| `base_unit` | 1,802 | 3 | داده پایه/کدینگ/ثابت‌ها |
| `brv_dstb` | 1,297 | 16 | حمل/فاصله |
| `BaseBarcode` | 1,000 | 5 | داده پایه/کدینگ/ثابت‌ها |
| `brv_dstn_main` | 960 | 10 | حمل/فاصله |
| `brv_mogs` | 954 | 14 | مقادیر/محاسبات |
| `brv_ahta` | 781 | 46 | آحاد/تعدیل |
| `brv_hmbs` | 757 | 18 | همبستگی/محاسبات |
| `brv_hmpy` | 711 | 11 | حمل/فاصله/همپایگی |
| `brv_kosorat` | 360 | 10 | کسورات |

## نکته مهم درباره تفاوت ScriptXML و فایل واقعی
در ScriptXML تعداد جدول‌های import با فایل واقعی دقیقاً یکی نیست. بخشی از جدول‌های واقعی مثل `BaseSituNoe`, `BaseBarcode`, `base_PersonalityTyp`, `brv_Tadilkosorat`, `brv_Arzkosoorat` و `brv_Jobrankosoorat` در فایل actual به شکل مستقیم دیده شدند، اما در لیست ScriptXML بخش ۳ به همان نام نیامده‌اند. برعکس، چند جدول ScriptXML در این نمونه داده ندارند. نتیجه: importer نسخه وب باید table-driven و tolerant باشد، نه hard-coded محدود به ۵۲ جدول ScriptXML.

## نتیجه درباره MDBها و DTSها
- فایل‌های `SVZT.MDB`, `BRVT.MDB`, `PSNT.MDB` و importerهای `.dts` از نوع binary/Access/Composite هستند و نباید در مسیر وب مستقیماً وابسته به اجرای آن‌ها شویم.
- کاربرد آن‌ها برای ما «الگوی schema/importer» است؛ اما منبع قطعی round-trip فعلاً فایل XML واقعی `.svzt` و ScriptXML است.
- برای تحلیل عمیق MDB/DTS در ویندوز می‌توان بعداً با Access/mdbtools/SQL Server DTS آن‌ها را inspect کرد، ولی برای طراحی نسخه وب، فعلاً مسیر امن این است: XML raw import + normalized projection + XML export.

## تصمیم معماری برای سازگاری با تکسا

```text
Taksa .svzt XML
    ↓
Raw XML Artifact + SHA256 + table/row manifest
    ↓
Raw Taksa Tables / JSON rows, case-sensitive
    ↓
Mapping Layer
    ↓
Web Business Model
    ↓
Calculation / Workflow / Reports
    ↓
Export Merge Layer
    ↓
Taksa-compatible .svzt XML
```

## الزامات Round-trip
برای اینکه اگر لازم شد فایل را دوباره داخل نرم‌افزار تکسا ببریم، نسخه وب باید این قواعد را رعایت کند:

- **RT-001 — Raw XML preservation:** فایل ورودی باید به عنوان raw artifact با SHA256، اندازه، نام، زمان import و نسخه parser ذخیره شود.
- **RT-002 — Table order preservation:** ترتیب direct child table elements داخل NewDataSet باید ذخیره شود.
- **RT-003 — Case-sensitive table names:** نام table/tag دقیقاً با حروف فعلی حفظ شود؛ مثل brv_Tadilkosorat و BaseBarcode.
- **RT-004 — Unknown table passthrough:** جدول‌هایی که هنوز map نشده‌اند نباید حذف شوند؛ باید raw passthrough شوند.
- **RT-005 — Unknown field passthrough:** فیلدهای ناشناخته هر row باید حفظ شوند و هنگام export برگردند.
- **RT-006 — Raw + normalized separation:** داده خام با مدل نرمال وب یکی نشود؛ مدل وب یک projection از raw باشد.
- **RT-007 — Empty/missing/null policy:** فرق بین نبودن tag، tag خالی و مقدار صفر/false حفظ شود.
- **RT-008 — Persian UTF-8 safety:** encoding خروجی UTF-8 با اعلان XML و standalone=yes تولید شود.
- **RT-009 — Numeric formatting:** عددها با فرمت سازگار تکسا ذخیره شوند؛ تبدیل تومان/ریال فقط در UI باشد.
- **RT-010 — Boolean formatting:** booleanها به شکل true/false مشابه ورودی صادر شوند مگر برای فیلدهای 0/1.
- **RT-011 — No destructive recalculation:** تا قبل از تایید کاربر، export نباید همه مبالغ را از نو جایگزین کند؛ فقط تغییرات کنترل‌شده merge شوند.
- **RT-012 — Validation manifest:** همراه export یک manifest از row counts، table counts، هش فایل و تغییرات تولید شود.

## خروجی‌های این بخش
- `taksa_section04_svzt_table_summary.csv`
- `taksa_section04_svzt_field_matrix.csv`
- `taksa_section04_scriptxml_vs_actual_svzt.csv`
- `taksa_section04_svzt_web_family_map.csv`
- `taksa_section04_binary_template_inventory.csv`
- `taksa_section04_roundtrip_requirements.csv`

## Definition of Done
- [x] ساختار واقعی فایل SVZT شناسایی شد.
- [x] جدول‌ها، تعداد ردیف‌ها و fieldها استخراج شد.
- [x] تفاوت ScriptXML و actual SVZT ثبت شد.
- [x] نقش MDB/DTS در معماری مشخص شد.
- [x] الزامات export/re-import ثبت شد.
- [x] تصمیم معماری raw + normalized + export merge ثبت شد.