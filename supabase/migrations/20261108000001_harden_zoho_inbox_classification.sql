-- Prevent empty Zoho thread identifiers from merging unrelated messages.
-- Keep reference-based threading, then use provider thread IDs only when the
-- sender matches the guest address already associated with the conversation.
create or replace function public.import_zoho_support_email(
  p_provider_message_id text,
  p_provider_thread_id text,
  p_rfc_message_id text,
  p_references text[],
  p_sender_email text,
  p_sender_name text,
  p_subject text,
  p_body text,
  p_occurred_at timestamptz
) returns table(conversation_id uuid, support_message_id uuid, inserted boolean)
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_conversation_id uuid;
  v_message_id uuid;
  v_existing public.support_email_message_links%rowtype;
  v_provider_thread_id text := nullif(trim(p_provider_thread_id), '');
begin
  select * into v_existing from public.support_email_message_links
  where provider = 'zoho' and provider_message_id = p_provider_message_id;
  if found then
    return query select v_existing.conversation_id, v_existing.support_message_id, false;
    return;
  end if;

  select links.conversation_id into v_conversation_id
  from public.support_email_message_links links
  join public.support_conversations conversations on conversations.id = links.conversation_id
  where links.rfc_message_id = any(coalesce(p_references, '{}'::text[]))
    and (links.direction = 'inbound'
      or lower(trim(conversations.guest_email)) = lower(trim(p_sender_email)))
  order by array_position(coalesce(p_references, '{}'::text[]), links.rfc_message_id)
  limit 1;

  if v_conversation_id is null
    and v_provider_thread_id is not null
    and v_provider_thread_id !~ '^0+$'
    and lower(v_provider_thread_id) not in ('null', 'undefined') then
    select links.conversation_id into v_conversation_id
    from public.support_email_message_links links
    join public.support_conversations conversations on conversations.id = links.conversation_id
    where links.provider = 'zoho'
      and links.direction = 'inbound'
      and links.provider_thread_id = v_provider_thread_id
      and lower(trim(conversations.guest_email)) = lower(trim(p_sender_email))
    order by links.occurred_at desc
    limit 1;
  end if;

  if v_conversation_id is null then
    insert into public.support_conversations (
      guest_email, guest_name, guest_type, topic, intake_message, inbox_source,
      inbox_status, unread_for_staff, status, created_at, updated_at, context
    ) values (
      lower(trim(p_sender_email)), nullif(trim(p_sender_name), ''), 'anonymous',
      nullif(trim(p_subject), ''), left(p_body, 10000), 'email',
      'needs_reply', true, 'handoff', p_occurred_at, p_occurred_at,
      jsonb_build_object('channel', 'zoho_email')
    ) returning id into v_conversation_id;
  end if;

  insert into public.support_messages (
    conversation_id, sender, sender_type, sender_display_name, content, message,
    visibility, metadata, created_at
  ) values (
    v_conversation_id, 'guest', 'guest', nullif(trim(p_sender_name), ''),
    left(p_body, 10000), left(p_body, 10000), 'customer',
    jsonb_build_object('channel', 'email', 'provider', 'zoho'), p_occurred_at
  ) returning id into v_message_id;

  insert into public.support_email_message_links (
    provider, provider_message_id, rfc_message_id, provider_thread_id,
    direction, conversation_id, support_message_id, related_message_ids, occurred_at
  ) values (
    'zoho', p_provider_message_id, nullif(trim(p_rfc_message_id), ''),
    case when v_provider_thread_id ~ '^0+$' or lower(v_provider_thread_id) in ('null', 'undefined') then null else v_provider_thread_id end,
    'inbound', v_conversation_id, v_message_id, coalesce(p_references, '{}'::text[]), p_occurred_at
  );

  return query select v_conversation_id, v_message_id, true;
end;
$$;

revoke all on function public.import_zoho_support_email(text, text, text, text[], text, text, text, text, timestamptz) from public, anon, authenticated;
grant execute on function public.import_zoho_support_email(text, text, text, text[], text, text, text, text, timestamptz) to service_role;
