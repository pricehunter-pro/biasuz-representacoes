create index if not exists commission_rules_product_idx on public.commission_rules(product_id);
create index if not exists commission_rules_salesperson_idx on public.commission_rules(salesperson_id);
create index if not exists commissions_rule_idx on public.commissions(rule_id);
create index if not exists sales_goals_representada_idx on public.sales_goals(representada_id);
create index if not exists salesperson_regions_region_idx on public.salesperson_regions(region_id);
