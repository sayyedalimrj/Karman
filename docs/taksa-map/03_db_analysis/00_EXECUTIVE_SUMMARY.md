# TAKSA / Faragamara Database AI-Safe Report

Generated at: `2026-06-29T11:10:29`

## 1) What this package is

This is an AI-safe, redacted structural report extracted locally from a SQL Server backup-like file.

Raw database rows are NOT included. Passwords, SQL users, server names, and IP addresses are redacted.

## 2) Source detection

Detected signs:

- No source detection terms found in db report.

DB file exists: `True`  
DB size bytes: `1026639360`

## 3) SQL object count

| Object Type | Count |
|---|---:|
| FUNCTION | 58 |
| PROCEDURE | 143 |
| TABLE | 5 |
| TRIGGER | 11 |
| VIEW | 63 |

## 4) Candidate module distribution

| Module | Count |
|---|---:|
| unknown / نیازمند بررسی | 90 |
| brv / برآورد، قرارداد، ریزمتره، منابع | 70 |
| base / فهرست‌بها و اطلاعات پایه | 52 |
| system / آبجکت‌های سیستمی SQL Server | 36 |
| view / ویوهای محاسباتی و گزارش‌گیری | 35 |
| smn / صورت‌وضعیت، نظارت، ماهانه | 25 |
| peik / گزارش‌ها و درخت گزارش | 15 |
| dly / تأخیرات و وضعیت‌های روزانه | 4 |
| svz / صورت‌وضعیت یا ایمپورت آن | 3 |
| psn / پیشنهادی/پرسنلی/ایمپورت مرتبط | 2 |
| bhz / بخش بهای زیاد یا ماژول خاص | 2 |

## 5) Top candidate tables / views

| # | Name | Hits | Inferred module |
|---:|---|---:|---|
| 1 | `base_fhbh` | 514 | base / فهرست‌بها و اطلاعات پایه |
| 2 | `base_fsbs` | 201 | base / فهرست‌بها و اطلاعات پایه |
| 3 | `base_book` | 159 | base / فهرست‌بها و اطلاعات پایه |
| 4 | `taksa_temp` | 110 | unknown / نیازمند بررسی |
| 5 | `faragamara_date.dbo` | 71 | unknown / نیازمند بررسی |
| 6 | `viwbase92` | 68 | view / ویوهای محاسباتی و گزارش‌گیری |
| 7 | `base_sorc` | 67 | base / فهرست‌بها و اطلاعات پایه |
| 8 | `dtproperties` | 66 | system / آبجکت‌های سیستمی SQL Server |
| 9 | `viwbase88` | 65 | view / ویوهای محاسباتی و گزارش‌گیری |
| 10 | `base_nmmhb` | 59 | base / فهرست‌بها و اطلاعات پایه |
| 11 | `base_shrs` | 56 | base / فهرست‌بها و اطلاعات پایه |
| 12 | `base_shfs` | 52 | base / فهرست‌بها و اطلاعات پایه |
| 13 | `svz_importer` | 47 | svz / صورت‌وضعیت یا ایمپورت آن |
| 14 | `base_unit_raw` | 45 | base / فهرست‌بها و اطلاعات پایه |
| 15 | `brv_fhbh` | 43 | brv / برآورد، قرارداد، ریزمتره، منابع |
| 16 | `sysdiagrams` | 42 | system / آبجکت‌های سیستمی SQL Server |
| 17 | `psn_importer` | 41 | psn / پیشنهادی/پرسنلی/ایمپورت مرتبط |
| 18 | `viwBase99` | 41 | view / ویوهای محاسباتی و گزارش‌گیری |
| 19 | `base_shkl` | 39 | base / فهرست‌بها و اطلاعات پایه |
| 20 | `brv_sorc_all` | 38 | brv / برآورد، قرارداد، ریزمتره، منابع |
| 21 | `base_sorc_list` | 38 | base / فهرست‌بها و اطلاعات پایه |
| 22 | `viwBase1403` | 36 | view / ویوهای محاسباتی و گزارش‌گیری |
| 23 | `brv_fhpy` | 34 | brv / برآورد، قرارداد، ریزمتره، منابع |
| 24 | `brv_bgml` | 32 | brv / برآورد، قرارداد، ریزمتره، منابع |
| 25 | `brv_Contract` | 32 | brv / برآورد، قرارداد، ریزمتره، منابع |
| 26 | `brv_sorc` | 31 | brv / برآورد، قرارداد، ریزمتره، منابع |
| 27 | `deleted` | 30 | unknown / نیازمند بررسی |
| 28 | `brv_contract` | 29 | brv / برآورد، قرارداد، ریزمتره، منابع |
| 29 | `DELETED` | 29 | unknown / نیازمند بررسی |
| 30 | `viwBase1400` | 28 | view / ویوهای محاسباتی و گزارش‌گیری |
| 31 | `viwBase1404` | 28 | view / ویوهای محاسباتی و گزارش‌گیری |
| 32 | `base_ader` | 26 | base / فهرست‌بها و اطلاعات پایه |
| 33 | `base_hmbs` | 26 | base / فهرست‌بها و اطلاعات پایه |
| 34 | `brv_importer` | 25 | brv / برآورد، قرارداد، ریزمتره، منابع |
| 35 | `dly_contract` | 25 | dly / تأخیرات و وضعیت‌های روزانه |
| 36 | `dt_getpropertiesbyid_vcs` | 24 | system / آبجکت‌های سیستمی SQL Server |
| 37 | `brv_mogs` | 23 | brv / برآورد، قرارداد، ریزمتره، منابع |
| 38 | `viwBase98` | 22 | view / ویوهای محاسباتی و گزارش‌گیری |
| 39 | `Base_ShakhesYerSeMahe` | 22 | base / فهرست‌بها و اطلاعات پایه |
| 40 | `dly_sv` | 21 | dly / تأخیرات و وضعیت‌های روزانه |

## 6) Suggested AI workflow

Ask the AI to analyze this package first. If it needs a specific table/object/keyword, run:

```powershell
python D:\taksa_ai_pack.py extract brv_contract
python D:\taksa_ai_pack.py extract base_fhbh
python D:\taksa_ai_pack.py extract viwBase1404
python D:\taksa_ai_pack.py extract ChangeNufhCode
```

Then send only the generated file from:

`D:\taksa_ai_report\requests\`

## 7) Important limitation

This is not a restored SQL Server database. It is a structural/textual extraction from backup content. For exact table rows, indexes, constraints, and data values, the backup must be restored into SQL Server.
