# Taksa Web Reconstruction Tracker

## وضعیت کلی
- [x] 0. دریافت و چیدمان پارت‌های فایل‌ها
- [x] 1. کنترل موجودی منابع و اولویت‌بندی فایل‌ها
- [x] 2. تحلیل گزارش‌ها و خروجی‌ها
- [x] 3. تحلیل دیتابیس و روابط جدول‌ها
- [x] 4. تحلیل فرمت‌های SVZT / BRVT / PSNT
- [x] 5. تحلیل import/export و mapping
- [x] 6. تحلیل ماژول‌ها، فرم‌ها و اصطلاحات UI
- [x] 7. تحلیل قالب‌های Excel و خروجی‌های قابل چاپ
- [x] 8. تحلیل قوانین فهرست‌بها، شاخص، تعدیل، ضرایب و کسورات
- [x] 9. طراحی نقشه موجودیت‌های نسخه وب
- [x] 10. طراحی workflow نقش‌ها و کارتابل‌ها
- [x] 11. طراحی صفحات React/Next
- [x] 12. طراحی موتور محاسبات و تست تطبیق با تکسا
- [x] 13. نقشه پیاده‌سازی مرحله‌ای

## بخش 0 - دریافت و چیدمان پارت‌ها
وضعیت: انجام شد.

منابع دریافت‌شده:
- part1.zip
- pdfs_selected.p1.zip
- pdfs_selected.p2.zip

ساختار ترکیب‌شده:
- DB
- Main
- Main_Docs_Selected
- Help
- root_files
- pdfs_selected
- _inventory

یادداشت:
این بخش فقط آماده‌سازی محیط تحقیق است و هنوز به معنی تحلیل قوانین یا workflow نیست.

## بخش 1 - کنترل موجودی منابع
وضعیت: انجام شد.

هدف:
تشخیص اینکه از هر فایل دقیقاً برای چه بخشی از بازسازی نسخه وب استفاده می‌کنیم.

ورودی‌ها:
- _inventory/files_inventory.csv
- _inventory/tree_full.txt
- _inventory/Reports_RPT_only.csv
- _inventory/pdfs_file_list.txt
- _inventory/Main_Docs_file_list.txt

خروجی مورد انتظار:
- Source Inventory
- اولویت‌بندی فایل‌ها
- حذف فایل‌های کم‌ارزش یا خطرناک از مسیر تحلیل
- جدول «فایل → کاربرد در محصول وب»

وضعیت:
- [x] انجام شد

## بخش 2 - گزارش‌ها و خروجی‌ها
وضعیت: انجام شد.

هدف:
فهم خروجی‌هایی که تکسا تولید می‌کند و تبدیل آن‌ها به خروجی PDF/Excel/Print در نسخه وب.

وضعیت:
- [ ] شروع نشده

یادداشت بخش 2:
- 1606 گزارش RPT بررسی شد.
- خانواده‌های اصلی sv/ps/br/bs و tokenهای bgml/seas/note/sorc/pymn/ana/rzmt/tdil/zrib/fhbh/shkh/dist استخراج شد.
- خروجی‌های MVP وب مشخص شد.

## بخش 3 - دیتابیس و روابط
هدف:
استخراج جدول‌ها، کلیدها، ارتباطات، ثابت‌ها و قوانین ذخیره‌سازی.

وضعیت:
- [x] انجام شد

خروجی‌ها:
- taksa_section03_database_map.md
- taksa_section03_table_schema_summary.csv
- taksa_section03_table_columns.csv
- taksa_section03_primary_keys.csv
- taksa_section03_foreign_keys.csv
- taksa_section03_xml_import_tables.csv

## بخش 4 - فرمت فایل‌های تکسا
هدف:
فهم SVZT / BRVT / PSNT و نحوه import/export.

وضعیت:
- [ ] شروع نشده

## بخش 5 - ماژول‌ها و workflow
هدف:
فهم مسیر واقعی کاربر از تعریف پروژه تا صورت‌وضعیت، رسیدگی، تأیید، تعدیل و گزارش.

وضعیت:
- [ ] شروع نشده

## بخش 6 - قوانین محاسباتی
هدف:
فهم قوانین مبلغ، مقدار، ضریب، کسورات، تعدیل، شاخص، مصالح پایکار، حمل و گرد کردن.

وضعیت:
- [ ] شروع نشده

## بخش 7 - نقشه محصول وب
هدف:
تبدیل تکسا به نسخه وب تمیز، نه کپی خام جدول‌ها.

وضعیت:
- [ ] شروع نشده


## ثبت نتیجه بخش 1
فایل خروجی: taksa_section01_source_inventory.md

خلاصه:
- inventory کامل خوانده شد.
- منابع بر اساس کاربرد در نسخه وب دسته‌بندی شدند.
- DB، MDB، DTS، GWS، Tips، Reports و PDFs اولویت‌بندی شدند.
- منابع ممنوع/غیرضروری برای ریپو مشخص شدند.
- بخش بعدی: تحلیل گزارش‌ها و خروجی‌ها از Reports_RPT_only.csv.


## بخش ۴ - تحلیل فرمت‌های SVZT / BRVT / PSNT و Round-trip
وضعیت: انجام شد.

یافته‌ها:
- فایل نمونه SVZT یک XML با root `NewDataSet` است.
- هر direct child زیر `NewDataSet` یک row از یک table/tag است.
- در فایل نمونه 45 جدول/tag و 78,988 ردیف XML پیدا شد.
- برای سازگاری با تکسا باید raw XML و ترتیب table/row/field حفظ شود.
- مدل وب باید projection نرمال‌شده از raw باشد، نه جایگزین raw.
- export باید از لایه merge روی raw تولید شود تا فایل دوباره داخل تکسا قابل استفاده باشد.

خروجی‌ها:
- taksa_section04_roundtrip_format_map.md
- taksa_section04_svzt_table_summary.csv
- taksa_section04_svzt_field_matrix.csv
- taksa_section04_scriptxml_vs_actual_svzt.csv
- taksa_section04_roundtrip_requirements.csv


## بخش ۵ - تحلیل import/export و mapping
وضعیت: انجام شد.

یافته‌ها:
- 52 مسیر OPENXML از ScriptXML استخراج شد.
- 45 جدول واقعی از SVZT با mapping به موجودیت‌های وب ثبت شد.
- ارتباط‌های اصلی link_proj، type، nusv، nufh/nuse/cofh، link_mog، link_grop و rad مشخص شد.
- export باید merge روی XML خام باشد، نه تولید از صفر.
- برای برگشت به تکسا باید case، ترتیب، unknown table/field، فرمت عددی/boolean و row order حفظ شود.

خروجی‌ها:
- taksa_section05_import_export_mapping.md
- taksa_section05_scriptxml_import_order.csv
- taksa_section05_actual_vs_scriptxml_mapping.csv
- taksa_section05_raw_to_web_entity_mapping.csv
- taksa_section05_key_relation_patterns.csv
- taksa_section05_import_export_pipeline.csv
- taksa_section05_roundtrip_risk_controls.csv


## بخش ۶ - تحلیل ماژول‌ها، فرم‌ها و اصطلاحات UI
وضعیت: انجام شد.

منابع:
- Main/gws.ini
- Main/TAKSA.xml
- Main/tx_tips.txt
- Main/tx_tips_psn.txt
- Main/tx_tips_svz.txt

خلاصه:
- 209 Grid/فرم جدولی یکتا
- 1987 ستون UI
- 173 نکته/قابلیت از tips
- تصمیم UX: حفظ منطق تکسا، اما تبدیل UI به کارتابل، Wizard، Review Desk، مرکز گزارش‌ها و پنل سازگاری تکسا.


## بخش ۳.۱ - الحاقیه بررسی Faragamara_Taksa.DB
وضعیت: انجام شد.

منبع:
- Faragamara_Taksa.DB_analyse.zip

یافته‌ها:
- فایل اصلی یک SQL Server backup-like با header نوع TAPE و حجم حدود 1.026GB است.
- 280 entry آبجکت SQL استخراج شده: 143 Procedure، 63 View، 58 Function، 11 Trigger، 5 Table.
- 334 candidate table/object name شناسایی شد.
- لایه base_* شامل فهرست‌بها، فصل‌ها، دفترچه، منابع، واحدها و شاخص‌ها بسیار مهم‌تر از چیزی است که فقط از SVZT دیده می‌شد.
- پروسیجرهای BRVIMPORT/SVZIMPORT/PSNIMPORT، CNV*، copy_base_*، Change_Year_in_project، CreateBrvFhbh/CreateBrvMult و update_zarib_fhpy_mult باید در تحلیل قوانین و import/export لحاظ شوند.
- ویوهای viwSooratVaziat، viwTadil، viwTatbigh_Paykar، viwTakhirat، distance_view و V_Shakhes* برای گزارش و محاسبات حیاتی‌اند.
- فایل‌های connection/password detection حساس‌اند و نباید وارد GitHub یا سند عمومی شوند.

خروجی‌ها:
- taksa_db_backup_addendum.md
- taksa_db_backup_objects_classified.csv
- taksa_db_backup_candidate_tables_top120.csv
- taksa_db_backup_important_dependency_edges.csv
- taksa_db_backup_impact_matrix.csv


## بخش ۷ - تحلیل Excel و قالب‌های خروجی
وضعیت: انجام شد.

منابع:
- Fosool.xls
- Mali.xls
- Rizmertreh.xls
- kholaseh_metreh.xls
- rzmt_act.xls
- resource_price.xlsx
- FaragamTemplate.mpp
- read_msp.txt

یافته‌ها:
- قالب‌های Excel بیشتر قالب ورودی/خروجی و copy/paste هستند، نه موتور اصلی محاسبه.
- ریزمتره، خلاصه متره، برگه مالی، خلاصه فصل‌ها و قیمت روز منابع باید در نسخه وب خروجی/ورودی استاندارد داشته باشند.
- rzmt_act.xls وجود ستون کد فعالیت را ثابت کرد؛ پس ریزمتره فعالیت‌محور باید جدا از ریزمتره معمولی مدل شود.
- resource_price.xlsx نشان داد ورود قیمت روز منابع بر اساس کدعامل مشترک انجام می‌شود.
- FaragamTemplate.mpp/read_msp.txt نشان‌دهنده مسیر تبادل با Microsoft Project است و باید به عنوان فاز Integration جداگانه ثبت شود.

خروجی‌ها:
- taksa_section07_excel_template_analysis.md
- taksa_section07_excel_template_catalog.csv
- taksa_section07_excel_column_dictionary.csv
- taksa_section07_template_to_web_output_map.csv
- taksa_section07_excel_roundtrip_requirements.csv


## بخش ۸ - تحلیل قوانین فهرست‌بها، شاخص، تعدیل، ضرایب و کسورات
وضعیت: انجام شد.

منابع:
- PDFهای selected شامل fhbh، Fhbh_No_Itms، Lc، Shkh و اسناد Main_Docs_Selected
- خروجی الحاقیه دیتابیس اصلی شامل base_*، V_Shakhes*، viwBase*، viwTadil، viwSooratVaziat، distance_view و پروسیجرهای import/conversion
- گزارش‌های RPT و قالب‌های Excel برای تطبیق خروجی
- SVZT واقعی و ScriptXML برای round-trip

یافته‌ها:
- قوانین را باید از سه منبع همزمان استخراج کرد: PDF رسمی، دیتابیس/ویو/پروسیجر تکسا، و خروجی واقعی/گزارش.
- PDF به‌تنهایی کافی نیست؛ دیتابیس مرجع base_* برای فهرست‌بها، شاخص، واحد، منابع و تطبیق سال‌ها حیاتی است.
- برای فهرست‌بها، تغییر سال، ضرایب، کسورات، تعدیل، صورت‌وضعیت، ریزمتره، منابع، پایکار، حمل و نرمال‌سازی باید engineهای جدا داشته باشیم.
- خروجی وب باید علاوه بر زیبایی، با گزارش‌های تکسا و export برگشتی سازگار بماند.

خروجی‌ها:
- taksa_section08_business_rules_map.md
- taksa_section08_business_rule_source_matrix.csv
- taksa_section08_rule_pdf_inventory.csv
- taksa_section08_sql_rule_object_map.csv
- taksa_section08_calculation_engine_requirements.csv
- taksa_section08_rule_validation_tests.csv


## بخش 9 - طراحی نقشه موجودیت‌های نسخه وب
وضعیت: انجام شد.

خروجی‌ها:
- taksa_section09_web_entity_model.md
- taksa_section09_web_entity_catalog.csv
- taksa_section09_entity_relationships.csv
- taksa_section09_module_boundaries.csv
- taksa_section09_entity_roundtrip_rules.csv
- taksa_section09_taksa_to_web_entity_matrix.csv
- taksa_section09_mvp_entity_priority.csv

تصمیم کلیدی:
مدل وب از تکسا تمیزتر و workflow محورتر است، اما هر رکورد import شده باید raw anchor داشته باشد تا خروجی قابل برگشت به تکسا باقی بماند.


## بخش 10 - طراحی workflow نقش‌ها و کارتابل‌ها
وضعیت: انجام شد.

خروجی‌ها:
- taksa_section10_workflow_and_cycles.md
- taksa_section10_role_permission_matrix.csv
- taksa_section10_workflow_states.csv
- taksa_section10_transition_matrix.csv
- taksa_section10_cycle_map.csv
- taksa_section10_screen_workflow_map.csv
- taksa_section10_lock_audit_rules.csv
- taksa_section10_action_permission_matrix.csv
- taksa_section10_ux_workflow_recommendations.csv

تصمیم کلیدی:
سیستم باید workflow-first باشد؛ کاربر تجربه ساده‌تر و زیباتر می‌بیند، ولی پشت صحنه type/situ/nusv/version/raw anchor برای برگشت به تکسا حفظ می‌شود.


## بخش 11 - طراحی صفحات React/Next
وضعیت: انجام شد.

خروجی‌ها:
- taksa_section11_react_next_page_architecture.md
- taksa_section11_route_map.csv
- taksa_section11_component_registry.csv
- taksa_section11_page_detail_specs.csv
- taksa_section11_navigation_map.csv
- taksa_section11_api_contracts.csv
- taksa_section11_state_to_route_map.csv
- taksa_section11_grid_specs.csv

تصمیم کلیدی:
Routeها و صفحه‌ها workflow-first طراحی شدند. UI کاربر ساده‌تر و زیباتر از تکسا است، اما raw anchorها و مسیر export سازگار با تکسا پشت صحنه حفظ می‌شود.


## بخش 12 - طراحی موتور محاسبات و تست تطبیق با تکسا
وضعیت: انجام شد.

خروجی‌ها:
- taksa_section12_calculation_engine_and_validation.md
- taksa_section12_calculation_engine_registry.csv
- taksa_section12_calculation_pipeline_order.csv
- taksa_section12_calculation_data_contracts.csv
- taksa_section12_validation_test_matrix.csv
- taksa_section12_numeric_rounding_policy.csv
- taksa_section12_engine_api_contracts.csv
- taksa_section12_calculation_run_states.csv
- taksa_section12_risk_controls.csv
- taksa_section12_mvp_calculation_plan.csv

تصمیم کلیدی:
محاسبات باید engine-based، Decimal-based، traceable و golden-test-driven باشند. فرمول‌های حساس تا مقایسه با خروجی واقعی تکسا قفل نهایی نمی‌شوند.


## بخش 13 - نقشه پیاده‌سازی مرحله‌ای / Roadmap اجرایی
وضعیت: انجام شد.

خروجی‌ها:
- taksa_section13_implementation_roadmap.md
- taksa_section13_phase_roadmap.csv
- taksa_section13_sprint_plan.csv
- taksa_section13_mvp_backlog.csv
- taksa_section13_dependency_map.csv
- taksa_section13_phase_gates.csv
- taksa_section13_risk_register.csv
- taksa_section13_data_model_milestones.csv
- taksa_section13_qa_strategy.csv
- taksa_section13_repo_structure.csv
- taksa_master_document_index.csv

تصمیم کلیدی:
اجرای پروژه باید از raw compatibility و data integrity شروع شود، سپس workflow، سپس محاسبات، سپس report/export و در نهایت golden tests.


## جمع‌بندی نهایی تحلیل
وضعیت: فاز تحلیل و طراحی کلان کامل شد.

تمام بخش‌های 0 تا 13 تکمیل شده‌اند. مرحله بعد، تبدیل roadmap به برنامه کدنویسی و taskهای اجرایی روی ریپو است.
