-- Correct the deterministic cart snapshot ordering to use the cart item's
-- composite-key column. The failed 140600 function never committed an order.
do $$
declare
  function_definition text;
begin
  select pg_get_functiondef('public.checkout_confirm_order(uuid)'::regprocedure)
  into function_definition;
  if position('ci.created_at, ci.id' in function_definition) = 0 then
    raise exception 'Expected cart snapshot ordering was not found; migration stopped safely.';
  end if;
  execute replace(
    function_definition,
    'ci.created_at, ci.id',
    'ci.created_at, ci.variant_id'
  );
end;
$$;

notify pgrst, 'reload schema';
