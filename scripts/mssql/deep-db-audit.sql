-- deep-db-audit.sql
-- READ-ONLY schema/metadata extraction for an isolated Taksa audit database.
-- Extracts SCHEMA and METADATA ONLY — NO data rows are selected by default.
--
-- Run against the isolated READ_ONLY database, e.g.:
--   sqlcmd -S <instance> -d KarmanAudit_Taksa_Data -i deep-db-audit.sql
--
-- This script NEVER mutates data and NEVER touches production PostgreSQL.
SET NOCOUNT ON;

-- Tables
SELECT s.name AS [schema], t.name AS [table], t.object_id
FROM sys.tables t JOIN sys.schemas s ON s.schema_id = t.schema_id
ORDER BY s.name, t.name;

-- Columns
SELECT t.name AS [table], c.name AS [column], ty.name AS [type],
       c.max_length, c.precision, c.scale, c.is_nullable
FROM sys.columns c
JOIN sys.tables t ON t.object_id = c.object_id
JOIN sys.types ty ON ty.user_type_id = c.user_type_id
ORDER BY t.name, c.column_id;

-- Primary keys
SELECT t.name AS [table], kc.name AS [pk]
FROM sys.key_constraints kc
JOIN sys.tables t ON t.object_id = kc.parent_object_id
WHERE kc.type = 'PK'
ORDER BY t.name;

-- Foreign keys
SELECT fk.name AS [fk], tp.name AS [parent], tr.name AS [referenced]
FROM sys.foreign_keys fk
JOIN sys.tables tp ON tp.object_id = fk.parent_object_id
JOIN sys.tables tr ON tr.object_id = fk.referenced_object_id
ORDER BY tp.name;

-- Indexes
SELECT t.name AS [table], i.name AS [index], i.type_desc, i.is_unique
FROM sys.indexes i
JOIN sys.tables t ON t.object_id = i.object_id
WHERE i.name IS NOT NULL
ORDER BY t.name, i.name;

-- Row counts (metadata only — uses catalog stats, NOT a data scan)
SELECT t.name AS [table], SUM(p.rows) AS [row_count]
FROM sys.tables t
JOIN sys.partitions p ON p.object_id = t.object_id AND p.index_id IN (0, 1)
GROUP BY t.name
ORDER BY t.name;

-- Programmable objects (views / procedures / functions / triggers)
SELECT o.type_desc AS [object_type], s.name AS [schema], o.name AS [name]
FROM sys.objects o
JOIN sys.schemas s ON s.schema_id = o.schema_id
WHERE o.type IN ('V', 'P', 'FN', 'IF', 'TF', 'TR')
ORDER BY o.type_desc, o.name;

-- Module keyword hits (definition text scan — names/keywords only, not data)
SELECT o.name AS [object], 
       CASE WHEN m.definition LIKE '%base_%'    THEN 1 ELSE 0 END AS hit_base,
       CASE WHEN m.definition LIKE '%brv%'      THEN 1 ELSE 0 END AS hit_brv,
       CASE WHEN m.definition LIKE '%shakhes%'  THEN 1 ELSE 0 END AS hit_shakhes,
       CASE WHEN m.definition LIKE '%tadil%'    THEN 1 ELSE 0 END AS hit_tadil,
       CASE WHEN m.definition LIKE '%kosorat%'  THEN 1 ELSE 0 END AS hit_kosorat,
       CASE WHEN m.definition LIKE '%zarib%'    THEN 1 ELSE 0 END AS hit_zarib
FROM sys.sql_modules m
JOIN sys.objects o ON o.object_id = m.object_id
ORDER BY o.name;

-- Table-family classification (by name prefix)
SELECT t.name AS [table],
       CASE
         WHEN t.name LIKE 'base_%'  THEN 'base'
         WHEN t.name LIKE 'brv%'    THEN 'brv'
         WHEN t.name LIKE 'svz%'    THEN 'svz'
         WHEN t.name LIKE 'psn%'    THEN 'psn'
         WHEN t.name LIKE '%shkh%'  THEN 'shakhes'
         WHEN t.name LIKE '%tadil%' THEN 'tadil'
         ELSE 'other'
       END AS [family]
FROM sys.tables t
ORDER BY [family], t.name;
GO
