-- REYON Business OS: align Product Code with the approved hybrid rule.
-- Product Code is optional and no uniqueness policy was approved. SKU remains
-- globally unique. The catalog is empty except approved category references.

alter table catalog.products
  drop constraint products_product_code_unique;

comment on column catalog.products.product_code is
  'Optional administrator-entered business code. No uniqueness policy is implied; internal UUID remains immutable identity and fallback business reference.';
