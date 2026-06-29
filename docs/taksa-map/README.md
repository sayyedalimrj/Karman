# Taksa Web Research Package

Generated: 2026-06-29 08:44:39

این پکیج شامل نتایج تحقیق، نقشه‌ها، CSVهای تحلیلی، Roadmap اجرایی، ماتریس دیتابیس‌ها و Tracker نهایی پروژه بازسازی نسخه وب سازگار با تکسا است.

## محتوا

- `00_master/`  
  Tracker، فهرست مستندات، خلاصه استخراج و تصمیم‌نامه دیتابیس‌ها.

- `01_sections_md/`  
  گزارش‌های اصلی بخش‌های 1 تا 13.

- `02_section_tables/`  
  CSVهای تحلیلی هر بخش.

- `03_db_analysis/`  
  خروجی‌های امن تحلیل دیتابیس 1 گیگ و الحاقیه‌های آن.

- `04_roadmap/`  
  Roadmap، Sprint plan، MVP backlog، risk register، QA و repo structure.

## موارد حذف‌شده از روی عمد

برای امنیت و تمیزی پکیج، این موارد داخل zip قرار نگرفتند:

- فایل‌های خام سنگین مثل DB اصلی، MDBها، PDFها، SVZT نمونه و zipهای source.
- فایل‌های دارای احتمال اطلاعات حساس مثل `taksa_passwords_found.*`, `readable_strings.txt`, `sql_objects.txt`.
- EXE/DLL/OCX/SYS/Lock و فایل‌های اجرایی/باینری.

## نقطه شروع پیشنهادی

اول این فایل‌ها را بخوان:

1. `00_master/taksa_research_tracker.md`
2. `00_master/taksa_master_document_index.csv`
3. `04_roadmap/taksa_section13_implementation_roadmap.md`
4. `00_master/taksa_database_usage_decision.md`
