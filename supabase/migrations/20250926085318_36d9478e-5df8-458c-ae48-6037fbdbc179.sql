-- Remove Authorization header from send_notification to fix JSON error (Token "Bearer" is invalid)
CREATE OR REPLACE FUNCTION public.send_notification(
  user_id_param uuid,
  title_param text,
  message_param text,
  type_param text,
  data_param jsonb DEFAULT NULL::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  notification_id UUID;
  user_email TEXT;
  should_send_email BOOLEAN := false;
BEGIN
  -- Insert in-app notification
  INSERT INTO public.notifications (user_id, title, message, type, data)
  VALUES (user_id_param, title_param, message_param, type_param, data_param)
  RETURNING id INTO notification_id;

  -- Get user email from profiles
  SELECT email INTO user_email 
  FROM profiles 
  WHERE user_id = user_id_param;

  -- Determine if email should be sent based on notification type
  should_send_email := type_param IN (
    'booking_approved', 
    'booking_rejected', 
    'approval_required', 
    'hall_changed'
  );

  -- Send email notification if applicable
  IF should_send_email AND user_email IS NOT NULL THEN
    PERFORM net.http_post(
      url := 'https://yetmpnthnalztcxfqwnq.supabase.co/functions/v1/send-email-notification',
      headers := jsonb_build_object(
        'Content-Type', 'application/json'
      ),
      body := jsonb_build_object(
        'recipientEmail', user_email,
        'subject', 'Hall Booking Update - ' || title_param,
        'body', message_param,
        'notificationType', type_param,
        'notificationData', data_param
      )
    );
  END IF;

  RETURN notification_id;
END;
$$;