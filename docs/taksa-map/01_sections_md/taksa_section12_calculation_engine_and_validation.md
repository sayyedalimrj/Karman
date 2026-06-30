# بخش ۱۲ — طراحی موتور محاسبات و تست تطبیق با تکسا

## وضعیت

- [x] بخش ۱۲ انجام شد.
- هدف: طراحی موتور محاسبات، ترتیب اجرای محاسبات، trace، validation و تست تطبیق با تکسا.
- نکته مهم: در این بخش فرمول‌ها را بدون تست با خروجی واقعی تکسا «قفل نهایی» نمی‌کنیم. موتور باید rule-driven و قابل تطبیق باشد.

---

## اصل اصلی

نسخه وب باید هم زیبا و workflow-first باشد، هم عددها را دقیق مثل تکسا محاسبه کند.

پس محاسبات نباید داخل UI پخش شود. باید یک لایه جدا داشته باشیم:

```text
UI / Wizard / Review Desk
  ↓
Calculation Orchestrator
  ↓
Engines
  ↓
Trace Store
  ↓
Report Projection
  ↓
Round-trip Validator
```

---

## موتورهای محاسباتی لازم

| موتور | نقش |
|---|---|
| Reference Price List Engine | فهرست‌بها، فصل، ردیف، واحد، قیمت پایه |
| Measurement Engine | متره، ریزمتره، فرمول مقدار |
| Coefficient Engine | اعمال ضرایب و ترتیب اثر |
| Payment Certificate Engine | مقدار قبلی/این دوره/تجمعی و برگه مالی |
| Review Reconciliation Engine | اختلاف پیمانکار/مشاور/کارفرما |
| Deduction Engine | کسورات، اضافات، کسورات تعدیل |
| Adjustment / Index Engine | شاخص، تعدیل، درون‌یابی |
| Transport / Distance Engine | حمل، مسیر، فاصله |
| Resource Analysis Engine | منابع و آنالیز بها |
| Round-trip Validation Engine | اعتبارسنجی برگشت به تکسا |

---

## ترتیب اجرای محاسبات

ترتیب پیشنهادی pipeline:

```text
1. load_context
2. load_reference_data
3. load_raw_anchors
4. normalize_measurements
5. reconcile_review_quantities
6. build_financial_lines
7. apply_coefficients
8. calculate_deductions
9. calculate_adjustment
10. calculate_transport_analysis
11. aggregate_summary
12. produce_report_projection
13. validate_against_roundtrip
```

این ترتیب مهم است چون مثلاً تعدیل و کسورات بدون برگه مالی درست معنا ندارند، و export بدون raw anchor نباید انجام شود.

---

## قانون مهم درباره عددها

هیچ مبلغ یا مقدار نباید با `float` ذخیره شود.

باید از Decimal استفاده شود:

```text
quantity_decimal
unit_price_decimal
current_amount_decimal
total_amount_decimal
adjustment_amount_decimal
deduction_amount_decimal
```

نمایش فارسی، جداکننده هزارگان، تومان/ریال و راست‌چین بودن فقط مربوط به UI است. مقدار واقعی باید numeric بماند.

---

## قانون مهم درباره گرد کردن

فعلاً rounding را نباید حدسی hard-code کنیم.

باید اینطور باشد:

```text
rounding_mode = rule-driven
rounding_source = Taksa golden output / SQL object / PDF rule
rounding_trace = before_value, after_value, rule_id
```

یعنی هرجا اختلاف با تکسا دیدیم، بفهمیم اختلاف از فرمول است، از ضریب است، از شاخص است یا فقط از گرد کردن.

---

## محاسبه صورت‌وضعیت

برای هر ردیف مالی باید این خروجی‌ها تولید شود:

```text
previous_qty
current_qty
total_qty
unit_price
current_amount
total_amount
coefficient_trace
deduction_trace
raw_anchor
```

منابع تطبیق:

```text
brv_bgml
brv_khmt
brv_situ
viwSooratVaziat
Mali.xls
bgml reports
```

---

## محاسبه ضرایب

ضرایب باید trace کامل داشته باشند:

```text
scope
target_key
coefficient_type
coefficient_value
apply_order
before_amount
after_amount
source_rule
```

منبع‌های مهم:

```text
brv_mult
base_zrtj
update_zarib_fhpy_mult
CreateBrvMult
zrib reports
seas reports
```

اشتباه در ترتیب ضرایب، کل برگه مالی را خراب می‌کند.

---

## محاسبه تعدیل

موتور تعدیل باید این ورودی‌ها را ذخیره کند:

```text
index_type
base_period
work_period
base_index
work_index
chapter_code
base_amount
formula_version
```

و این خروجی‌ها را بدهد:

```text
adjustment_amount
adjustment_trace
chapter_summary
report_projection
```

منابع تطبیق:

```text
Shkh PDFs
Base_ShakhesYerSeMahe
V_Shakhes*
brv_intp
brv_ahta
viwTadil
tdil reports
```

---

## تست تطبیق با تکسا

برای اینکه بگوییم موتور درست است، باید golden test داشته باشیم.

حداقل تست‌های P0:

```text
1. Import baseline: تعداد table/row/tag
2. Price item lookup: کد، شرح، واحد، قیمت
3. Measurement quantity: فرمول و مقدار
4. Previous/current/total quantities
5. Financial line amounts
6. Chapter summary
7. Coefficient order
8. Deductions
9. Tadil deduction case sensitivity
10. Adjustment index
11. PDF/Excel report projection
12. SVZT export round-trip
13. Locked version mutation
```

---

## خروجی قابل برگشت به تکسا

محاسبات وب نباید raw را نابود کند.

برای خروجی تکسا:

```text
Original Raw XML
  +
Dirty Patch JSON
  +
Export Validation
  =
Taksa-compatible SVZT
```

هر patch باید این‌ها را داشته باشد:

```text
raw_row_id
field_name
old_value
new_value
reason
engine_key
audit_id
```

---

## APIهای محاسباتی

APIهای پیشنهادی:

```text
POST /api/documents/[documentId]/calculate/measurement
POST /api/documents/[documentId]/calculate/financial
POST /api/documents/[documentId]/calculate/coefficients
POST /api/documents/[documentId]/calculate/deductions
POST /api/adjustments/[adjustmentRunId]/calculate
POST /api/documents/[documentId]/calculate/all
GET  /api/calculation-runs/[runId]
GET  /api/calculation-runs/[runId]/trace
GET  /api/documents/[documentId]/validation/taksa
```

---

## چیزی که هنوز باید با نمونه واقعی قفل شود

این موارد نیاز به خروجی نمونه از خود تکسا دارند:

```text
ترتیب دقیق بعضی ضرایب
rounding نهایی مبلغ‌ها
حالت‌های خاص تعدیل
فرمول‌های استثنایی حمل
نحوه نمایش/محاسبه بعضی کسورات خاص
رفتار تکسا در null / empty / zero
```

ولی ساختار موتور طوری طراحی شد که این موارد بعداً با golden test دقیق تنظیم شوند، نه اینکه مجبور شویم کل معماری را عوض کنیم.

---

## خروجی‌های این بخش

- `taksa_section12_calculation_engine_registry.csv`
- `taksa_section12_calculation_pipeline_order.csv`
- `taksa_section12_calculation_data_contracts.csv`
- `taksa_section12_validation_test_matrix.csv`
- `taksa_section12_numeric_rounding_policy.csv`
- `taksa_section12_engine_api_contracts.csv`
- `taksa_section12_calculation_run_states.csv`
- `taksa_section12_risk_controls.csv`
- `taksa_section12_mvp_calculation_plan.csv`

---

## نتیجه

بخش ۱۲ مشخص کرد سایت چطور باید درست حساب کند، چطور trace بدهد، چطور با تکسا مقایسه شود و چطور خروجی برگشتی خراب نشود.

اصل نهایی:

```text
UI قشنگ‌تر از تکسا
Workflow ساده‌تر از تکسا
اما محاسبه و خروجی با تست طلایی تکسا validate شود
```
