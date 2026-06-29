# بخش ۵ — تحلیل import/export و mapping تکسا به نسخه وب

## وضعیت
- [x] انجام شد

## فایل‌ها و منابع بررسی‌شده
- `DB/ScriptXML.sql`
- `taksa_section04_svzt_table_summary.csv`
- `taksa_section04_svzt_field_matrix.csv`
- `taksa_section04_scriptxml_vs_actual_svzt.csv`
- `taksa_section03_xml_import_tables.csv`
- `taksa_section03_table_columns.csv`
- `نمونه واقعی .svzt`

## هدف این بخش
هدف بخش ۵ این بود که روشن شود هر جدول خام تکسا هنگام import به کدام موجودیت وب تبدیل می‌شود، چه چیزهایی editable هستند، و هنگام export چگونه باید دوباره به فایل قابل‌برگشت برای تکسا تبدیل شوند.

## خلاصه عددی
- تعداد `OPENXML`/insertهای استخراج‌شده از `ScriptXML.sql`: `52`
- تعداد جدول/tag واقعی در فایل SVZT: `45`
- مقایسه actual با ScriptXML: `{'both_exact': 33, 'script_only': 18, 'actual_only': 11, 'both_case_diff': 1}`
- ردیف‌های `brv_type_situ` در نمونه: `33`
- نقش‌های پروژه در نمونه: `{'0': 'پیمانکار', '1': 'مشاور', '2': 'کارفرما'}`

## ترتیب import در ScriptXML
ScriptXML اول lookupهای پایه را import/dedupe می‌کند، بعد قرارداد و نقش‌ها و وضعیت‌ها، بعد کسورات/تعدیل/فهرست/ضرایب/منابع/آیتم‌ها/ریزمتره/برگه مالی/حمل را وارد می‌کند. این یعنی نسخه وب هم باید import مرحله‌ای داشته باشد و مستقیم به مدل نهایی ننویسد.

نمونه مسیر مراحل:

```text
base lookups → brv_contract → brv_type/brv_situ/brv_type_situ → deductions/adjustment → price list/coefficient tables → resources/items → measurement lines → reviewed work lines → financial lines → transport/distance tables
```

## هشدارهای مهم ScriptXML
دو مسیر در ScriptXML با فاصله قبل از نام tag دیده شد و یک مورد case mismatch دارد. برای export نباید کورکورانه از pathهای ScriptXML کپی کنیم؛ باید نام tag واقعی XML حفظ شود.

| target table | path in ScriptXML | stripped tag | warning |
|---|---|---|---|
| `brv_sorc_all` | `/NewDataSet/ brv_sorc_all` | `brv_sorc_all` | xml path has leading/trailing space |
| `brv_bgml` | `/NewDataSet/ brv_bgml` | `brv_bgml` | xml path has leading/trailing space |

مورد case-sensitive مهم:

- actual XML: `brv_Tadilkosorat`
- ScriptXML target/path: `brv_TadilKosorat`
- تصمیم: برای round-trip، tag ورودی باید دقیقاً حفظ شود.

## کلیدهای ارتباطی اصلی

| الگو | اشاره به | معنی | تصمیم وب |
|---|---|---|---|
| `*_link_proj` | `brv_contract.ctc_id` | Project/Contract anchor | تقریباً همه جدول‌های عملیاتی به پروژه وصل می‌شوند. در وب: internalProjectId جدا از taksaProjectId باشد. |
| `*_type` | `brv_type.typ_id` | Party/review side/version type | در نمونه: 0=پیمانکار، 1=مشاور، 2=کارفرما. روی نسخه و مقایسه اثر دارد. |
| `*_nusv` | `brv_situ.stu_id / brv_type_situ.tst_nusv` | Payment certificate/version number | شماره دوره/صورت‌وضعیت. همراه با type معنی پیدا می‌کند. |
| `tst_nusv_previous + tst_type_previous` | `brv_type_situ previous pointer` | Version chain | زنجیره نسخه‌ها و رسیدگی؛ برای workflow و rollback حیاتی است. |
| `*_nufh` | `price-list/package id` | Price list discipline/chapter group | برای اتصال فصل/رشته/فهرست‌بها به آیتم‌ها استفاده می‌شود. |
| `*_nuse + *_cofh` | `brv_fhbh item reference` | Price-list item / contract item | کلید آیتم فهرست‌بها در ریزمتره، کارکرد و برگه مالی. |
| `*_link_mog` | `brv_mogs.mog_id` | Measurement group/site minute relation | ردیف‌های ریزمتره و حمل به گروه/صورتجلسه متصل می‌شوند. |
| `*_link_grop` | `brv_grop.grp_id` | Grouping/transport group | برای حمل، گروه‌بندی و محدودیت‌ها مهم است. |
| `*_rad` | `display/order number` | Ordering | ترتیب چاپ/نمایش. در export نباید بی‌دلیل تغییر کند. |
| `*_link_sorclist` | `brv_sorc_all.src_id` | Resource master link | منابع/مصالح/دستمزدها به summary/resource master وصل می‌شوند. |
| `kmt_nagl_rzmt` | `brv_rzmt.rmt_id` | Review/work line imported from measurement | ردیف کارکرد از ریزمتره آمده؛ برای trace پیمانکار→مشاور مهم است. |
| `*_link_previous / *_type_previous` | `previous version/entity` | Cross-version trace | برای مقایسه دوره قبل و تغییرات مشاور/پیمانکار باید حفظ شود. |

## mapping خام به موجودیت‌های وب
جدول زیر هسته mapping را نشان می‌دهد. جزئیات کامل در CSV خروجی ثبت شده است.

| جدول تکسا | ردیف | موجودیت وب | معنی | کلید پیشنهادی |
|---|---:|---|---|---|
| `brv_contract` | 1 | `project_contract` | پروژه، قرارداد، تنظیمات محاسبات و گزارش | `ctc_id` |
| `brv_type` | 3 | `project_party_role` | نقش‌های پروژه: پیمانکار/مشاور/کارفرما | `typ_link_proj+typ_id` |
| `brv_situ` | 21 | `payment_period_number` | شماره‌های صورت‌وضعیت/دوره‌ها | `stu_link_proj+stu_id` |
| `brv_intp` | 7 | `adjustment_interpolation` | درون‌یابی/دوره شاخص برای تعدیل | `itp_link_proj+itp_type+itp_nusv+itp_rad` |
| `brv_kosorat` | 360 | `deduction` | کسورات اصلی صورت‌وضعیت | `ksr_link_proj+ksr_type+ksr_nusv+ksr_id` |
| `brv_ahta` | 781 | `adjustment_result_line` | آحاد/نتایج تعدیل فصلی/رشته‌ای | `ata_link_proj+ata_type+ata_nusv+ata_rad` |
| `brv_type_situ` | 33 | `payment_certificate_version` | نسخه/دوره صورت‌وضعیت برای هر نقش و وضعیت رسیدگی | `tst_link_proj+tst_type+tst_nusv` |
| `brv_fhpy` | 183 | `price_list_chapter_package` | خلاصه فصل‌ها/ضرایب فصل و تنظیمات فهرست | `fhp_link_proj+fhp_type+fhp_nusv+fhp_nufh` |
| `brv_mult` | 6705 | `coefficient_matrix` | ماتریس ضرایب فصل/ردیف/دوره | `mlt_link_proj+mlt_type+mlt_nusv+mlt_nufh+mlt_nuse` |
| `brv_mogs` | 954 | `measurement_group_or_site_minute` | گروه/صورتجلسه/منبع ریزمتره | `mog_link_proj+mog_type+mog_nusv+mog_id` |
| `brv_fhbh` | 5116 | `price_list_item_snapshot` | آیتم‌های فهرست‌بها/قرارداد در هر نسخه | `fbh_link_proj+fbh_type+fbh_nusv+fbh_nufh+fbh_nuse+fbh_cofh` |
| `brv_rzmt` | 8551 | `measurement_line` | ردیف‌های ریزمتره | `rmt_link_proj+rmt_type+rmt_nusv+rmt_id` |
| `brv_khmt` | 7726 | `reviewed_work_line` | کارکرد/خدمات منتقل‌شده از ریزمتره به رسیدگی | `kmt_link_proj+kmt_type+kmt_nusv+kmt_id` |
| `brv_bgml` | 2122 | `financial_statement_line` | برگه مالی/مبلغ ردیف‌های صورت‌وضعیت | `bgm_link_proj+bgm_type+bgm_nusv+bgm_id` |
| `brv_hmpy_rzmt` | 3382 | `transport_measurement_detail` | جزئیات حمل متصل به ریزمتره | `hmp_link_proj+hmp_type+hmp_nusv+hmp_link_mog+hmp_link_grop` |
| `brv_dstn_main_rzmt` | 28652 | `distance_measurement_summary` | فاصله حمل متصل به ریزمتره | `dsn_link_proj+dsn_type+dsn_nusv+dsn_link_mog+dsn_id` |
| `brv_sorc_all` | 155 | `resource_master_summary` | فهرست منابع/مصالح/دستمزدهای جمع‌بندی | `src_link_proj+src_type+src_nusv+src_id` |
| `brv_sorc` | 155 | `resource_price_or_assignment` | اتصال منابع به آیتم/دوره | `src_link_proj+src_type+src_nusv+src_link_sorclist+src_nufh` |
| `brv_nmmhb` | 155 | `resource_quantity_line` | مقادیر منابع/مصالح مرتبط با آیتم | `nmb_link_proj+nmb_type+nmb_nusv+nmb_link_sorclist` |
| `brv_Jobrankosoorat` | 186 | `wage_rank_deduction` | کسورات/افزودنی جبران/رتبه کار | `tkr_link_proj+tkr_type+tkr_nusv+tkr_id` |
| `brv_Arzkosoorat` | 186 | `currency_compensation_deduction` | کسورات/افزودنی جبران ارز | `tkr_link_proj+tkr_type+tkr_nusv+tkr_id` |
| `brv_Tadilkosorat` | 192 | `adjustment_deduction` | کسورات تعدیل | `Tkr_link_proj+Tkr_type+Tkr_nusv+Tkr_id` |

## نقشه import نسخه وب

1. **receive_file** — دریافت فایل .svzt و محاسبه size/sha256  
   - قاعده حیاتی: هیچ تغییری در فایل خام انجام نشود.
2. **parse_manifest** — خواندن NewDataSet، جدول‌ها، ترتیب rowها و fieldها  
   - قاعده حیاتی: table order و row ordinal ذخیره شود.
3. **raw_store** — ذخیره raw artifact + raw rows + unknown fields  
   - قاعده حیاتی: نام tagها case-sensitive ذخیره شود.
4. **schema_match** — مقایسه با ScriptXML و actual field matrix  
   - قاعده حیاتی: actual-only و script-only پذیرفته شوند.
5. **normalize_lookup** — نرمال‌سازی lookupها: واحد، نقش، نوع وضعیت، ماه، شاخص  
   - قاعده حیاتی: به rawRowId لینک شود.
6. **normalize_project** — ساخت Project/Contract از brv_contract  
   - قاعده حیاتی: taksaProjectId جدا از internal ID.
7. **normalize_workflow** — ساخت roles, periods, certificate versions از brv_type/brv_situ/brv_type_situ  
   - قاعده حیاتی: type+nusv کلید نسخه است.
8. **normalize_business_lines** — ساخت آیتم‌ها، ریزمتره، کارکرد، برگه مالی، ضرایب، کسورات  
   - قاعده حیاتی: هر record به raw row وصل بماند.
9. **validation** — اعتبارسنجی تعدادها، کلیدها، totals، referenceها  
   - قاعده حیاتی: خطاها report شوند؛ import نابودکننده نباشد.
10. **web_edit_patch** — هر تغییر وب به patch قابل ردیابی تبدیل شود  
   - قاعده حیاتی: raw را مستقیم overwrite نکنیم.
11. **export_merge** — patchها روی XML اصلی merge شوند  
   - قاعده حیاتی: unknown tables/fields همان‌طور برگردند.
12. **roundtrip_manifest** — ساخت گزارش export با counts/hash/changed rows  
   - قاعده حیاتی: برای تست re-import در تکسا استفاده شود.

## سیاست export / round-trip
نسخه وب باید exporter را به شکل merge layer بسازد، نه generator از صفر. یعنی خروجی از XML اصلی شروع می‌شود و patchهای مجاز روی آن اعمال می‌شوند.

```text
Original XML Tree
  + normalized changes / calculated patches
  + unknown table passthrough
  + unknown field passthrough
  + preserved order/case/format
  = Taksa-compatible export
```

## کنترل‌های ریسک export

| شناسه | ریسک | کنترل |
|---|---|---|
| `EXP-001` | Case-sensitive XML tags | export باید tag واقعی ورودی را حفظ کند؛ برای new export از canonical actual table name استفاده شود. |
| `EXP-002` | Whitespace typo in ScriptXML paths | از tagهای actual XML استفاده کنیم، نه path typo. |
| `EXP-003` | Actual-only tables | passthrough قطعی + mapping اختیاری. |
| `EXP-004` | Script-only tables | نباید در خروجی بی‌دلیل جدول خالی تولید شود؛ فقط اگر در raw یا patch وجود داشت. |
| `EXP-005` | Project ID remap in Taksa importer | internal ID وب جدا، taksa ctc_id و original ctc_id ذخیره شود. |
| `EXP-006` | Lock/password fields | حفظ بدون رمزگشایی/تغییر، مگر کاربر عمداً قفل وب را جدا مدیریت کند. |
| `EXP-007` | Numeric precision | Decimal/string-safe؛ تبدیل تومان فقط UI. |
| `EXP-008` | Boolean values | همان casing و format ورودی حفظ شود. |
| `EXP-009` | Ordering | row order و *_rad حفظ شود؛ insert جدید آخر همان table یا با rad کنترل‌شده. |
| `EXP-010` | No destructive recalculation | تا قبل از تکمیل engine، فقط patch کنترل‌شده؛ محاسبات حجمی بازنویسی نشوند. |

## نتیجه محصولی
برای نسخه وب، چهار لایه قطعی شد:

```text
1. Raw Taksa Artifact / Raw Tables
2. Mapping + Normalized Projection
3. Business Workflow + Calculation Engine
4. Export Merge / Round-trip Validator
```

هیچ صفحه وب نباید مستقیماً روی raw XML کار کند. UI فقط با مدل نرمال کار می‌کند، ولی هر رکورد نرمال باید `rawRowId` یا reference به ردیف تکسا داشته باشد تا export سالم بماند.

## خروجی‌های این بخش
- `taksa_section05_scriptxml_import_order.csv`
- `taksa_section05_actual_vs_scriptxml_mapping.csv`
- `taksa_section05_raw_to_web_entity_mapping.csv`
- `taksa_section05_key_relation_patterns.csv`
- `taksa_section05_import_export_pipeline.csv`
- `taksa_section05_roundtrip_risk_controls.csv`
- `taksa_section05_type_situ_periods.csv`
- `taksa_section05_table_type_nusv_distribution.csv`

## Definition of Done
- [x] ترتیب import از ScriptXML استخراج شد.
- [x] تفاوت actual XML و ScriptXML ثبت شد.
- [x] mapping جدول‌های واقعی به موجودیت‌های وب تعریف شد.
- [x] الگوهای کلید و رابطه مشخص شد.
- [x] pipeline import/export نسخه وب تعریف شد.
- [x] ریسک‌های round-trip و کنترل‌های لازم ثبت شد.

## بخش بعدی
بخش ۶ — تحلیل ماژول‌ها، فرم‌ها و اصطلاحات UI از `gws.ini`, `TAKSA.xml`, `tx_tips*.txt` و اتصال آن‌ها به workflow وب.